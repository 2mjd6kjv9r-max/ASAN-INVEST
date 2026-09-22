using System.Globalization;
using System.Text.Json;
using AsanInvest.Domain;
using AsanInvest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ApplicationEntity = AsanInvest.Domain.Entities.Application;

namespace AsanInvest.Application;

public sealed class Phase2Service
{
    public const string PublicKpisPageKey = "PUBLIC_KPIS";
    public const string PublicKpisSlug = "public-transparency";

    private readonly IAppDbContext _db;
    private readonly AppSettings _settings;
    private readonly IDvxClient _dvx;
    private readonly IBankKycClient _banks;
    private readonly IPaymentProvider _payments;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public Phase2Service(
        IAppDbContext db,
        IOptions<AppSettings> settings,
        IDvxClient dvx,
        IBankKycClient banks,
        IPaymentProvider payments)
    {
        _db = db;
        _settings = settings.Value;
        _dvx = dvx;
        _banks = banks;
        _payments = payments;
    }

    public async Task<object> OpenOmbudsmanComplaintAsync(CurrentUser user, Guid caseId, string description, CancellationToken ct)
    {
        var row = await _db.Cases.Include(c => c.Application).ThenInclude(a => a.Profile)
            .Include(c => c.Application).ThenInclude(a => a.Project)
            .Include(c => c.Application).ThenInclude(a => a.Type)
            .FirstOrDefaultAsync(c => c.Id == caseId, ct) ?? throw AppException.NotFound("Case not found");
        if (!await OwnsApplicationAsync(user, row.Application, ct)) throw AppException.Forbidden();
        var type = await _db.ApplicationTypes.FirstOrDefaultAsync(t => t.Code == "ombudsman" && t.IsActive, ct);
        if (type is null)
            throw AppException.BadRequest("NOT_CONFIGURED", "Ombudsman application type is not seeded");

        var profile = await ProfileOf(user.Id, ct);
        var app = new ApplicationEntity
        {
            TypeId = type.Id,
            Workflow = WorkflowKind.OMBUDSMAN,
            ProjectId = row.Application.ProjectId,
            ProfileId = row.Application.ProjectId is null ? (row.Application.ProfileId ?? profile.Id) : null,
            Source = ApplicationSource.NEW_APPLICATION,
            LinkedCaseId = row.Id,
        };
        try { Workflow.AssertLinked(app.ProjectId, app.ProfileId); }
        catch (InvalidOperationException ex) { throw AppException.BadRequest("UNLINKED_APPLICATION", ex.Message); }

        var publicNumber = await _db.NextApplicationPublicNumberAsync(ct);
        app.PublicNumber = publicNumber;
        app.SubmittedAt = DateTimeOffset.UtcNow;
        app.Snapshot = JsonSerializer.Serialize(new
        {
            answers = new { description, linkedCaseId = row.Id },
            profileVersion = profile.Version,
            submittedAt = DateTimeOffset.UtcNow,
        }, JsonOpts);
        var ombCase = new Case
        {
            ApplicationId = app.Id,
            InternalStatus = CaseInternalStatus.UNDER_INVESTIGATION,
            SlaDueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 10),
            SectorId = row.SectorId,
            RegionId = row.RegionId,
            InstitutionId = row.InstitutionId,
        };
        _db.Applications.Add(app);
        _db.Cases.Add(ombCase);
        Audit(user.Id, "ombudsman.complaint_opened", "application", app.Id.ToString(), new { linkedCaseId = row.Id, publicNumber });
        Notify(user.Id, "OMB_OPENED", "An Ombudsman application was opened. Open your cabinet for the next step.", new { applicationId = app.Id });
        foreach (var officerId in await OmbudsmanOfficerIds(ct))
            Notify(officerId, "OMB_DESK_NEW", "A new Ombudsman application is in the desk queue.", new { applicationId = app.Id });
        await _db.SaveChangesAsync(ct);
        return new { applicationId = app.Id, publicNumber, caseId = ombCase.Id };
    }

    public async Task<object> CreateCompanyPackageAsync(CurrentUser user, string? legalForm, CancellationToken ct)
    {
        await EnsureLegalOrSignAsync(user, ct);
        var profile = await ProfileOf(user.Id, ct);
        if (!string.IsNullOrWhiteSpace(legalForm)) profile.CompanyLegalForm = legalForm;

        var type = await _db.ApplicationTypes.FirstOrDefaultAsync(t => t.Code == "company_registration" && t.IsActive, ct)
            ?? throw AppException.BadRequest("NOT_CONFIGURED", "company_registration application type is not seeded");
        var docType = await DocumentTypeAsync(ct);
        var templates = new (string Code, string Title, string Body)[]
        {
            ("nizamname", "Nizamnamə", "Nizamnamə layihəsi (Azərbaycan dili hüquqi qüvvəlidir). Şablon ASAN Invest tərəfindən generasiya olunub."),
            ("qerar", "Qərar", "Təsis qərarı layihəsi. Hüquqi mətn Azərbaycan dilindədir."),
            ("erize", "Ərizə", "DVX ərizə layihəsi. Elektron ötürülmə adapteri konfiqurasiya olunmayıbsa PLAN bayrağı göstərilir."),
            ("etibarname", "Etibarnamə", "Etibarnamə şablonu. Nümayəndə imzası tələb oluna bilər."),
        };
        Directory.CreateDirectory(_settings.UploadDir);
        var checklist = new List<object>();
        var app = new ApplicationEntity
        {
            TypeId = type.Id,
            Workflow = type.Workflow == WorkflowKind.STANDARD ? WorkflowKind.STANDARD : type.Workflow,
            ProfileId = profile.Id,
            Source = ApplicationSource.NEW_APPLICATION,
        };
        try { Workflow.AssertLinked(app.ProjectId, app.ProfileId); }
        catch (InvalidOperationException ex) { throw AppException.BadRequest("UNLINKED_APPLICATION", ex.Message); }
        _db.Applications.Add(app);
        await _db.SaveChangesAsync(ct);

        foreach (var template in templates)
        {
            var file = $"{Guid.NewGuid()}.txt";
            var path = Path.Combine(_settings.UploadDir, file);
            await File.WriteAllTextAsync(path, template.Body, ct);
            var doc = new Document
            {
                TypeId = docType.Id,
                Source = DocumentSource.GENERATED,
                StorageKey = file,
                OriginalName = $"{template.Title}.txt",
                MimeType = "text/plain",
            };
            doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.PROFILE, ObjectId = profile.Id });
            doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.APPLICATION, ObjectId = app.Id });
            _db.Documents.Add(doc);
            await _db.SaveChangesAsync(ct);
            checklist.Add(new { code = template.Code, title = template.Title, required = true, documentId = doc.Id });
        }

        app.Snapshot = JsonSerializer.Serialize(new { package = true, checklist, legalForm = profile.CompanyLegalForm }, JsonOpts);
        Audit(user.Id, "reg.package_generated", "application", app.Id.ToString(), new { documentCount = templates.Length });
        await _db.SaveChangesAsync(ct);
        return await GetCompanyPackageAsync(user, app.Id, ct);
    }

    public async Task<object> GetCompanyPackageAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var app = await _db.Applications.Include(a => a.Type).Include(a => a.Case)
            .FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw AppException.NotFound("Package not found");
        if (app.ProfileId != profile.Id) throw AppException.NotFound("Package not found");
        var docs = await _db.DocumentLinks.Include(l => l.Document)
            .Where(l => l.ObjectType == DocumentLinkObject.APPLICATION && l.ObjectId == app.Id)
            .Select(l => l.Document)
            .ToListAsync(ct);
        return new
        {
            id = app.Id,
            applicationId = app.Id,
            publicNumber = app.PublicNumber,
            type = app.Type.Code,
            checklist = PackageChecklist(app.Snapshot),
            documents = docs.Select(d => new { d.Id, d.OriginalName, d.Source, d.MimeType, d.CreatedAt }),
            electronicSubmitAvailable = _settings.DvxSubmitEnabled,
            flag = _settings.DvxSubmitEnabled ? Flag.ONLINE : Flag.PLANNED,
        };
    }

    public async Task<object> SubmitCompanyPackageAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        await EnsureLegalOrSignAsync(user, ct);
        var profile = await ProfileOf(user.Id, ct);
        var app = await _db.Applications.Include(a => a.Type).Include(a => a.Case)
            .FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw AppException.NotFound("Package not found");
        if (app.ProfileId != profile.Id) throw AppException.NotFound("Package not found");

        if (app.Snapshot is null)
            app.Snapshot = JsonSerializer.Serialize(new { package = true, submittedAt = DateTimeOffset.UtcNow }, JsonOpts);
        if (app.PublicNumber is null)
        {
            app.PublicNumber = await _db.NextApplicationPublicNumberAsync(ct);
            app.SubmittedAt = DateTimeOffset.UtcNow;
        }

        var cse = app.Case;
        if (cse is null)
        {
            cse = new Case
            {
                ApplicationId = app.Id,
                InternalStatus = CaseInternalStatus.REGISTERED,
                SlaDueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 5),
                SectorId = profile.SectorId,
            };
            _db.Cases.Add(cse);
        }

        IntegrationOutcome outcome;
        if (_settings.DvxSubmitEnabled)
            outcome = await _dvx.SubmitPackageAsync(app.Id, new { app.Id, profileId = profile.Id }, ct);
        else
            outcome = new IntegrationOutcome(false, Flag.PLANNED.ToString(), null, "{}", "DVX electronic submit is disabled. Use the e-service URL or back-office.");

        LogIntegration("dvx", "outbound", "application", app.Id.ToString(), outcome);

        if (!outcome.Available)
        {
            var institution = await InstitutionByCodeOrAny("dvx", ct);
            _db.Tasks.Add(new TaskItem
            {
                CaseId = cse.Id,
                InstitutionId = institution.Id,
                DueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 5),
                Status = "open",
                Opinion = "Record DVX company-registration outcome in back-office (adapter unavailable).",
            });
            cse.InternalStatus = CaseInternalStatus.INTER_AGENCY_COORDINATION;
            profile.DvxRegistrationStatus = "PLAN";
        }
        else if (!string.IsNullOrWhiteSpace(outcome.ProviderRef))
        {
            profile.DvxRegistrationStatus = "REGISTERED";
            profile.DvxRegisteredAt = DateTimeOffset.UtcNow;
            profile.TaxId ??= outcome.ProviderRef;
            cse.InternalStatus = CaseInternalStatus.COMPLETED;
            cse.ClosedAt = DateTimeOffset.UtcNow;
        }

        Audit(user.Id, "reg.package_submitted", "application", app.Id.ToString(), new { flag = outcome.Flag, available = outcome.Available });
        Notify(user.Id, "REG_DVX_SUBMIT", "Company registration was sent for processing. Open the package for the honest status flag.", new { applicationId = app.Id });
        await _db.SaveChangesAsync(ct);
        return new
        {
            applicationId = app.Id,
            publicNumber = app.PublicNumber,
            caseId = cse.Id,
            flag = outcome.Flag,
            electronicSubmitAvailable = _settings.DvxSubmitEnabled && outcome.Available,
            message = outcome.Message,
            code = outcome.Available ? (string?)null : "INTEGRATION_UNAVAILABLE",
        };
    }

    public async Task<object> NameAvailabilityAsync(CurrentUser user, string? name, CancellationToken ct)
    {
        _ = user;
        if (string.IsNullOrWhiteSpace(name))
            throw AppException.BadRequest("VALIDATION_ERROR", "Query parameter name is required");
        IntegrationOutcome outcome;
        if (_settings.DvxSubmitEnabled)
            outcome = await _dvx.NameAvailabilityAsync(name.Trim(), ct);
        else
            outcome = new IntegrationOutcome(false, Flag.PLANNED.ToString(), null, "{}", "Name availability requires the DVX adapter. A back-office task can confirm the name.");

        LogIntegration("dvx", "outbound", "company_name", name.Trim(), outcome);
        await _db.SaveChangesAsync(ct);
        return new
        {
            name = name.Trim(),
            available = (bool?)null,
            flag = outcome.Flag,
            code = "INTEGRATION_UNAVAILABLE",
            message = outcome.Message,
        };
    }

    public async Task<object> GetKycPacketAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        return new { packet = profile.UboStructure is null ? JsonSerializer.Deserialize<object>("{}") : Json(profile.UboStructure) };
    }

    public async Task<object> PutKycPacketAsync(CurrentUser user, JsonElement packet, CancellationToken ct)
    {
        if (!Phase3Integrity.HasKycContent(packet))
            throw AppException.BadRequest("KYC_PACKET_REQUIRED", "KYC packet fields cannot all be empty");
        var profile = await ProfileOf(user.Id, ct);
        profile.UboStructure = packet.GetRawText();
        Audit(user.Id, "kyc.packet_saved", "profile", profile.Id.ToString(), new { });
        await _db.SaveChangesAsync(ct);
        return new { packet = Json(profile.UboStructure) };
    }

    public async Task<object> CreateBankSubmissionsAsync(CurrentUser user, Guid projectId, List<Guid> bankInstitutionIds, BankChannel? channel, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.Include(p => p.Stages).ThenInclude(s => s.Procedure)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw AppException.NotFound("Project not found");
        if (project.ProfileId != profile.Id && !Staff(user)) throw AppException.Forbidden();
        var unique = bankInstitutionIds.Distinct().ToList();
        if (unique.Count == 0) throw AppException.BadRequest("VALIDATION_ERROR", "Select at least one bank");
        if (BankPilot.ExceedsLimit(unique.Count))
            throw AppException.BadRequest("BANK_LIMIT", $"The bank pilot accepts at most {BankPilot.MaxBanks} institutions");

        var existing = await _db.Applications.Include(a => a.Case)
            .Where(a => a.ProjectId == projectId && a.Type.Code == "bank_kyc")
            .Select(a => a.Case!.InstitutionId)
            .Where(id => id != null)
            .Select(id => id!.Value)
            .Distinct()
            .ToListAsync(ct);
        var combined = existing.Concat(unique).Distinct().Count();
        if (BankPilot.ExceedsLimit(combined))
            throw AppException.BadRequest("BANK_LIMIT", $"This project already has bank submissions. The pilot cap is {BankPilot.MaxBanks}.");

        if (string.IsNullOrWhiteSpace(profile.UboStructure) || profile.UboStructure == "{}")
            throw AppException.BadRequest("KYC_PACKET_REQUIRED", "Save the shared KYC packet before sending it to banks");
        try
        {
            using var kycDoc = JsonDocument.Parse(profile.UboStructure);
            if (!Phase3Integrity.HasKycContent(kycDoc.RootElement))
                throw AppException.BadRequest("KYC_PACKET_REQUIRED", "Save the shared KYC packet before sending it to banks");
        }
        catch (JsonException)
        {
            throw AppException.BadRequest("KYC_PACKET_REQUIRED", "KYC packet is not valid JSON");
        }

        var type = await _db.ApplicationTypes.FirstOrDefaultAsync(t => t.Code == "bank_kyc" && t.IsActive, ct)
            ?? throw AppException.BadRequest("NOT_CONFIGURED", "bank_kyc application type is not seeded");
        var packet = JsonDocument.Parse(profile.UboStructure).RootElement.Clone();
        var created = new List<object>();
        foreach (var bankId in unique)
        {
            var bank = await _db.Classifications.FirstOrDefaultAsync(c => c.Id == bankId && c.Kind == ClassificationKind.INSTITUTION && c.IsActive, ct)
                ?? throw AppException.BadRequest("CLASSIFICATION", "Bank institution was not found");
            if (!BankPilot.IsPilotInstitution(bank.Code))
                throw AppException.BadRequest("CLASSIFICATION", "Bank KYC submissions are limited to seeded pilot-bank institutions");
            if (existing.Contains(bankId))
                throw AppException.Conflict("A submission to this bank already exists for the project");

            var app = new ApplicationEntity
            {
                TypeId = type.Id,
                Workflow = WorkflowKind.STANDARD,
                ProjectId = project.Id,
                Source = ApplicationSource.PASSPORT_STAGE,
                BankChannel = channel ?? BankChannel.PHYSICAL_SIGNATURE,
            };
            try { Workflow.AssertLinked(app.ProjectId, app.ProfileId); }
            catch (InvalidOperationException ex) { throw AppException.BadRequest("UNLINKED_APPLICATION", ex.Message); }
            app.PublicNumber = await _db.NextApplicationPublicNumberAsync(ct);
            app.SubmittedAt = DateTimeOffset.UtcNow;
            app.Snapshot = JsonSerializer.Serialize(new { answers = Json(profile.UboStructure), bankInstitutionId = bankId, submittedAt = DateTimeOffset.UtcNow }, JsonOpts);
            var cse = new Case
            {
                ApplicationId = app.Id,
                InternalStatus = CaseInternalStatus.INTER_AGENCY_COORDINATION,
                SlaDueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 10),
                InstitutionId = bank.Id,
                SectorId = project.SectorId,
                RegionId = project.TerritoryId,
            };
            _db.Applications.Add(app);
            _db.Cases.Add(cse);
            await _db.SaveChangesAsync(ct);

            IntegrationOutcome outcome;
            var remoteChannel = app.BankChannel == BankChannel.REMOTE_ESIGN;
            if (remoteChannel && !_settings.RemoteBankEnabled)
                outcome = new IntegrationOutcome(false, Flag.PLANNED.ToString(), null, "{}", "Remote e-sign account opening is PLAN until Mərkəzi Bank. KYC still proceeds; the platform does not open the account.");
            else if (_settings.BankPilotEnabled)
                outcome = await _banks.SubmitAsync(bank.Id, packet, ct);
            else
                outcome = new IntegrationOutcome(false, Flag.PLANNED.ToString(), null, "{}", "Bank pilot adapter is disabled. The case stays with a PLAN / PHYSICAL honesty flag.");

            LogIntegration("bank_kyc", "outbound", "case", cse.Id.ToString(), outcome);
            _db.Tasks.Add(new TaskItem
            {
                CaseId = cse.Id,
                InstitutionId = bank.Id,
                DueAt = cse.SlaDueAt ?? DateTimeOffset.UtcNow.AddDays(10),
                Status = "open",
                Opinion = outcome.Available ? "KYC packet sent" : "Complete bank KYC in back-office (adapter unavailable).",
            });
            var bankStage = project.Stages.FirstOrDefault(s => s.Procedure.InstitutionId == bank.Id);
            if (bankStage is not null && bankStage.ApplicationId is null) bankStage.ApplicationId = app.Id;
            Audit(user.Id, "bank.submission_created", "case", cse.Id.ToString(), new { bankId, flag = outcome.Flag });
            created.Add(new
            {
                applicationId = app.Id,
                publicNumber = app.PublicNumber,
                caseId = cse.Id,
                bankInstitutionId = bank.Id,
                bankCode = bank.Code,
                channel = app.BankChannel,
                flag = outcome.Flag,
                code = outcome.Available ? (string?)null : "INTEGRATION_UNAVAILABLE",
            });
        }

        Notify(user.Id, "BANK_KYC_SENT", "Bank KYC submissions were recorded. Open the passport Bank hesabı stage for per-bank status.", new { projectId });
        await _db.SaveChangesAsync(ct);
        var remote = (channel ?? BankChannel.PHYSICAL_SIGNATURE) == BankChannel.REMOTE_ESIGN;
        return new
        {
            submissions = created,
            channel = channel ?? BankChannel.PHYSICAL_SIGNATURE,
            flag = remote || !_settings.BankPilotEnabled ? Flag.PLANNED : Flag.ONLINE,
        };
    }

    public async Task<object> ListBankSubmissionsAsync(CurrentUser user, Guid projectId, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw AppException.NotFound("Project not found");
        var staff = Staff(user) || user.Roles.Contains(UserRole.INSTITUTION_REP);
        if (!staff && project.ProfileId != profile.Id) throw AppException.Forbidden();

        var rows = await _db.Applications.Include(a => a.Type).Include(a => a.Case)
            .Where(a => a.ProjectId == projectId && a.Type.Code == "bank_kyc")
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(ct);
        if (user.Roles.Contains(UserRole.INSTITUTION_REP) && !user.Roles.Contains(UserRole.SUPERVISOR) && !user.Roles.Contains(UserRole.SYSADMIN))
            rows = rows.Where(a => a.Case?.InstitutionId == user.InstitutionId).ToList();

        return rows.Select(a => new
        {
            applicationId = a.Id,
            publicNumber = a.PublicNumber,
            caseId = a.Case?.Id,
            bankInstitutionId = a.Case?.InstitutionId,
            internalStatus = a.Case?.InternalStatus,
            investorStatus = a.Case is null ? InvestorVisibleStatus.DRAFT : StatusMapping.ToInvestorStatus(a.Case.InternalStatus),
            channel = a.BankChannel,
        });
    }

    public async Task<object> BankDecisionAsync(CurrentUser user, Guid taskId, string outcome, string? reason, CancellationToken ct)
    {
        var task = await _db.Tasks.Include(t => t.Case).ThenInclude(c => c.Application).ThenInclude(a => a.Type)
            .Include(t => t.Institution)
            .FirstOrDefaultAsync(t => t.Id == taskId, ct) ?? throw AppException.NotFound("Task not found");
        if (!string.Equals(task.Case.Application.Type.Code, "bank_kyc", StringComparison.OrdinalIgnoreCase))
            throw AppException.BadRequest("WRONG_WORKFLOW", "Bank decisions apply only to bank_kyc cases");
        if (!BankPilot.IsPilotInstitution(task.Institution.Code))
            throw AppException.Forbidden("Bank decisions apply only to pilot-bank institutions");
        if (user.Roles.Contains(UserRole.INSTITUTION_REP) && task.InstitutionId != user.InstitutionId)
            throw AppException.Forbidden("Bank staff can only decide tasks for their own institution");

        var normalized = outcome.ToUpperInvariant();
        task.Opinion = string.IsNullOrWhiteSpace(reason) ? normalized : $"{normalized}: {reason}";
        switch (normalized)
        {
            case "OPENED":
                task.Status = "completed";
                task.Case.InternalStatus = CaseInternalStatus.COMPLETED;
                task.Case.ClosedAt = DateTimeOffset.UtcNow;
                task.Case.FinalResult = JsonSerializer.Serialize(new { outcome = normalized }, JsonOpts);
                break;
            case "EXTRA_INFO":
                task.Status = "extra_info";
                task.Case.InternalStatus = CaseInternalStatus.WAITING_ADDITIONAL_INFO;
                task.Case.PausedAt = DateTimeOffset.UtcNow;
                break;
            case "REFUSED":
                task.Status = "completed";
                task.Case.InternalStatus = CaseInternalStatus.REJECTED;
                task.Case.ClosedAt = DateTimeOffset.UtcNow;
                task.Case.FinalResult = JsonSerializer.Serialize(new
                {
                    outcome = normalized,
                    nextStep = "You may send the same KYC packet to the other pilot bank.",
                }, JsonOpts);
                break;
            default:
                throw AppException.BadRequest("VALIDATION_ERROR", "Outcome must be OPENED, EXTRA_INFO or REFUSED");
        }

        Audit(user.Id, "bank.decision", "task", task.Id.ToString(), new { outcome = normalized });
        var owner = await ApplicationOwnerUserId(task.Case.Application, ct);
        if (owner is not null)
            Notify(owner.Value, "BANK_DECISION", "A bank recorded a decision on your KYC case. Open the passport for the next step.", new { caseId = task.CaseId });
        await _db.SaveChangesAsync(ct);
        return new { task.Id, task.Status, outcome = normalized, caseId = task.CaseId, internalStatus = task.Case.InternalStatus };
    }

    public async Task<object> OmbudsmanPageAsync(CancellationToken ct)
    {
        var page = await _db.CmsContents.Where(p => (p.Slug == "ombudsman" || p.PageKey == "OMB") && p.Status == CmsStatus.PUBLISHED)
            .OrderByDescending(p => p.Version).FirstOrDefaultAsync(ct);
        return new
        {
            slug = page?.Slug ?? "ombudsman",
            title = page is null ? "İnvestisiya Ombudsmanı" : NamesFor(page.Title, "az"),
            body = page is null
                ? "Ombudsman müraciəti Vahid Müraciət üzərindən açılır. İctimai «Müraciət et» düyməsi institusional əsas təsdiqlənəndə aktiv olur."
                : NamesFor(page.Body, "az"),
            applyEnabled = _settings.OmbudsmanEnabled,
            identificationLevel = IdentificationLevel.BASIC,
        };
    }

    public async Task<object> OmbudsmanDeskAsync(CurrentUser user, CancellationToken ct)
    {
        _ = user;
        var terminal = new[] { CaseInternalStatus.COMPLETED, CaseInternalStatus.REJECTED, CaseInternalStatus.WITHDRAWN, CaseInternalStatus.ARCHIVED };
        var rows = await _db.Cases.Include(c => c.Application).ThenInclude(a => a.Type)
            .Where(c => c.Application.Workflow == WorkflowKind.OMBUDSMAN && !terminal.Contains(c.InternalStatus))
            .OrderBy(c => c.SlaDueAt)
            .ToListAsync(ct);
        return rows.Select(DeskCase);
    }

    public async Task<object> AftercareDeskAsync(CurrentUser user, CancellationToken ct)
    {
        _ = user;
        var terminal = new[] { CaseInternalStatus.COMPLETED, CaseInternalStatus.REJECTED, CaseInternalStatus.WITHDRAWN, CaseInternalStatus.ARCHIVED };
        var rows = await _db.Cases.Include(c => c.Application).ThenInclude(a => a.Type)
            .Where(c => c.Application.Workflow == WorkflowKind.AFTERCARE && !terminal.Contains(c.InternalStatus))
            .OrderBy(c => c.SlaDueAt)
            .ToListAsync(ct);
        return rows.Select(DeskCase);
    }

    public async Task<object> AddMediationNotesAsync(CurrentUser user, Guid caseId, string body, CancellationToken ct)
    {
        var row = await RequireOmbudsmanCase(caseId, ct);
        _db.Messages.Add(new Message
        {
            ApplicationId = row.ApplicationId,
            SenderUserId = user.Id,
            Body = body,
            IsInternal = true,
        });
        row.InternalStatus = CaseInternalStatus.IN_MEDIATION;
        Audit(user.Id, "ombudsman.mediation_note", "case", row.Id.ToString(), new { });
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.InternalStatus, message = "Mediation note recorded (internal)." };
    }

    public async Task<object> SubmitOpinionAsync(CurrentUser user, Guid caseId, string opinion, CancellationToken ct)
    {
        var row = await RequireOmbudsmanCase(caseId, ct);
        _db.Messages.Add(new Message
        {
            ApplicationId = row.ApplicationId,
            SenderUserId = user.Id,
            Body = opinion,
            IsInternal = true,
        });
        row.InternalStatus = CaseInternalStatus.OPINION_PENDING_APPROVAL;
        Audit(user.Id, "ombudsman.opinion_drafted", "case", row.Id.ToString(), new { });
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.InternalStatus };
    }

    public async Task<object> ApproveOpinionAsync(CurrentUser user, Guid caseId, CancellationToken ct)
    {
        var row = await RequireOmbudsmanCase(caseId, ct);
        if (row.InternalStatus is not CaseInternalStatus.OPINION_PREPARED and not CaseInternalStatus.OPINION_PENDING_APPROVAL)
            throw AppException.BadRequest("OPINION_NOT_READY", "Opinion is not waiting for approval");
        var draft = await _db.Messages.Where(m => m.ApplicationId == row.ApplicationId && m.IsInternal)
            .OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync(ct);
        row.InternalStatus = CaseInternalStatus.COMPLETED;
        row.ClosedAt = DateTimeOffset.UtcNow;
        row.FinalResult = JsonSerializer.Serialize(new
        {
            decision = "opinion_approved",
            nextStep = "A supervisor may reopen the linked rejected case when the recommendation is accepted.",
            linkedCaseId = row.Application.LinkedCaseId,
        }, JsonOpts);
        _ = draft;
        Audit(user.Id, "ombudsman.opinion_approved", "case", row.Id.ToString(), new { linkedCaseId = row.Application.LinkedCaseId });
        var owner = await ApplicationOwnerUserId(row.Application, ct);
        if (owner is not null)
            Notify(owner.Value, "OMB_OPINION", "The Ombudsman opinion was approved. Open the case for the recorded next step.", new { caseId = row.Id });
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.InternalStatus, linkedCaseId = row.Application.LinkedCaseId };
    }

    public async Task<object> ListSystemicProblemsAsync(CancellationToken ct)
    {
        var rows = await _db.SystemicProblems.Include(p => p.Institution).Include(p => p.Applications)
            .OrderByDescending(p => p.UpdatedAt).ToListAsync(ct);
        return rows.Select(p => new
        {
            p.Id, p.Category, p.Cause, p.ReformStatus, p.InstitutionId,
            institution = new { p.Institution.Id, p.Institution.Code, names = Json(p.Institution.Names) },
            applicationCount = p.Applications.Count,
            p.CreatedAt, p.UpdatedAt,
        });
    }

    public async Task<object> CreateSystemicProblemAsync(CurrentUser user, SystemicProblemCreateRequest body, CancellationToken ct)
    {
        var institution = await _db.Classifications.FirstOrDefaultAsync(c => c.Id == body.InstitutionId && c.Kind == ClassificationKind.INSTITUTION, ct)
            ?? throw AppException.BadRequest("CLASSIFICATION", "Institution was not found");
        var row = new SystemicProblem
        {
            Category = body.Category,
            InstitutionId = institution.Id,
            Cause = body.Cause,
            ReformStatus = body.ReformStatus ?? ReformStatus.IDENTIFIED,
        };
        _db.SystemicProblems.Add(row);
        Audit(user.Id, "ombudsman.systemic_problem_created", "systemic_problem", row.Id.ToString(), new { row.Category });
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.Category, row.Cause, row.ReformStatus, row.InstitutionId };
    }

    public async Task<object> LinkSystemicProblemAsync(CurrentUser user, Guid problemId, Guid applicationId, CancellationToken ct)
    {
        var problem = await _db.SystemicProblems.FirstOrDefaultAsync(p => p.Id == problemId, ct)
            ?? throw AppException.NotFound("Systemic problem not found");
        var app = await _db.Applications.FirstOrDefaultAsync(a => a.Id == applicationId, ct)
            ?? throw AppException.NotFound("Application not found");
        var exists = await _db.SystemicProblemApplications.AnyAsync(x => x.ProblemId == problemId && x.ApplicationId == applicationId, ct);
        if (exists) throw AppException.Conflict("This application is already linked");
        _db.SystemicProblemApplications.Add(new SystemicProblemApplication { ProblemId = problem.Id, ApplicationId = app.Id });
        Audit(user.Id, "ombudsman.systemic_problem_linked", "systemic_problem", problem.Id.ToString(), new { applicationId });
        await _db.SaveChangesAsync(ct);
        return new { problemId, applicationId };
    }

    public async Task<object> PlanNextContactAsync(CurrentUser user, Guid caseId, DateTimeOffset at, string purpose, CancellationToken ct)
    {
        var row = await _db.Cases.Include(c => c.Application).FirstOrDefaultAsync(c => c.Id == caseId, ct)
            ?? throw AppException.NotFound("Case not found");
        if (row.Application.Workflow != WorkflowKind.AFTERCARE)
            throw AppException.BadRequest("WRONG_WORKFLOW", "Next-contact planning applies to Aftercare cases");
        row.InternalStatus = CaseInternalStatus.NEXT_CONTACT_PLANNED;
        row.FinalResult = JsonSerializer.Serialize(new { nextContactAt = at, purpose }, JsonOpts);
        _db.Messages.Add(new Message { ApplicationId = row.ApplicationId, SenderUserId = user.Id, Body = purpose, IsInternal = true });
        Audit(user.Id, "aftercare.next_contact", "case", row.Id.ToString(), new { at });
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.InternalStatus, nextContactAt = at, purpose };
    }

    public async Task<object> InactivityTickAsync(CurrentUser user, CancellationToken ct)
    {
        var days = 60;
        try
        {
            var rule = await _db.RuleSets.Where(r => r.Kind == RuleSetKind.INACTIVITY_THRESHOLD && r.EffectiveAt <= DateTimeOffset.UtcNow)
                .OrderByDescending(r => r.EffectiveAt).FirstOrDefaultAsync(ct);
            if (rule is not null)
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(rule.Body) ? "{}" : rule.Body);
                if (doc.RootElement.TryGetProperty("days", out var d) && d.TryGetInt32(out var parsed)) days = parsed;
            }
        }
        catch (JsonException)
        {
            days = 60;
        }

        var feed = await _dvx.ActivityFeedAsync(ct);
        LogIntegration("dvx", "inbound", "activity_feed", "tick",
            new IntegrationOutcome(feed.Count > 0, Flag.PLANNED.ToString(), null, JsonSerializer.Serialize(new { count = feed.Count }), null));

        if (feed.Count == 0)
        {
            Audit(user.Id, "aftercare.inactivity_tick", "job", "inactivity", new { feedAvailable = false, flagged = 0 });
            await _db.SaveChangesAsync(ct);
            return new { scanned = 0, flagged = 0, feedAvailable = false, thresholdDays = days, message = "DVX activity feed is empty or stubbed; no company was marked inactive." };
        }

        var flagged = 0;
        var cutoff = DateTimeOffset.UtcNow.AddDays(-days);
        foreach (var item in feed.Where(i => i.LastActivityAt < cutoff))
        {
            var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.TaxId == item.TaxId, ct);
            if (profile is null) continue;
            flagged++;
            Notify(profile.UserId, "AFT_PASSIVITY", "A monitored company may be inactive. Open Aftercare to choose the next step.", new { profileId = profile.Id });
        }

        Audit(user.Id, "aftercare.inactivity_tick", "job", "inactivity", new { feedAvailable = true, flagged, days });
        await _db.SaveChangesAsync(ct);
        return new { scanned = feed.Count, flagged, feedAvailable = true, thresholdDays = days };
    }

    public async Task<object> ExpandProjectAsync(CurrentUser user, Guid projectId, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw AppException.NotFound("Project not found");
        var staff = user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN);
        if (!staff && project.ProfileId != profile.Id) throw AppException.Forbidden();

        var kya = await _db.KyaResults.Where(k => k.ProjectId == project.Id || k.ProfileId == project.ProfileId)
            .OrderByDescending(k => k.CreatedAt).FirstOrDefaultAsync(ct)
            ?? throw AppException.BadRequest("KYA_REQUIRED", "A KYA result is required before starting an expansion project");

        var clone = new Project
        {
            ProfileId = project.ProfileId,
            Name = $"{project.Name} (expansion)",
            SectorId = project.SectorId,
            TerritoryId = project.TerritoryId,
            VolumeAmount = project.VolumeAmount,
            VolumeCurrency = project.VolumeCurrency,
            SizeCategory = project.SizeCategory,
            CreatedById = user.Id,
            Status = ProjectStatus.PREPARATION,
        };
        _db.Projects.Add(clone);
        var codes = KyaProcedureCodes.Parse(kya.Procedures).ToList();
        var catalog = await _db.Procedures.Where(p => codes.Contains(p.Code)).ToListAsync(ct);
        var order = 1;
        foreach (var procedure in catalog)
            _db.Stages.Add(new Stage { ProjectId = clone.Id, ProcedureId = procedure.Id, Flag = procedure.Flag, SortOrder = order++, ExpectedDurationDays = procedure.ExpectedDurationDays });
        var copied = new KyaResult
        {
            ProfileId = project.ProfileId,
            ProjectId = clone.Id,
            InputParameters = kya.InputParameters,
            Procedures = kya.Procedures,
            RuleSetId = kya.RuleSetId,
            RuleVersion = kya.RuleVersion,
        };
        _db.KyaResults.Add(copied);
        Audit(user.Id, "aftercare.expansion", "project", clone.Id.ToString(), new { sourceProjectId = project.Id });
        var ownerId = await _db.Profiles.Where(p => p.Id == project.ProfileId).Select(p => p.UserId).FirstAsync(ct);
        Notify(ownerId, "AFT_EXPANSION", "A new expansion project was created from the previous KYA inputs.", new { projectId = clone.Id });
        await _db.SaveChangesAsync(ct);
        return new { id = clone.Id, clone.Name, sourceProjectId = project.Id, volumeAmount = clone.VolumeAmount.ToString("0.00", CultureInfo.InvariantCulture), clone.Status };
    }

    public async Task<object> ListFeesAsync(CancellationToken ct)
    {
        var rows = await _db.StateFees.Where(f => f.IsActive).OrderBy(f => f.Code).ToListAsync(ct);
        return rows.Select(FeeDto);
    }

    public async Task<object> AdminListFeesAsync(CancellationToken ct)
    {
        var rows = await _db.StateFees.OrderBy(f => f.Code).ToListAsync(ct);
        return rows.Select(FeeDto);
    }

    public async Task<object> AdminCreateFeeAsync(CurrentUser user, FeeCreateRequest body, CancellationToken ct)
    {
        var row = new StateFee
        {
            Code = body.Code,
            Names = body.Names.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? "{}" : body.Names.GetRawText(),
            Amount = decimal.Parse(body.Amount, CultureInfo.InvariantCulture),
            Currency = Enum.Parse<Currency>(body.Currency),
            ProcedureId = body.ProcedureId,
            ApplicationTypeId = body.ApplicationTypeId,
            IsActive = body.IsActive ?? true,
        };
        _db.StateFees.Add(row);
        Audit(user.Id, "admin.fee_created", "state_fee", row.Id.ToString(), new { row.Code, amount = row.Amount.ToString("0.00") });
        await _db.SaveChangesAsync(ct);
        return FeeDto(row);
    }

    public async Task<object> CreatePaymentAsync(CurrentUser user, PaymentCreateRequest body, CancellationToken ct)
    {
        if (body.Kind != PaymentKind.STATE_FEE)
            throw AppException.BadRequest("PAYMENT_KIND", "In-app checkout is for state fees only. Partner fees stay off-platform.");
        var amount = decimal.Parse(body.Amount, CultureInfo.InvariantCulture);
        var currency = Enum.Parse<Currency>(body.Currency);
        var profile = await ProfileOf(user.Id, ct);
        if (body.ProjectId is Guid pid)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == pid, ct) ?? throw AppException.NotFound("Project not found");
            if (project.ProfileId != profile.Id) throw AppException.Forbidden();
        }
        if (body.ApplicationId is Guid aid)
        {
            var app = await _db.Applications.Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == aid, ct)
                ?? throw AppException.NotFound("Application not found");
            if (!await OwnsApplicationAsync(user, app, ct)) throw AppException.Forbidden();
        }

        var payment = new Payment
        {
            Kind = PaymentKind.STATE_FEE,
            Amount = amount,
            Currency = currency,
            ProjectId = body.ProjectId,
            ApplicationId = body.ApplicationId,
            Status = _settings.PaymentsEnabled ? PaymentStatus.INITIATED : PaymentStatus.EXTERNAL,
            Provider = _settings.PaymentsEnabled ? "stub" : null,
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync(ct);

        var flag = Flag.PLANNED;
        if (_settings.PaymentsEnabled)
        {
            var outcome = await _payments.InitiateAsync(payment.Id, amount, currency.ToString(), ct);
            payment.ProviderRef = outcome.ProviderRef;
            payment.RawPayload = outcome.RawPayload;
            LogIntegration("payment", "outbound", "payment", payment.Id.ToString(), outcome);
            if (!outcome.Available) payment.Status = PaymentStatus.INITIATED;
            flag = Enum.TryParse<Flag>(outcome.Flag, out var parsed) ? parsed : Flag.PLANNED;
        }

        Audit(user.Id, "payment.initiated", "payment", payment.Id.ToString(), new { payment.Kind, amount = payment.Amount.ToString("0.00"), payment.Status });
        Notify(user.Id, "PAYMENT_INITIATED", "A state-fee payment was recorded. Receipts appear in Documents when payment succeeds.", new { paymentId = payment.Id });
        await _db.SaveChangesAsync(ct);
        return new
        {
            payment.Id,
            payment.Kind,
            amount = payment.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            payment.Currency,
            payment.Status,
            payment.ProviderRef,
            flag,
            code = _settings.PaymentsEnabled ? (string?)null : "INTEGRATION_UNAVAILABLE",
        };
    }

    public async Task<object> ConfirmPaymentAsync(CurrentUser? staff, Guid paymentId, string rawBody, string? signature, PaymentConfirmRequest body, CancellationToken ct)
    {
        var staffOk = staff is not null && staff.Roles.Any(r => r is UserRole.SYSADMIN or UserRole.SUPERVISOR);
        if (!staffOk)
        {
            if (!PaymentHmac.Verify(_settings.PaymentWebhookSecret, rawBody, signature))
                throw AppException.Unauthorized("Payment webhook authentication failed");
        }

        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId, ct)
            ?? throw AppException.NotFound("Payment not found");
        payment.RawPayload = string.IsNullOrWhiteSpace(rawBody) ? null : rawBody;
        payment.ProviderRef = body.ProviderRef ?? payment.ProviderRef;
        payment.FailureReason = body.FailureReason;
        if (body.Status == PaymentStatus.SUCCEEDED)
        {
            payment.Status = PaymentStatus.SUCCEEDED;
            payment.PaidAt = DateTimeOffset.UtcNow;
            var receipt = await CreateReceiptAsync(payment, ct);
            payment.ReceiptDocumentId = receipt.Id;
            var owner = await PaymentOwnerUserId(payment, ct);
            if (owner is not null)
                Notify(owner.Value, "PAYMENT_SUCCEEDED", "A state-fee payment succeeded. The receipt is in Documents.", new { paymentId = payment.Id });
        }
        else if (body.Status == PaymentStatus.FAILED)
        {
            payment.Status = PaymentStatus.FAILED;
            var owner = await PaymentOwnerUserId(payment, ct);
            if (owner is not null)
                Notify(owner.Value, "PAYMENT_FAILED", "A state-fee payment failed. You can retry or use an alternative method.", new { paymentId = payment.Id });
        }
        else
        {
            payment.Status = body.Status;
        }

        Audit(staff?.Id, "payment.confirmed", "payment", payment.Id.ToString(), new { payment.Status });
        LogIntegration("payment", "inbound", "payment", payment.Id.ToString(),
            new IntegrationOutcome(true, Flag.ONLINE.ToString(), payment.ProviderRef, rawBody, null));
        await _db.SaveChangesAsync(ct);
        return new
        {
            payment.Id,
            payment.Kind,
            amount = payment.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            payment.Status,
            payment.ReceiptDocumentId,
            payment.FailureReason,
        };
    }

    public async Task<object> MyPaymentsAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var projectIds = await _db.Projects.Where(p => p.ProfileId == profile.Id).Select(p => p.Id).ToListAsync(ct);
        var appIds = await _db.Applications.Where(a => a.ProfileId == profile.Id || (a.ProjectId != null && projectIds.Contains(a.ProjectId.Value)))
            .Select(a => a.Id).ToListAsync(ct);
        var rows = await _db.Payments
            .Where(p => (p.ProjectId != null && projectIds.Contains(p.ProjectId.Value)) || (p.ApplicationId != null && appIds.Contains(p.ApplicationId.Value)))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
        var stateTotal = rows.Where(p => p.Kind == PaymentKind.STATE_FEE && p.Status == PaymentStatus.SUCCEEDED).Sum(p => p.Amount);
        var partnerTotal = rows.Where(p => p.Kind == PaymentKind.PARTNER_SERVICE && p.Status == PaymentStatus.SUCCEEDED).Sum(p => p.Amount);
        return new
        {
            items = rows.Select(PaymentDto),
            totalsByKind = new
            {
                STATE_FEE = stateTotal.ToString("0.00", CultureInfo.InvariantCulture),
                PARTNER_SERVICE = partnerTotal.ToString("0.00", CultureInfo.InvariantCulture),
            },
        };
    }

    public async Task<object> ListPartnersAsync(CancellationToken ct)
    {
        var rows = await _db.Partners.Where(p => p.IsActive && p.AccreditationStatus == AccreditationStatus.ACTIVE)
            .OrderBy(p => p.ServiceKind).ToListAsync(ct);
        return rows.Select(PartnerDto);
    }

    public async Task<object> AdminListPartnersAsync(CancellationToken ct)
    {
        var rows = await _db.Partners.OrderBy(p => p.ServiceKind).ToListAsync(ct);
        return rows.Select(PartnerDto);
    }

    public async Task<object> AdminCreatePartnerAsync(CurrentUser user, PartnerCreateRequest body, CancellationToken ct)
    {
        decimal? rating = null;
        if (!string.IsNullOrWhiteSpace(body.Rating))
            rating = decimal.Parse(body.Rating, CultureInfo.InvariantCulture);
        var row = new Partner
        {
            Names = body.Names.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? "{}" : body.Names.GetRawText(),
            ServiceKind = body.ServiceKind,
            PriceAmount = decimal.Parse(body.PriceAmount, CultureInfo.InvariantCulture),
            PriceCurrency = Enum.Parse<Currency>(body.PriceCurrency),
            DurationNote = body.DurationNote,
            Rating = rating,
            AccreditationStatus = body.AccreditationStatus ?? AccreditationStatus.ACTIVE,
            IsActive = body.IsActive ?? true,
        };
        _db.Partners.Add(row);
        Audit(user.Id, "admin.partner_created", "partner", row.Id.ToString(), new { row.ServiceKind });
        await _db.SaveChangesAsync(ct);
        return PartnerDto(row);
    }

    public async Task<object> BindPartnerAsync(CurrentUser user, Guid projectId, Guid stageId, Guid partnerId, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.Include(p => p.Stages).FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw AppException.NotFound("Project not found");
        if (project.ProfileId != profile.Id) throw AppException.Forbidden();
        var stage = project.Stages.FirstOrDefault(s => s.Id == stageId) ?? throw AppException.NotFound("Stage not found");
        var partner = await _db.Partners.FirstOrDefaultAsync(p => p.Id == partnerId && p.IsActive && p.AccreditationStatus == AccreditationStatus.ACTIVE, ct)
            ?? throw AppException.NotFound("Partner not found");
        var existing = await _db.PartnerSelections.FirstOrDefaultAsync(s => s.StageId == stage.Id, ct);
        if (existing is not null)
        {
            existing.PartnerId = partner.Id;
            existing.UserId = user.Id;
            existing.SelectedAt = DateTimeOffset.UtcNow;
            existing.ApplicationId = stage.ApplicationId;
        }
        else
        {
            _db.PartnerSelections.Add(new PartnerSelection
            {
                PartnerId = partner.Id,
                StageId = stage.Id,
                UserId = user.Id,
                ApplicationId = stage.ApplicationId,
            });
        }
        Audit(user.Id, "partner.selected", "stage", stage.Id.ToString(), new { partnerId });
        await _db.SaveChangesAsync(ct);
        return new { projectId, stageId, partnerId, selectedAt = DateTimeOffset.UtcNow, note = "The contract is between the investor and the partner, not ASAN Invest." };
    }

    public async Task<object> PublicTransparencyAsync(CancellationToken ct)
    {
        var page = await _db.CmsContents.Where(c => c.PageKey == PublicKpisPageKey && c.Status == CmsStatus.PUBLISHED)
            .OrderByDescending(c => c.PublishedAt).FirstOrDefaultAsync(ct);
        if (page is null) return new { approved = false };
        return new { approved = true, publishedAt = page.PublishedAt, snapshot = Json(page.Body) };
    }

    public async Task<bool> PublicKpisApprovedAsync(CancellationToken ct) =>
        await _db.CmsContents.AnyAsync(c => c.PageKey == PublicKpisPageKey && c.Status == CmsStatus.PUBLISHED, ct);

    public async Task<object> PublishPublicKpisAsync(CurrentUser user, CancellationToken ct)
    {
        var cases = await _db.Cases.Select(c => new { c.RegisteredAt, c.ClosedAt, c.SlaDueAt, c.InternalStatus, c.Application.Workflow }).ToListAsync(ct);
        var closed = cases.Where(c => c.ClosedAt is not null).ToList();
        double? avgDays = closed.Count == 0 ? null : closed.Average(c => (c.ClosedAt!.Value - c.RegisteredAt).TotalDays);
        var withSla = closed.Where(c => c.SlaDueAt is not null).ToList();
        var onTime = withSla.Count == 0 ? 0m : 100m * withSla.Count(c => c.ClosedAt <= c.SlaDueAt) / withSla.Count;
        var omb = cases.Where(c => c.Workflow == WorkflowKind.OMBUDSMAN).ToList();
        var snapshot = new
        {
            institutionResponse = new
            {
                sampleSize = closed.Count,
                averageWorkingDays = avgDays is null ? null : Math.Round(avgDays.Value, 1).ToString("0.0", CultureInfo.InvariantCulture),
                onTimePercent = Math.Round(onTime, 1).ToString("0.0", CultureInfo.InvariantCulture),
            },
            ombudsman = new
            {
                cases = omb.Count,
                completed = omb.Count(c => c.InternalStatus == CaseInternalStatus.COMPLETED),
            },
        };
        var json = JsonSerializer.Serialize(snapshot, JsonOpts);
        var page = await _db.CmsContents.FirstOrDefaultAsync(c => c.PageKey == PublicKpisPageKey, ct);
        if (page is null)
        {
            page = new CmsContent
            {
                PageKey = PublicKpisPageKey,
                Slug = PublicKpisSlug,
                Title = JsonSerializer.Serialize(new { az = "İctimai göstəricilər", en = "Public indicators" }, JsonOpts),
                Body = json,
                Status = CmsStatus.PUBLISHED,
                OwnerUserId = user.Id,
                PublishedAt = DateTimeOffset.UtcNow,
            };
            _db.CmsContents.Add(page);
        }
        else
        {
            page.Body = json;
            page.Status = CmsStatus.PUBLISHED;
            page.PublishedAt = DateTimeOffset.UtcNow;
            page.Version++;
        }
        Audit(user.Id, "analytics.public_kpis_published", "cms", page.Id.ToString(), snapshot);
        await _db.SaveChangesAsync(ct);
        return new { approved = true, publishedAt = page.PublishedAt, snapshot };
    }

    private async Task<Case> RequireOmbudsmanCase(Guid caseId, CancellationToken ct)
    {
        var row = await _db.Cases.Include(c => c.Application).FirstOrDefaultAsync(c => c.Id == caseId, ct)
            ?? throw AppException.NotFound("Case not found");
        if (row.Application.Workflow != WorkflowKind.OMBUDSMAN)
            throw AppException.BadRequest("WRONG_WORKFLOW", "This action applies to Ombudsman cases");
        return row;
    }

    private async Task EnsureLegalOrSignAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.IdentificationLevel == IdentificationLevel.LEGAL) return;
        var now = DateTimeOffset.UtcNow;
        var sign = await _db.Representations.AnyAsync(r =>
            r.RepresentativeUserId == user.Id
            && r.Authority == RepresentationAuthority.SIGN
            && r.RevokedAt == null
            && (r.ValidTo == null || r.ValidTo > now), ct);
        if (!sign)
            throw new AppException(403, "IDENTIFICATION_LEVEL",
                "This action needs a legal identification level or a representative with SIGN authority.",
                new { current = user.IdentificationLevel, required = IdentificationLevel.LEGAL, next = "route" });
    }

    private async Task<Profile> ProfileOf(Guid userId, CancellationToken ct) =>
        await _db.Profiles.FirstOrDefaultAsync(p => p.UserId == userId, ct) ?? throw AppException.NotFound("Profile not found");

    private async Task<bool> OwnsApplicationAsync(CurrentUser user, ApplicationEntity app, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        return app.ProfileId == profile.Id || app.Project?.ProfileId == profile.Id;
    }

    private static bool Staff(CurrentUser user) =>
        user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN or UserRole.OMBUDSMAN_OFFICER);

    private async Task<List<Guid>> OmbudsmanOfficerIds(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        return await _db.UserRoleAssignments
            .Where(r => r.Role == UserRole.OMBUDSMAN_OFFICER && r.ValidFrom <= now && (r.ValidTo == null || r.ValidTo > now))
            .Select(r => r.UserId).Distinct().ToListAsync(ct);
    }

    private async Task<Guid?> ApplicationOwnerUserId(ApplicationEntity app, CancellationToken ct)
    {
        if (app.ProfileId is Guid pid)
            return await _db.Profiles.Where(p => p.Id == pid).Select(p => p.UserId).FirstOrDefaultAsync(ct);
        if (app.ProjectId is Guid proj)
            return await _db.Projects.Where(p => p.Id == proj).Select(p => p.Profile.UserId).FirstOrDefaultAsync(ct);
        return null;
    }

    private async Task<Guid?> PaymentOwnerUserId(Payment payment, CancellationToken ct)
    {
        if (payment.ProjectId is Guid pid)
            return await _db.Projects.Where(p => p.Id == pid).Select(p => p.Profile.UserId).FirstOrDefaultAsync(ct);
        if (payment.ApplicationId is Guid aid)
        {
            var app = await _db.Applications.Include(a => a.Project).ThenInclude(p => p!.Profile)
                .Include(a => a.Profile).FirstOrDefaultAsync(a => a.Id == aid, ct);
            if (app is null) return null;
            return app.Profile?.UserId ?? app.Project?.Profile.UserId;
        }
        return null;
    }

    private async Task<Classification> DocumentTypeAsync(CancellationToken ct) =>
        await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.DOCUMENT_TYPE && c.Code == "generated-template", ct)
        ?? await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.DOCUMENT_TYPE, ct)
        ?? throw AppException.BadRequest("NOT_CONFIGURED", "Document types are not seeded");

    private async Task<Classification> InstitutionByCodeOrAny(string code, CancellationToken ct) =>
        await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.INSTITUTION && c.Code == code && c.IsActive, ct)
        ?? await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.INSTITUTION && c.IsActive, ct)
        ?? throw AppException.BadRequest("NOT_CONFIGURED", "No institution classification is seeded");

    private async Task<Document> CreateReceiptAsync(Payment payment, CancellationToken ct)
    {
        var docType = await DocumentTypeAsync(ct);
        Directory.CreateDirectory(_settings.UploadDir);
        var file = $"{Guid.NewGuid()}.txt";
        var path = Path.Combine(_settings.UploadDir, file);
        await File.WriteAllTextAsync(path,
            $"ASAN Invest state-fee receipt\nPayment {payment.Id}\nAmount {payment.Amount.ToString("0.00", CultureInfo.InvariantCulture)} {payment.Currency}\n",
            ct);
        var doc = new Document
        {
            TypeId = docType.Id,
            Source = DocumentSource.GENERATED,
            StorageKey = file,
            OriginalName = $"receipt-{payment.Id:N}.txt",
            MimeType = "text/plain",
        };
        if (payment.ProjectId is Guid pid)
        {
            var profileId = await _db.Projects.Where(p => p.Id == pid).Select(p => p.ProfileId).FirstAsync(ct);
            doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.PROFILE, ObjectId = profileId });
        }
        else if (payment.ApplicationId is Guid aid)
        {
            var app = await _db.Applications.Include(a => a.Project).FirstAsync(a => a.Id == aid, ct);
            var objectId = app.ProfileId ?? app.Project!.ProfileId;
            doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.PROFILE, ObjectId = objectId });
            doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.APPLICATION, ObjectId = aid });
        }
        _db.Documents.Add(doc);
        await _db.SaveChangesAsync(ct);
        return doc;
    }

    private void LogIntegration(string provider, string direction, string objectType, string objectId, IntegrationOutcome outcome)
    {
        _db.IntegrationMessages.Add(new IntegrationMessage
        {
            Provider = provider,
            Direction = direction,
            ObjectType = objectType,
            ObjectId = objectId,
            ProviderRef = outcome.ProviderRef,
            Payload = string.IsNullOrWhiteSpace(outcome.RawPayload) ? "{}" : outcome.RawPayload,
            Status = outcome.Available ? "sent" : "unavailable",
        });
    }

    private void Audit(Guid? actor, string action, string objectType, string objectId, object? after)
    {
        _db.AuditRecords.Add(new AuditRecord
        {
            ActorUserId = actor,
            Action = action,
            ObjectType = objectType,
            ObjectId = objectId,
            After = after is null ? null : JsonSerializer.Serialize(after, JsonOpts),
        });
    }

    private void Notify(Guid userId, string eventType, string body, object? payload)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            EventType = eventType,
            Channel = NotificationChannel.PORTAL,
            DeliveryResult = "delivered",
            Body = body,
            Payload = payload is null ? "{}" : JsonSerializer.Serialize(payload, JsonOpts),
        });
    }

    private static object DeskCase(Case c) => new
    {
        c.Id, c.InternalStatus, investorStatus = StatusMapping.ToInvestorStatus(c.InternalStatus),
        c.SlaDueAt, slaState = Workflow.SlaState(c.SlaDueAt, DateTimeOffset.UtcNow, c.PausedAt),
        publicNumber = c.Application.PublicNumber, type = c.Application.Type.Code, workflow = c.Application.Workflow,
        linkedCaseId = c.Application.LinkedCaseId,
    };

    private static object FeeDto(StateFee f) => new
    {
        f.Id, f.Code, names = Json(f.Names), amount = f.Amount.ToString("0.00", CultureInfo.InvariantCulture),
        f.Currency, f.ProcedureId, f.ApplicationTypeId, f.IsActive,
    };

    private static object PartnerDto(Partner p) => new
    {
        p.Id, names = Json(p.Names), p.ServiceKind,
        priceAmount = p.PriceAmount.ToString("0.00", CultureInfo.InvariantCulture), p.PriceCurrency,
        p.DurationNote, rating = p.Rating?.ToString("0.00", CultureInfo.InvariantCulture),
        p.AccreditationStatus, p.IsActive,
    };

    private static object PaymentDto(Payment p) => new
    {
        p.Id, p.Kind, amount = p.Amount.ToString("0.00", CultureInfo.InvariantCulture), p.Currency,
        p.Status, p.Provider, p.ProviderRef, p.FailureReason, p.PaidAt, p.ReceiptDocumentId, p.ProjectId, p.ApplicationId, p.CreatedAt,
    };

    private static object? Json(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try { return JsonSerializer.Deserialize<object>(raw); }
        catch { return raw; }
    }

    private static object? PackageChecklist(string? snapshot)
    {
        if (snapshot is null) return Array.Empty<object>();
        try
        {
            using var doc = JsonDocument.Parse(snapshot);
            if (doc.RootElement.TryGetProperty("checklist", out var list))
                return JsonSerializer.Deserialize<object>(list.GetRawText());
        }
        catch { /* ignore */ }
        return Array.Empty<object>();
    }

    private static string NamesFor(string namesJson, string locale)
    {
        try
        {
            using var doc = JsonDocument.Parse(namesJson);
            if (doc.RootElement.TryGetProperty(locale, out var v)) return v.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("az", out var az)) return az.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("en", out var en)) return en.GetString() ?? "";
        }
        catch { /* ignore */ }
        return "";
    }
}
