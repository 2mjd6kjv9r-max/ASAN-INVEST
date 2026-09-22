using System.Text.Json;
using AsanInvest.Domain;
using AsanInvest.Domain.Entities;
using AsanInvest.Domain.Rules;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ApplicationEntity = AsanInvest.Domain.Entities.Application;

namespace AsanInvest.Application;

public sealed class PlatformService
{
    private readonly IAppDbContext _db;
    private readonly AppSettings _settings;
    private readonly Phase2Service _phase2;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public PlatformService(IAppDbContext db, IOptions<AppSettings> settings, Phase2Service phase2)
    {
        _db = db;
        _settings = settings.Value;
        _phase2 = phase2;
    }

    public object CompanyRegistration() => new
    {
        url = _settings.DvxCompanyRegistrationUrl,
        message = "Company registration is completed on the existing DVX e-service. ASAN Invest does not register companies automatically.",
        electronicSubmitAvailable = _settings.DvxSubmitEnabled,
    };

    public async Task<object> PageAsync(string slug, string locale, CancellationToken ct)
    {
        var page = await _db.CmsContents.Where(p => p.Slug == slug && p.Status == CmsStatus.PUBLISHED)
            .OrderByDescending(p => p.Version).FirstOrDefaultAsync(ct) ?? throw AppException.NotFound("Page not found");
        return new
        {
            slug = page.Slug,
            pageKey = page.PageKey,
            locale,
            title = NamesFor(page.Title, locale),
            body = NamesFor(page.Body, locale),
            titleI18n = Json(page.Title),
            bodyI18n = Json(page.Body),
            publishedAt = page.PublishedAt,
            version = page.Version,
        };
    }

    public async Task<object> ClassificationsAsync(string? kind, CancellationToken ct)
    {
        var q = _db.Classifications.Where(c => c.IsActive);
        if (kind is not null && Enum.TryParse<ClassificationKind>(kind, out var k)) q = q.Where(c => c.Kind == k);
        var rows = await q.OrderBy(c => c.Kind).ThenBy(c => c.SortOrder).ToListAsync(ct);
        return rows.Select(c => new { c.Id, c.Kind, c.Code, names = Json(c.Names), c.ParentId, c.IsActive, c.SortOrder });
    }

    public async Task<object> ProceduresAsync(CancellationToken ct)
    {
        var rows = await _db.Procedures.Include(p => p.Institution).Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync(ct);
        return rows.Select(p => new
        {
            p.Id, p.Code, names = Json(p.Names), p.Flag, p.ExpectedDurationDays,
            feeAmount = p.FeeAmount?.ToString("0.00"), p.FeeCurrency, p.LegalBasis, eServiceUrl = p.EServiceUrl,
            institution = new { p.Institution.Id, p.Institution.Code, names = Json(p.Institution.Names) },
        });
    }

    public async Task<object> OpportunitiesAsync(string locale, CancellationToken ct)
    {
        var pages = await _db.CmsContents.Where(p => p.PageKey == "OPP" && p.Status == CmsStatus.PUBLISHED).ToListAsync(ct);
        var zones = await _db.Classifications.Where(c => c.Kind == ClassificationKind.ZONE_PARK && c.IsActive).ToListAsync(ct);
        return new
        {
            catalogue = pages.Select(p => new { p.Slug, title = NamesFor(p.Title, locale), body = NamesFor(p.Body, locale) }),
            zones = zones.Select(z => new { z.Id, z.Code, names = Json(z.Names) }),
        };
    }

    public object RouteCalculate(RouteInput input) => WithVersion(RouteCalculator.Evaluate(input), "1");

    public async Task<object> RouteSaveAsync(CurrentUser user, RouteInput input, CancellationToken ct)
    {
        var output = RouteCalculator.Evaluate(input);
        var id = Guid.NewGuid();
        await AppendTool(user.Id, "savedRoute", new { id, input, output, ruleVersion = "1", savedAt = DateTimeOffset.UtcNow }, ct);
        return new { id, output.Estimated, output.RegistrationRoute, output.LegalForm, output.Legalization, output.VisaNote, output.ResidenceBasis, output.EstimatedWorkingDays, output.PhysicalContactsInAzerbaijan, output.StateFees, output.PartnerFees, output.PoliteStop, ruleVersion = "1" };
    }

    public object IncentiveEvaluate(IncentiveInput input)
    {
        var output = IncentiveCalculator.Evaluate(input);
        return new { output.Outcome, output.ExplanationAz, output.ExplanationEn, output.LegalCitation, output.EstimatedSavingNote, output.Alternatives, ruleVersion = "1" };
    }

    public async Task<object> IncentiveSaveAsync(CurrentUser user, IncentiveInput input, CancellationToken ct)
    {
        var output = IncentiveCalculator.Evaluate(input);
        var id = Guid.NewGuid();
        await AppendTool(user.Id, "savedIncentive", new { id, input, output, ruleVersion = "1" }, ct);
        return new { id, output.Outcome, output.ExplanationAz, output.ExplanationEn, output.LegalCitation, output.EstimatedSavingNote, output.Alternatives, ruleVersion = "1" };
    }

    public async Task<object> KyaEvaluateAsync(KyaInput input, JsonElement? si, CancellationToken ct)
    {
        if (si is { } extracted && !input.ConfirmedParameters)
            return new { needsConfirmation = true, extracted, message = "Review and confirm extracted parameters before rules run." };
        var rule = await LatestRule(RuleSetKind.KYA, ct);
        var always = JsonSerializer.Deserialize<JsonElement>(rule.Body).TryGetProperty("procedures", out var arr)
            ? arr.EnumerateArray().Select(x => x.GetString()).Where(s => s is not null).Cast<string>().ToList() : [];
        var matches = KyaCalculator.Evaluate(always, rule.Version, input.ConfirmedParameters);
        var procedures = await _db.Procedures.Where(p => always.Contains(p.Code)).ToListAsync(ct);
        return new
        {
            procedures = matches.Select(m =>
            {
                var p = procedures.FirstOrDefault(x => x.Code == m.Code);
                return new { m.Code, m.Reason, m.RuleVersion, names = p is null ? null : Json(p.Names), p?.InstitutionId, p?.Flag, p?.ExpectedDurationDays };
            }),
            ruleSetId = rule.Id,
            ruleVersion = rule.Version,
        };
    }

    public async Task<object> KyaSaveAsync(CurrentUser user, KyaInput input, CancellationToken ct)
    {
        var evaluated = await KyaEvaluateAsync(input, null, ct);
        var profile = await ProfileOf(user.Id, ct);
        var rule = await LatestRule(RuleSetKind.KYA, ct);
        var row = new KyaResult
        {
            ProfileId = profile.Id,
            InputParameters = JsonSerializer.Serialize(input, JsonOpts),
            Procedures = JsonSerializer.Serialize(evaluated, JsonOpts),
            RuleSetId = rule.Id,
            RuleVersion = rule.Version,
        };
        _db.KyaResults.Add(row);
        await _db.SaveChangesAsync(ct);
        var el = JsonSerializer.SerializeToElement(evaluated, JsonOpts);
        return new
        {
            id = row.Id,
            procedures = el.TryGetProperty("procedures", out var p) ? JsonSerializer.Deserialize<object>(p.GetRawText()) : null,
            ruleSetId = el.TryGetProperty("ruleSetId", out var rs) ? rs.GetGuid() : row.RuleSetId,
            ruleVersion = el.TryGetProperty("ruleVersion", out var rv) ? rv.GetString() : row.RuleVersion,
        };
    }

    public async Task<object> GetKyaAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.KyaResults.FirstOrDefaultAsync(k => k.Id == id && k.ProfileId == profile.Id, ct)
            ?? throw AppException.NotFound("KYA result not found");
        return new
        {
            row.Id,
            row.ProfileId,
            row.ProjectId,
            inputParameters = Json(row.InputParameters),
            procedures = Json(row.Procedures),
            row.RuleSetId,
            row.RuleVersion,
            row.CreatedAt,
        };
    }

    public async Task<object> GetProfileAsync(CurrentUser user, CancellationToken ct)
    {
        var u = await _db.Users.Include(x => x.RoleAssignments).Include(x => x.Profile)!.ThenInclude(p => p!.Versions)
            .FirstAsync(x => x.Id == user.Id, ct);
        var serialized = JsonSerializer.SerializeToElement(AuthService.SerializeUser(u), JsonOpts);
        var map = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(serialized.GetRawText()) ?? new();
        map["versions"] = JsonSerializer.SerializeToElement(u.Profile!.Versions.Select(v => new { v.Version, v.CreatedAt }), JsonOpts);
        return JsonSerializer.Deserialize<object>(JsonSerializer.Serialize(map))!;
    }

    public async Task<object> UpdateProfileAsync(CurrentUser user, JsonElement body, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        _db.ProfileVersions.Add(new ProfileVersion { ProfileId = profile.Id, Version = profile.Version, Snapshot = JsonSerializer.Serialize(AuthService.SerializeProfile(profile), JsonOpts) });
        profile.Version++;
        if (body.TryGetProperty("contacts", out var contacts)) profile.Contacts = contacts.GetRawText();
        if (body.TryGetProperty("companyName", out var cn)) profile.CompanyName = cn.GetString();
        if (body.TryGetProperty("companyRegId", out var cr)) profile.CompanyRegId = cr.GetString();
        if (body.TryGetProperty("taxId", out var tax)) profile.TaxId = tax.GetString();
        if (body.TryGetProperty("companyActivity", out var ca)) profile.CompanyActivity = ca.GetString();
        await _db.SaveChangesAsync(ct);
        return AuthService.SerializeProfile(profile);
    }

    public async Task<object> ConsentsAsync(CurrentUser user, ConsentBody body, CancellationToken ct)
    {
        var u = await _db.Users.FirstAsync(x => x.Id == user.Id, ct);
        u.Consents = JsonSerializer.Serialize(body, JsonOpts);
        u.ConsentVersion = body.Version;
        u.ConsentedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return new { consentVersion = u.ConsentVersion, consentedAt = u.ConsentedAt };
    }

    public async Task<object> RepresentationsAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var rows = await _db.Representations.Include(r => r.RepresentativeUser).Where(r => r.ProfileId == profile.Id).ToListAsync(ct);
        return rows.Select(r => new { r.Id, r.Authority, r.ValidFrom, r.ValidTo, r.RevokedAt, representativeUser = new { r.RepresentativeUser.Id, r.RepresentativeUser.Email } });
    }

    public async Task<object> CreateRepresentationAsync(CurrentUser user, string email, RepresentationAuthority authority, DateTimeOffset? validTo, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var rep = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct) ?? throw AppException.NotFound("Representative account not found");
        var row = new Representation { ProfileId = profile.Id, RepresentativeUserId = rep.Id, Authority = authority, ValidFrom = DateTimeOffset.UtcNow, ValidTo = validTo };
        _db.Representations.Add(row);
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.ProfileId, row.RepresentativeUserId, row.Authority, row.ValidFrom, row.ValidTo, row.RevokedAt };
    }

    public async Task<object> RevokeRepresentationAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Representations.FirstOrDefaultAsync(r => r.Id == id && r.ProfileId == profile.Id, ct) ?? throw AppException.NotFound();
        row.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.ProfileId, row.RepresentativeUserId, row.Authority, row.ValidFrom, row.ValidTo, row.RevokedAt };
    }

    public async Task<object> CabinetAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var applications = await _db.Applications.Include(a => a.Type).Include(a => a.Case)
            .Where(a => a.ProfileId == profile.Id || (a.Project != null && a.Project.ProfileId == profile.Id))
            .OrderByDescending(a => a.CreatedAt).Take(20).ToListAsync(ct);
        var projects = await _db.Projects.Include(p => p.Stages).ThenInclude(s => s.Procedure)
            .Include(p => p.Stages).ThenInclude(s => s.Application)!.ThenInclude(a => a!.Case)
            .Where(p => p.ProfileId == profile.Id).ToListAsync(ct);
        var notifications = await _db.Notifications.Where(n => n.UserId == user.Id).OrderByDescending(n => n.CreatedAt).Take(5).ToListAsync(ct);
        var next = projects.SelectMany(p => p.Stages.Select(s => new
        {
            projectName = p.Name,
            procedure = NamesFor(s.Procedure.Names, "az"),
            displayStatus = StatusMapping.ToStageStatus(s.IsNotApplicable, false, s.ApplicationId is not null, s.Application?.Case?.InternalStatus),
        })).FirstOrDefault(s => s.displayStatus == StatusMapping.StageOpen);
        return new
        {
            nextStep = next is null
                ? new { title = "Complete your profile or run KYA", action = "Start in the open portal", projectName = (string?)null }
                : new { title = next.procedure, action = "You can apply", projectName = (string?)next.projectName },
            applications = applications.Select(a => new
            {
                a.Id, a.PublicNumber, type = a.Type.Code,
                investorStatus = a.Case is null ? InvestorVisibleStatus.DRAFT : StatusMapping.ToInvestorStatus(a.Case.InternalStatus),
            }),
            notifications = notifications.Select(n => new { n.Id, n.EventType, n.Body, n.ReadAt, n.CreatedAt }),
        };
    }

    public async Task<object> ProjectsAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var staff = user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN);
        var rows = await _db.Projects.Include(p => p.Stages).ThenInclude(s => s.Procedure)
            .Include(p => p.Stages).ThenInclude(s => s.Application)!.ThenInclude(a => a!.Case)
            .Where(p => staff || p.ProfileId == profile.Id).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return rows.Select(p => new
        {
            p.Id, p.Name, volumeAmount = p.VolumeAmount.ToString("0.00"), p.VolumeCurrency, p.SizeCategory, p.Status,
            stages = p.Stages.Select(s => new
            {
                s.Id, s.Flag, s.SortOrder, s.ExpectedDurationDays,
                displayStatus = StatusMapping.ToStageStatus(s.IsNotApplicable, false, s.ApplicationId is not null, s.Application?.Case?.InternalStatus),
            }),
        });
    }

    public async Task<object> CreateProjectAsync(CurrentUser user, string name, string sector, string territory, string volumeAmount, string volumeCurrency, Guid kyaResultId, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var kya = await _db.KyaResults.FirstOrDefaultAsync(k => k.Id == kyaResultId && k.ProfileId == profile.Id, ct)
            ?? throw AppException.NotFound("KYA result not found");
        var sectorId = await ResolveClass(ClassificationKind.SECTOR, sector, ct);
        var territoryId = await ResolveClass(ClassificationKind.REGION, territory, ct);
        var project = new Project
        {
            ProfileId = profile.Id, Name = name, SectorId = sectorId, TerritoryId = territoryId,
            VolumeAmount = decimal.Parse(volumeAmount, System.Globalization.CultureInfo.InvariantCulture),
            VolumeCurrency = Enum.Parse<Currency>(volumeCurrency),
            SizeCategory = KyaCalculator.SizeCategory(volumeAmount, volumeCurrency),
            CreatedById = user.Id,
        };
        _db.Projects.Add(project);
        var codes = JsonSerializer.Deserialize<JsonElement>(kya.Procedures);
        var list = KyaProcedureCodes.Parse(codes).ToList();
        var catalog = await _db.Procedures.Where(p => list.Contains(p.Code)).ToListAsync(ct);
        var order = 1;
        foreach (var procedure in catalog)
        {
            _db.Stages.Add(new Stage { ProjectId = project.Id, ProcedureId = procedure.Id, Flag = procedure.Flag, SortOrder = order++, ExpectedDurationDays = procedure.ExpectedDurationDays });
        }
        kya.ProjectId = project.Id;
        await _db.SaveChangesAsync(ct);
        return new { project.Id, project.Name, volumeAmount = project.VolumeAmount.ToString("0.00"), project.SizeCategory };
    }

    public async Task<object> GetProjectAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.Include(p => p.Stages).ThenInclude(s => s.Procedure)
            .Include(p => p.Stages).ThenInclude(s => s.Application)!.ThenInclude(a => a!.Case)
            .FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw AppException.NotFound("Project not found");
        var staff = user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN);
        if (!staff && project.ProfileId != profile.Id) throw AppException.Forbidden();
        return new
        {
            project.Id, project.Name, volumeAmount = project.VolumeAmount.ToString("0.00"), project.Status,
            stages = project.Stages.OrderBy(s => s.SortOrder).Select(s => new
            {
                s.Id, s.Flag, s.SortOrder, s.ExpectedDurationDays, procedure = new { s.Procedure.Code, names = Json(s.Procedure.Names) },
                displayStatus = StatusMapping.ToStageStatus(s.IsNotApplicable, false, s.ApplicationId is not null, s.Application?.Case?.InternalStatus),
            }),
        };
    }

    public async Task<object> SuspendProjectAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.ProfileId == profile.Id, ct) ?? throw AppException.Forbidden();
        project.Status = ProjectStatus.SUSPENDED;
        await _db.SaveChangesAsync(ct);
        return new { project.Id, project.Name, project.Status, volumeAmount = project.VolumeAmount.ToString("0.00") };
    }

    public async Task<object> ApplicationTypesAsync(CancellationToken ct)
    {
        var rows = await _db.ApplicationTypes.Where(t => t.IsActive).OrderBy(t => t.Code).ToListAsync(ct);
        return rows.Select(t => new
        {
            t.Id, t.Code, names = Json(t.Names), t.IdentificationLevel, t.RequiresEvaluation, formSchema = Json(t.FormSchema), t.Workflow, t.IsActive,
        });
    }

    public async Task<object> CreateApplicationAsync(CurrentUser user, string typeCode, Guid? projectId, ApplicationSource source, Guid? stageId, JsonElement answers, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var type = await _db.ApplicationTypes.FirstOrDefaultAsync(t => t.Code == typeCode, ct) ?? throw AppException.NotFound("Application type not found");
        if (!Phase2Types.AllowsWorkflow(type.Code, type.Workflow))
            throw AppException.BadRequest("WORKFLOW_PHASE2", "This application type is not in Phase 1");
        Stage? stage = null;
        if (stageId is not null)
        {
            stage = await _db.Stages.Include(s => s.Project).FirstOrDefaultAsync(s => s.Id == stageId, ct)
                ?? throw AppException.NotFound("Stage not found");
            if (stage.Project.ProfileId != profile.Id) throw AppException.Forbidden();
            if (projectId is not null && projectId != stage.ProjectId)
                throw AppException.BadRequest("STAGE_PROJECT_MISMATCH", "Stage does not belong to this project");
            projectId = stage.ProjectId;
        }
        if (projectId is not null)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct);
            if (project is null || project.ProfileId != profile.Id) throw AppException.Forbidden();
        }
        var schema = JsonDocument.Parse(string.IsNullOrWhiteSpace(type.FormSchema) ? "{}" : type.FormSchema);
        using (schema)
        {
            if (schema.RootElement.TryGetProperty("requiresIncentivePreview", out var reqInc) && reqInc.ValueKind == JsonValueKind.True)
            {
                var contacts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(profile.Contacts) ?? new();
                if (!contacts.TryGetValue("savedIncentive", out var inc) || inc.ValueKind != JsonValueKind.Array || inc.GetArrayLength() == 0)
                    throw AppException.BadRequest("CAPITAL_BLOCKED", "Complete the incentive preview before opening a capital transfer step");
            }
        }
        var app = new ApplicationEntity { TypeId = type.Id, Workflow = type.Workflow, ProjectId = projectId, ProfileId = projectId is null ? profile.Id : null, Source = source };
        try { Workflow.AssertLinked(app.ProjectId, app.ProfileId); }
        catch (InvalidOperationException ex) { throw AppException.BadRequest("UNLINKED_APPLICATION", ex.Message); }
        _db.Applications.Add(app);
        await _db.SaveChangesAsync(ct);
        if (stage is not null) stage.ApplicationId = app.Id;
        if (answers.ValueKind == JsonValueKind.Object) await WriteDraft(profile.Id, app.Id, answers, ct);
        await _db.SaveChangesAsync(ct);
        return InvestorDto(app, type, null, answers.ValueKind == JsonValueKind.Object ? answers : default);
    }

    public async Task<object> ListApplicationsAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var rows = await _db.Applications.Include(a => a.Type).Include(a => a.Case).Include(a => a.Project)
            .Where(a => a.ProfileId == profile.Id || (a.Project != null && a.Project.ProfileId == profile.Id))
            .OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return rows.Select(a => InvestorDto(a, a.Type, a.Case, default));
    }

    public async Task<object> GetApplicationAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Applications.Include(a => a.Type).Include(a => a.Case).Include(a => a.Project)
            .Include(a => a.Messages.Where(m => !m.IsInternal))
            .FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw AppException.NotFound("Application not found");
        if (row.ProfileId != profile.Id && row.Project?.ProfileId != profile.Id) throw AppException.NotFound("Application not found");
        var answers = row.Snapshot is null ? await ReadDraft(profile.Id, row.Id, ct) : default;
        return new
        {
            row.Id,
            row.PublicNumber,
            type = new { row.Type.Code, names = Json(row.Type.Names) },
            row.Source,
            answers = row.Snapshot is not null
                ? SnapshotAnswers(row.Snapshot)
                : answers.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
                    ? new { }
                    : JsonSerializer.Deserialize<object>(answers.GetRawText()),
            snapshot = row.Snapshot is null ? null : Json(row.Snapshot),
            row.SubmittedAt,
            investorStatus = row.Case is null ? InvestorVisibleStatus.DRAFT : StatusMapping.ToInvestorStatus(row.Case.InternalStatus),
            nextStep = row.Case?.InternalStatus == CaseInternalStatus.WAITING_ADDITIONAL_INFO ? "Provide the requested information" : (string?)null,
            finalResult = row.Case?.FinalResult is null ? null : Json(row.Case.FinalResult),
            messages = row.Messages.Select(MessageDto),
        };
    }

    public async Task<object> PatchApplicationAsync(CurrentUser user, Guid id, JsonElement answers, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Applications.Include(a => a.Type).Include(a => a.Case).Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw AppException.NotFound("Application not found");
        if (row.ProfileId != profile.Id && row.Project?.ProfileId != profile.Id) throw AppException.NotFound("Application not found");
        if (row.Snapshot is not null) throw AppException.Conflict("Submitted snapshots cannot be changed", "SNAPSHOT_IMMUTABLE");
        await WriteDraft(profile.Id, row.Id, answers, ct);
        return InvestorDto(row, row.Type, row.Case, answers);
    }

    public async Task<object> ValidateApplicationAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Applications.Include(a => a.Type).Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw AppException.NotFound("Application not found");
        if (row.ProfileId != profile.Id && row.Project?.ProfileId != profile.Id) throw AppException.NotFound("Application not found");
        var answers = row.Snapshot is not null ? SnapshotAnswers(row.Snapshot) : JsonSerializer.Deserialize<object>((await ReadDraft(profile.Id, row.Id, ct)).GetRawText());
        var missing = new List<object>();
        try
        {
            using var schema = JsonDocument.Parse(string.IsNullOrWhiteSpace(row.Type.FormSchema) ? "{}" : row.Type.FormSchema);
            if (schema.RootElement.TryGetProperty("fields", out var fields) && fields.ValueKind == JsonValueKind.Array)
            {
                var answersEl = JsonSerializer.SerializeToElement(answers ?? new { });
                foreach (var field in fields.EnumerateArray())
                {
                    var required = field.TryGetProperty("required", out var req) && req.ValueKind == JsonValueKind.True;
                    var name = field.TryGetProperty("name", out var n) ? n.GetString() : null;
                    if (!required || name is null) continue;
                    var missingField = !answersEl.TryGetProperty(name, out var val)
                        || val.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
                        || (val.ValueKind == JsonValueKind.String && val.GetString() == "");
                    if (missingField) missing.Add(new { path = name, message = "This field is required" });
                }
            }
        }
        catch (JsonException)
        {
            // unparseable form schema is treated as valid
        }
        if (missing.Count > 0)
            throw AppException.BadRequest("VALIDATION_ERROR", "Complete the required fields before submit", missing);
        return new { valid = true };
    }

    public async Task<object> SubmitApplicationAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Applications.Include(a => a.Type).Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw AppException.NotFound("Application not found");
        if (row.ProfileId != profile.Id && row.Project?.ProfileId != profile.Id) throw AppException.NotFound("Application not found");
        if (row.Snapshot is not null) throw AppException.Conflict("Application already submitted", "ALREADY_SUBMITTED");
        if (row.Type.IdentificationLevel == IdentificationLevel.LEGAL && user.IdentificationLevel != IdentificationLevel.LEGAL)
            throw new AppException(403, "IDENTIFICATION_LEVEL", "This action needs a legal identification level. Continue via e-signature or a representative on your Route screen.", new { current = user.IdentificationLevel, required = IdentificationLevel.LEGAL, next = "route" });
        var publicNumber = await _db.NextApplicationPublicNumberAsync(ct);
        var needsEval = row.Type.RequiresEvaluation;
        var status = needsEval ? CaseInternalStatus.IN_EVALUATION : CaseInternalStatus.REGISTERED;
        var createdCase = new Case
        {
            ApplicationId = row.Id,
            InternalStatus = status,
            SlaDueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 5),
            SectorId = row.Project?.SectorId ?? profile.SectorId,
            RegionId = row.Project?.TerritoryId,
            CaseManagerId = row.Project?.PermanentCaseManagerId,
        };
        _db.Cases.Add(createdCase);
        row.PublicNumber = publicNumber;
        row.SubmittedAt = DateTimeOffset.UtcNow;
        row.Snapshot = JsonSerializer.Serialize(new { answers = await ReadDraft(profile.Id, row.Id, ct), profileVersion = profile.Version, submittedAt = DateTimeOffset.UtcNow }, JsonOpts);
        if (needsEval)
            _db.Evaluations.Add(new Evaluation { CaseId = createdCase.Id, UserId = user.Id, Route = "expert", DueAt = createdCase.SlaDueAt });
        await _db.SaveChangesAsync(ct);
        return InvestorDto(row, row.Type, createdCase, default);
    }

    public async Task WithdrawApplicationAsync(CurrentUser user, Guid id, string reason, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var row = await _db.Applications.Include(a => a.Case).Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw AppException.NotFound("Application not found");
        if (row.ProfileId != profile.Id && row.Project?.ProfileId != profile.Id) throw AppException.NotFound("Application not found");
        if (row.Case is null) throw AppException.BadRequest("NOT_SUBMITTED", "Drafts can be deleted; submitted applications are withdrawn");
        if (!Workflow.CanTransition(row.Case.InternalStatus, CaseInternalStatus.WITHDRAWN, user.Roles.ToList()))
            throw AppException.Conflict("This application cannot be withdrawn in its current status", "WITHDRAW_BLOCKED");
        row.WithdrawnAt = DateTimeOffset.UtcNow;
        row.WithdrawalReason = reason;
        row.Case.InternalStatus = CaseInternalStatus.WITHDRAWN;
        row.Case.ClosedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<object> CasesAsync(CurrentUser user, string? status, CancellationToken ct)
    {
        IQueryable<Case> q = _db.Cases.Include(c => c.Application).ThenInclude(a => a.Type).Include(c => c.CaseManager).Include(c => c.Tasks);
        var elevated = user.Roles.Contains(UserRole.SUPERVISOR) || user.Roles.Contains(UserRole.SYSADMIN);
        if (!elevated)
        {
            if (user.Roles.Contains(UserRole.CASE_MANAGER) && user.Roles.Contains(UserRole.INSTITUTION_REP))
                q = q.Where(c => c.CaseManagerId == user.Id || (user.InstitutionId != null && c.Tasks.Any(t => t.InstitutionId == user.InstitutionId)));
            else if (user.Roles.Contains(UserRole.CASE_MANAGER))
                q = q.Where(c => c.CaseManagerId == user.Id);
            else if (user.Roles.Contains(UserRole.INSTITUTION_REP))
                q = q.Where(c => user.InstitutionId != null && c.Tasks.Any(t => t.InstitutionId == user.InstitutionId));
            else if (user.Roles.Contains(UserRole.OMBUDSMAN_OFFICER))
                q = q.Where(c => c.Application.Workflow == WorkflowKind.OMBUDSMAN);
            else
                q = q.Where(_ => false);
        }
        if (status is not null && Enum.TryParse<CaseInternalStatus>(status, out var st)) q = q.Where(c => c.InternalStatus == st);
        var rows = await q.OrderBy(c => c.SlaDueAt).ToListAsync(ct);
        return rows.Select(c => new
        {
            c.Id, c.InternalStatus, investorStatus = StatusMapping.ToInvestorStatus(c.InternalStatus),
            c.SlaDueAt, slaState = Workflow.SlaState(c.SlaDueAt, DateTimeOffset.UtcNow, c.PausedAt),
            c.EscalatedAt, publicNumber = c.Application.PublicNumber, type = c.Application.Type.Code,
            caseManager = c.CaseManager is null ? null : new { c.CaseManager.Id, c.CaseManager.Email },
            taskCount = c.Tasks.Count,
        });
    }

    public async Task<object> GetCaseAsync(Guid id, CurrentUser user, CancellationToken ct)
    {
        var row = await _db.Cases.Include(c => c.Application).ThenInclude(a => a.Type)
            .Include(c => c.Tasks).ThenInclude(t => t.Institution)
            .Include(c => c.Evaluations).Include(c => c.CaseManager)
            .FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        if (!CanAccessCase(user, row)) throw AppException.Forbidden();
        return new
        {
            row.Id, row.ApplicationId, row.InternalStatus, row.CaseManagerId, row.SlaDueAt, row.RegisteredAt,
            row.ClosedAt, row.PausedAt, row.EscalatedAt, finalResult = row.FinalResult is null ? null : Json(row.FinalResult),
            row.SectorId, row.RegionId, row.InstitutionId, row.ReopenedAt, row.ReopenedById, row.ReopenReason,
            row.CreatedAt, row.UpdatedAt,
            application = new { row.Application.Id, row.Application.PublicNumber, type = new { row.Application.Type.Code, names = Json(row.Application.Type.Names) } },
            tasks = row.Tasks.Select(TaskDto),
            evaluations = row.Evaluations.Select(EvalDto),
            caseManager = row.CaseManager is null ? null : new { row.CaseManager.Id, row.CaseManager.Email },
            extraInfoRequests = row.Tasks.Where(t => t.Status == "extra_info").Select(TaskDto),
        };
    }

    public async Task<object> TransitionCaseAsync(CurrentUser user, Guid id, CaseInternalStatus to, string? reason, CancellationToken ct)
    {
        var row = await _db.Cases.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        if (!Workflow.CanTransition(row.InternalStatus, to, user.Roles.ToList()))
            throw AppException.Forbidden("This status change is not allowed for your role");
        row.InternalStatus = to;
        _ = reason;
        await _db.SaveChangesAsync(ct);
        return CaseDto(row);
    }

    public async Task<object> AssignCaseAsync(Guid id, Guid caseManagerId, CancellationToken ct)
    {
        var row = await _db.Cases.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        var manager = await _db.Users.Include(u => u.RoleAssignments).FirstOrDefaultAsync(u => u.Id == caseManagerId, ct)
            ?? throw AppException.BadRequest("ASSIGNEE_INVALID", "Case manager was not found");
        var roles = Roles.Active(manager.RoleAssignments, DateTimeOffset.UtcNow);
        if (!roles.Contains(UserRole.CASE_MANAGER) && !roles.Contains(UserRole.SUPERVISOR) && !roles.Contains(UserRole.SYSADMIN))
            throw AppException.BadRequest("ASSIGNEE_INVALID", "Assignee must have an active case manager role");
        row.CaseManagerId = caseManagerId;
        row.InternalStatus = CaseInternalStatus.ASSIGNED_FOR_EXECUTION;
        await _db.SaveChangesAsync(ct);
        return CaseDto(row);
    }

    public async Task<object> ExtraInfoAsync(CurrentUser user, Guid id, JsonElement fields, DateTimeOffset dueAt, CancellationToken ct)
    {
        var row = await _db.Cases.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        var institution = await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.INSTITUTION && c.IsActive, ct)
            ?? throw AppException.BadRequest("NOT_CONFIGURED", "No institution classification is seeded");
        var task = new TaskItem { CaseId = row.Id, InstitutionId = institution.Id, AssigneeUserId = user.Id, DueAt = dueAt, Status = "extra_info", Opinion = fields.GetRawText() };
        _db.Tasks.Add(task);
        row.InternalStatus = CaseInternalStatus.WAITING_ADDITIONAL_INFO;
        row.PausedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return TaskDto(task);
    }

    public async Task<object> ExtraInfoRespondAsync(CurrentUser user, Guid caseId, Guid requestId, JsonElement response, CancellationToken ct)
    {
        var task = await _db.Tasks.Include(t => t.Case).ThenInclude(c => c.Application).ThenInclude(a => a.Profile)
            .Include(t => t.Case).ThenInclude(c => c.Application).ThenInclude(a => a.Project)
            .FirstOrDefaultAsync(t => t.Id == requestId && t.CaseId == caseId && t.Status == "extra_info", ct) ?? throw AppException.NotFound();
        if (!await OwnsApplicationAsync(user, task.Case.Application, ct)) throw AppException.Forbidden();
        task.Status = "extra_info_responded";
        task.Opinion = response.GetRawText();
        task.Case.InternalStatus = CaseInternalStatus.UNDER_REVIEW;
        task.Case.PausedAt = null;
        await _db.SaveChangesAsync(ct);
        return TaskDto(task);
    }

    public async Task<object> CloseCaseAsync(CurrentUser user, Guid id, string decision, string reasoning, CancellationToken ct)
    {
        var row = await _db.Cases.Include(c => c.Tasks).FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        if (row.Tasks.Any(t => t.Status is not "completed" and not "cancelled" and not "extra_info_responded"))
            throw AppException.Conflict("All tasks must be completed before closing the case", "TASKS_OPEN");
        if (decision == "rejected" && !user.Roles.Contains(UserRole.SUPERVISOR) && !user.Roles.Contains(UserRole.SYSADMIN))
            throw AppException.Forbidden("Rejection requires supervisor confirmation");
        row.InternalStatus = decision == "approved" ? CaseInternalStatus.COMPLETED : CaseInternalStatus.REJECTED;
        row.ClosedAt = DateTimeOffset.UtcNow;
        row.FinalResult = JsonSerializer.Serialize(new { decision, reasoning }, JsonOpts);
        await _db.SaveChangesAsync(ct);
        return CaseDto(row);
    }

    public async Task<object> ReopenCaseAsync(CurrentUser user, Guid id, string reason, CancellationToken ct)
    {
        var row = await _db.Cases.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        if (row.InternalStatus is not CaseInternalStatus.COMPLETED and not CaseInternalStatus.REJECTED)
            throw AppException.BadRequest("NOT_CLOSED", "Only closed cases can be reopened");
        row.InternalStatus = CaseInternalStatus.UNDER_REVIEW;
        row.ReopenedAt = DateTimeOffset.UtcNow;
        row.ReopenedById = user.Id;
        row.ReopenReason = reason;
        row.ClosedAt = null;
        await _db.SaveChangesAsync(ct);
        return CaseDto(row);
    }

    public async Task<object> ExtendCaseAsync(Guid id, DateTimeOffset slaDueAt, string reason, CancellationToken ct)
    {
        var row = await _db.Cases.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound("Case not found");
        row.SlaDueAt = slaDueAt;
        row.EscalatedAt = null;
        _ = reason;
        await _db.SaveChangesAsync(ct);
        return CaseDto(row);
    }

    public async Task<object> SlaTickAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var due = await _db.Cases.Where(c => c.SlaDueAt != null && c.SlaDueAt < now && c.PausedAt == null && c.EscalatedAt == null
            && c.InternalStatus != CaseInternalStatus.COMPLETED && c.InternalStatus != CaseInternalStatus.REJECTED
            && c.InternalStatus != CaseInternalStatus.WITHDRAWN && c.InternalStatus != CaseInternalStatus.ARCHIVED
            && c.InternalStatus != CaseInternalStatus.DRAFT).ToListAsync(ct);
        foreach (var row in due) row.EscalatedAt = now;
        await _db.SaveChangesAsync(ct);
        return new { escalated = due.Count, ids = due.Select(d => d.Id) };
    }

    public async Task<object> ComplaintAsync(CurrentUser user, Guid id, string description, CancellationToken ct)
    {
        if (_settings.OmbudsmanEnabled)
        {
            try
            {
                return await _phase2.OpenOmbudsmanComplaintAsync(user, id, description, ct);
            }
            catch (AppException ex) when (ex.Code == "NOT_CONFIGURED")
            {
                // Z-04: never dead-end if the Ombudsman type is not seeded.
            }
        }

        var row = await _db.Cases.Include(c => c.Application).ThenInclude(a => a.Profile)
            .Include(c => c.Application).ThenInclude(a => a.Project)
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw AppException.NotFound("Case not found");
        if (!await OwnsApplicationAsync(user, row.Application, ct)) throw AppException.Forbidden();
        var supervisor = await _db.UserRoleAssignments.FirstOrDefaultAsync(r => r.Role == UserRole.SUPERVISOR, ct);
        var institution = await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.INSTITUTION, ct);
        if (supervisor is null || institution is null) throw AppException.BadRequest("NOT_CONFIGURED", "Supervisor queue is not configured");
        var task = new TaskItem { CaseId = row.Id, InstitutionId = institution.Id, AssigneeUserId = supervisor.UserId, DueAt = DateTimeOffset.UtcNow.AddDays(5), Status = "complaint", Opinion = description };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);
        return new { taskId = task.Id, externalComplaintUrl = "https://www.economy.gov.az/", message = "A supervisor task was created. The Ombudsman workflow opens in Phase 2." };
    }

    public async Task<object> CreateTaskAsync(Guid caseId, Guid institutionId, DateTimeOffset dueAt, Guid? assignee, string? notes, CancellationToken ct)
    {
        var task = new TaskItem { CaseId = caseId, InstitutionId = institutionId, DueAt = dueAt, AssigneeUserId = assignee, Status = "open", Opinion = notes };
        _db.Tasks.Add(task);
        var row = await _db.Cases.FirstAsync(c => c.Id == caseId, ct);
        row.InternalStatus = CaseInternalStatus.INTER_AGENCY_COORDINATION;
        await _db.SaveChangesAsync(ct);
        return TaskDto(task);
    }

    public async Task<object> CompleteTaskAsync(CurrentUser user, Guid id, string opinion, CancellationToken ct)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw AppException.NotFound("Task not found");
        if (user.Roles.Contains(UserRole.INSTITUTION_REP) && task.InstitutionId != user.InstitutionId) throw AppException.Forbidden();
        task.Status = "completed";
        task.Opinion = opinion;
        await _db.SaveChangesAsync(ct);
        return TaskDto(task);
    }

    public async Task<object> EvaluationsAsync(CurrentUser user, CancellationToken ct)
    {
        var q = _db.Evaluations.Include(e => e.Case).ThenInclude(c => c.Application).Include(e => e.Subject).AsQueryable();
        if (user.Roles.Contains(UserRole.EVALUATOR) && !user.Roles.Contains(UserRole.SYSADMIN) && !user.Roles.Contains(UserRole.SUPERVISOR))
            q = q.Where(e => e.EvaluatorId == user.Id || e.EvaluatorId == null);
        var rows = await q.OrderBy(e => e.CreatedAt).ToListAsync(ct);
        return rows.Select(e => new
        {
            e.Id, e.CaseId, e.UserId, e.Route, e.EvaluatorId, e.Opinion, criteriaUsed = e.CriteriaUsed is null ? null : Json(e.CriteriaUsed),
            e.ListVersion, e.StartedAt, e.DueAt, e.Status, e.CreatedAt,
            @case = new { e.Case.Id, e.Case.InternalStatus, application = new { e.Case.Application.Id, e.Case.Application.PublicNumber } },
            subject = new { e.Subject.Id, e.Subject.Email, e.Subject.PepSanctionsStatus, e.Subject.PepSanctionsCheckedAt },
        });
    }

    public async Task<object> EvaluationOpinionAsync(CurrentUser user, Guid id, string opinion, bool continueCase, CancellationToken ct)
    {
        var row = await _db.Evaluations.FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw AppException.NotFound("Evaluation not found");
        var elevated = user.Roles.Contains(UserRole.SUPERVISOR) || user.Roles.Contains(UserRole.SYSADMIN);
        if (!elevated && row.EvaluatorId is not null && row.EvaluatorId != user.Id)
            throw AppException.Forbidden("This evaluation is assigned to another reviewer");
        row.Opinion = opinion;
        row.EvaluatorId = user.Id;
        row.Status = "completed";
        row.StartedAt ??= DateTimeOffset.UtcNow;
        var c = await _db.Cases.FirstAsync(x => x.Id == row.CaseId, ct);
        c.InternalStatus = continueCase ? CaseInternalStatus.ASSIGNED_FOR_EXECUTION : CaseInternalStatus.WAITING_ADDITIONAL_INFO;
        await _db.SaveChangesAsync(ct);
        return EvalDto(row);
    }

    public async Task<object> ScreenAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct) ?? throw AppException.NotFound();
        user.PepSanctionsStatus = "not_configured";
        user.PepSanctionsListVersion = "unconfigured";
        user.PepSanctionsCheckedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return new { outcome = "not_configured", message = "Sanctions/PEP list provider is not configured. Screening is recorded as not_configured and a reviewer can continue.", politeStop = false, userId };
    }

    public async Task<object> DocumentsAsync(CurrentUser user, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var rows = await _db.Documents.Include(d => d.Type).Include(d => d.Links)
            .Where(d => d.Links.Any(l => l.ObjectType == DocumentLinkObject.PROFILE && l.ObjectId == profile.Id)).ToListAsync(ct);
        return rows.Select(d => new { d.Id, typeCode = d.Type.Code, typeNames = Json(d.Type.Names), d.Version, d.ValidUntil, d.Source, d.OriginalName, d.MimeType, d.CreatedAt });
    }

    public async Task<object> UploadDocumentAsync(CurrentUser user, string typeCode, string storageKey, string originalName, string mimeType, CancellationToken ct)
    {
        var type = await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.DOCUMENT_TYPE && c.Code == typeCode, ct)
            ?? await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == ClassificationKind.DOCUMENT_TYPE, ct)
            ?? throw AppException.BadRequest("NOT_CONFIGURED", "Document types are not seeded");
        var profile = await ProfileOf(user.Id, ct);
        var doc = new Document { TypeId = type.Id, Source = DocumentSource.UPLOADED, StorageKey = storageKey, OriginalName = originalName, MimeType = mimeType };
        doc.Links.Add(new DocumentLink { ObjectType = DocumentLinkObject.PROFILE, ObjectId = profile.Id });
        _db.Documents.Add(doc);
        await _db.SaveChangesAsync(ct);
        return new { doc.Id, typeCode = type.Code, originalName = doc.OriginalName };
    }

    public async Task<object> MessagesAsync(CurrentUser user, Guid applicationId, CancellationToken ct)
    {
        var application = await _db.Applications.Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == applicationId, ct)
            ?? throw AppException.NotFound("Application not found");
        var staff = user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN or UserRole.OMBUDSMAN_OFFICER);
        if (!staff && !await OwnsApplicationAsync(user, application, ct)) throw AppException.NotFound("Application not found");
        var q = _db.Messages.Where(m => m.ApplicationId == applicationId);
        if (!staff) q = q.Where(m => !m.IsInternal);
        var rows = await q.OrderBy(m => m.CreatedAt).ToListAsync(ct);
        return staff ? rows.Select(MessageDto) : rows.Select(m => new { m.Id, m.ApplicationId, m.SenderUserId, m.Body, m.CreatedAt });
    }

    public async Task<object> PostMessageAsync(CurrentUser user, Guid applicationId, string body, bool? internalNote, CancellationToken ct)
    {
        var application = await _db.Applications.Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == applicationId, ct)
            ?? throw AppException.NotFound("Application not found");
        var staff = user.Roles.Any(r => r is UserRole.CASE_MANAGER or UserRole.SUPERVISOR or UserRole.SYSADMIN or UserRole.OMBUDSMAN_OFFICER);
        if (!staff && !await OwnsApplicationAsync(user, application, ct)) throw AppException.NotFound("Application not found");
        var msg = new Message { ApplicationId = applicationId, SenderUserId = user.Id, Body = body, IsInternal = internalNote == true && staff };
        _db.Messages.Add(msg);
        await _db.SaveChangesAsync(ct);
        return staff ? MessageDto(msg) : new { msg.Id, msg.ApplicationId, msg.SenderUserId, msg.Body, msg.CreatedAt };
    }

    public async Task<object> NotificationsAsync(CurrentUser user, CancellationToken ct)
    {
        var rows = await _db.Notifications.Where(n => n.UserId == user.Id).OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync(ct);
        return rows.Select(NotificationDto);
    }

    public async Task<object> ReadNotificationAsync(CurrentUser user, Guid id, CancellationToken ct)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == user.Id, ct) ?? throw AppException.NotFound();
        n.ReadAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NotificationDto(n);
    }

    public async Task<object> AdminUsersAsync(CancellationToken ct)
    {
        var users = await _db.Users.Include(u => u.RoleAssignments).OrderBy(u => u.Email).ToListAsync(ct);
        return users.Select(u => new { u.Id, u.Email, roles = Roles.Active(u.RoleAssignments, DateTimeOffset.UtcNow), u.Status, u.InstitutionId, u.TwoFactorEnabled });
    }

    public async Task<object> AdminCreateUserAsync(CurrentUser actor, string email, string password, List<UserRole> roles, Guid? institutionId, CancellationToken ct)
    {
        var user = new User
        {
            Email = email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, _settings.BcryptRounds),
            Status = UserStatus.ACTIVE,
            EmailVerifiedAt = DateTimeOffset.UtcNow,
            TwoFactorEnabled = roles.Any(r => r != UserRole.INVESTOR),
            InstitutionId = institutionId,
            Profile = new Profile(),
        };
        foreach (var role in roles) user.RoleAssignments.Add(new UserRoleAssignment { Role = role, GrantedById = actor.Id });
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return new { user.Id, user.Email, roles };
    }

    public async Task<object> AdminStatusAsync(Guid id, UserStatus status, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw AppException.NotFound();
        user.Status = status;
        await _db.SaveChangesAsync(ct);
        return new { user.Id, user.Status };
    }

    public async Task<object> AdminClassificationsAsync(string? kind, CancellationToken ct)
    {
        var q = _db.Classifications.AsQueryable();
        if (kind is not null && Enum.TryParse<ClassificationKind>(kind, out var k)) q = q.Where(c => c.Kind == k);
        var rows = await q.OrderBy(c => c.Kind).ThenBy(c => c.SortOrder).ToListAsync(ct);
        return rows.Select(ClassificationDto);
    }

    public async Task<object> AdminCreateClassificationAsync(ClassificationKind kind, string code, JsonElement names, Guid? parentId, int? sortOrder, CancellationToken ct)
    {
        var row = new Classification { Kind = kind, Code = code, Names = names.GetRawText(), ParentId = parentId, SortOrder = sortOrder ?? 0 };
        _db.Classifications.Add(row);
        await _db.SaveChangesAsync(ct);
        return ClassificationDto(row);
    }

    public async Task<object> AdminApplicationTypesAsync(CancellationToken ct)
    {
        var rows = await _db.ApplicationTypes.OrderBy(t => t.Code).ToListAsync(ct);
        return rows.Select(t => new { t.Id, t.Code, names = Json(t.Names), t.Workflow, t.IdentificationLevel, t.RequiresEvaluation, formSchema = Json(t.FormSchema), t.IsActive });
    }

    public async Task<object> AdminCreateApplicationTypeAsync(string code, JsonElement names, IdentificationLevel level, bool requiresEvaluation, JsonElement? formSchema, CancellationToken ct)
    {
        var row = new ApplicationType
        {
            Code = code, Names = names.GetRawText(), IdentificationLevel = level, RequiresEvaluation = requiresEvaluation,
            FormSchema = formSchema?.GetRawText() ?? "{}", Workflow = WorkflowKind.STANDARD,
        };
        _db.ApplicationTypes.Add(row);
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.Code, names = Json(row.Names), row.IdentificationLevel, row.RequiresEvaluation, formSchema = Json(row.FormSchema) };
    }

    public async Task<object> AdminProceduresAsync(CancellationToken ct)
    {
        var rows = await _db.Procedures.Include(p => p.Institution).Include(p => p.Dependencies).OrderBy(p => p.SortOrder).ToListAsync(ct);
        return rows.Select(p => new
        {
            p.Id, p.Code, names = Json(p.Names), p.Flag, p.ExpectedDurationDays, feeAmount = p.FeeAmount?.ToString("0.00"),
            p.FeeCurrency, p.LegalBasis, eServiceUrl = p.EServiceUrl, p.SortOrder, p.IsActive,
            institution = new { p.Institution.Id, p.Institution.Code, names = Json(p.Institution.Names) },
            dependencies = p.Dependencies.Select(d => new { d.ProcedureId, d.DependsOnProcedureId }),
        });
    }

    public async Task<object> AdminCreateProcedureAsync(string code, JsonElement names, Guid institutionId, Flag flag, int? expectedDurationDays, string? legalBasis, string? eServiceUrl, CancellationToken ct)
    {
        var row = new Procedure { Code = code, Names = names.GetRawText(), InstitutionId = institutionId, Flag = flag, ExpectedDurationDays = expectedDurationDays, LegalBasis = legalBasis, EServiceUrl = eServiceUrl };
        _db.Procedures.Add(row);
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.Code, names = Json(row.Names), row.Flag, row.InstitutionId };
    }

    public async Task<object> AdminNotificationTemplatesAsync(CancellationToken ct)
    {
        var rows = await _db.NotificationTemplates.OrderBy(t => t.EventType).ThenBy(t => t.Locale).ToListAsync(ct);
        return rows.Select(t => new { t.Id, t.EventType, t.Role, t.Locale, t.Channel, t.Subject, t.Body, t.IsMandatory });
    }

    public async Task<object> AdminCreateNotificationTemplateAsync(string eventType, UserRole? role, string locale, NotificationChannel channel, string subject, string body, bool isMandatory, CancellationToken ct)
    {
        var row = new NotificationTemplate { EventType = eventType, Role = role, Locale = locale, Channel = channel, Subject = subject, Body = body, IsMandatory = isMandatory };
        _db.NotificationTemplates.Add(row);
        await _db.SaveChangesAsync(ct);
        return new { row.Id, row.EventType, row.Role, row.Locale, row.Channel, row.Subject, row.Body, row.IsMandatory };
    }

    public async Task<object> RuleSetsAsync(CancellationToken ct)
    {
        var rows = await _db.RuleSets.OrderBy(r => r.Kind).ThenByDescending(r => r.EffectiveAt).ToListAsync(ct);
        return rows.Select(RuleSetDto);
    }

    public async Task<object> CreateRuleSetAsync(CurrentUser user, RuleSetKind kind, string version, DateTimeOffset effectiveAt, JsonElement body, CancellationToken ct)
    {
        var row = new RuleSet { Kind = kind, Version = version, EffectiveAt = effectiveAt, ApprovedById = user.Id, Body = body.GetRawText() };
        _db.RuleSets.Add(row);
        await _db.SaveChangesAsync(ct);
        return RuleSetDto(row);
    }

    public async Task<object> CmsAsync(CancellationToken ct)
    {
        var rows = await _db.CmsContents.OrderByDescending(c => c.UpdatedAt).ToListAsync(ct);
        return rows.Select(CmsDto);
    }

    public async Task<object> CreateCmsAsync(CurrentUser user, string pageKey, string slug, JsonElement title, JsonElement body, CancellationToken ct)
    {
        var row = new CmsContent { PageKey = pageKey, Slug = slug, Title = title.GetRawText(), Body = body.GetRawText(), OwnerUserId = user.Id, Status = CmsStatus.DRAFT };
        _db.CmsContents.Add(row);
        _db.CmsContentVersions.Add(new CmsContentVersion { ContentId = row.Id, Version = 1, Title = row.Title, Body = row.Body, Status = CmsStatus.DRAFT });
        await _db.SaveChangesAsync(ct);
        return CmsDto(row);
    }

    public async Task<object> CmsTransitionAsync(CurrentUser user, Guid id, CmsStatus to, CancellationToken ct)
    {
        if (to == CmsStatus.PUBLISHED && !user.Roles.Contains(UserRole.SYSADMIN))
            throw AppException.Forbidden("Publishing CMS requires a sysadmin");
        var row = await _db.CmsContents.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw AppException.NotFound();
        row.Status = to;
        if (to == CmsStatus.PUBLISHED) row.PublishedAt = DateTimeOffset.UtcNow;
        row.Version++;
        _db.CmsContentVersions.Add(new CmsContentVersion { ContentId = row.Id, Version = row.Version, Title = row.Title, Body = row.Body, Status = row.Status });
        await _db.SaveChangesAsync(ct);
        return CmsDto(row);
    }

    public async Task<object> AuditAsync(string? objectType, CancellationToken ct)
    {
        var q = _db.AuditRecords.AsQueryable();
        if (objectType is not null) q = q.Where(a => a.ObjectType == objectType);
        var rows = await q.OrderByDescending(a => a.OccurredAt).Take(100).ToListAsync(ct);
        return rows.Select(a => new { a.Id, a.ActorUserId, a.Action, a.OccurredAt, before = a.Before is null ? null : Json(a.Before), after = a.After is null ? null : Json(a.After), a.ObjectType, a.ObjectId });
    }

    public object Settings() => new
    {
        phase = 1,
        dvxCompanyRegistrationUrl = _settings.DvxCompanyRegistrationUrl,
        dataResidency = "Production PostgreSQL must be hosted in Azerbaijan (NFR-01).",
        sanctionsProviderConfigured = false,
        emailVerificationRequired = _settings.RequireEmailVerification,
        ombudsmanEnabled = _settings.OmbudsmanEnabled,
        dvxSubmitEnabled = _settings.DvxSubmitEnabled,
        paymentsEnabled = _settings.PaymentsEnabled,
        bankPilotEnabled = _settings.BankPilotEnabled,
    };

    public async Task<object> AnalyticsOverviewAsync(CancellationToken ct)
    {
        var applications = await _db.Applications.CountAsync(ct);
        var submitted = await _db.Applications.CountAsync(a => a.SubmittedAt != null, ct);
        var byStatus = await _db.Cases.GroupBy(c => c.InternalStatus).Select(g => new { internalStatus = g.Key, count = g.Count() }).ToListAsync(ct);
        var kya = await _db.KyaResults.CountAsync(ct);
        var cases = await _db.Cases.Select(c => new { c.SlaDueAt, c.EscalatedAt, c.InternalStatus, c.PausedAt }).ToListAsync(ct);
        var terminal = new[] { CaseInternalStatus.COMPLETED, CaseInternalStatus.REJECTED, CaseInternalStatus.WITHDRAWN, CaseInternalStatus.ARCHIVED };
        var overdue = cases.Count(c => c.SlaDueAt < DateTimeOffset.UtcNow && c.PausedAt is null && !terminal.Contains(c.InternalStatus) && c.SlaDueAt is not null);
        return new
        {
            applications = new { total = applications, submitted, byStatus },
            kyaCalculations = kya,
            cases = new { total = cases.Count, completed = cases.Count(c => c.InternalStatus == CaseInternalStatus.COMPLETED), overdue, escalated = cases.Count(c => c.EscalatedAt is not null) },
            publicKpisApproved = await _phase2.PublicKpisApprovedAsync(ct),
        };
    }

    public async Task<object> AnalyticsSlaAsync(CancellationToken ct)
    {
        var rows = await _db.Cases.Where(c => c.SlaDueAt != null)
            .Select(c => new { c.Id, c.InternalStatus, c.SlaDueAt, c.PausedAt, c.EscalatedAt }).ToListAsync(ct);
        return rows;
    }

    public async Task<object> AnalyticsKyaAsync(CancellationToken ct)
    {
        var total = await _db.KyaResults.CountAsync(ct);
        var byRule = await _db.KyaResults.GroupBy(k => k.RuleVersion).Select(g => new { ruleVersion = g.Key, count = g.Count() }).ToListAsync(ct);
        return new { total, byRule };
    }

    private async Task<Profile> ProfileOf(Guid userId, CancellationToken ct) =>
        await _db.Profiles.FirstOrDefaultAsync(p => p.UserId == userId, ct) ?? throw AppException.NotFound("Profile not found");

    private async Task<bool> OwnsApplicationAsync(CurrentUser user, ApplicationEntity app, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        return app.ProfileId == profile.Id || app.Project?.ProfileId == profile.Id;
    }

    private static bool CanAccessCase(CurrentUser user, Case row)
    {
        if (user.Roles.Contains(UserRole.SUPERVISOR) || user.Roles.Contains(UserRole.SYSADMIN)) return true;
        if (user.Roles.Contains(UserRole.CASE_MANAGER) && row.CaseManagerId == user.Id) return true;
        if (user.Roles.Contains(UserRole.INSTITUTION_REP) && user.InstitutionId is not null
            && row.Tasks.Any(t => t.InstitutionId == user.InstitutionId)) return true;
        if (user.Roles.Contains(UserRole.EVALUATOR)
            && row.Evaluations.Any(e => e.EvaluatorId is null || e.EvaluatorId == user.Id)) return true;
        if (user.Roles.Contains(UserRole.OMBUDSMAN_OFFICER) && row.Application.Workflow == WorkflowKind.OMBUDSMAN) return true;
        return false;
    }

    private async Task<RuleSet> LatestRule(RuleSetKind kind, CancellationToken ct) =>
        await _db.RuleSets.Where(r => r.Kind == kind && r.EffectiveAt <= DateTimeOffset.UtcNow).OrderByDescending(r => r.EffectiveAt).FirstOrDefaultAsync(ct)
        ?? throw AppException.BadRequest("RULESET_MISSING", $"No effective {kind} rule set is configured");

    private async Task<Guid> ResolveClass(ClassificationKind kind, string codeOrId, CancellationToken ct)
    {
        if (Guid.TryParse(codeOrId, out var id))
        {
            var byId = await _db.Classifications.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (byId is not null) return byId.Id;
        }
        var byCode = await _db.Classifications.FirstOrDefaultAsync(c => c.Kind == kind && c.Code == codeOrId, ct)
            ?? throw AppException.BadRequest("CLASSIFICATION", $"Unknown {kind} '{codeOrId}'");
        return byCode.Id;
    }

    private async Task AppendTool(Guid userId, string key, object entry, CancellationToken ct)
    {
        var profile = await ProfileOf(userId, ct);
        var contacts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(profile.Contacts) ?? new();
        var list = contacts.TryGetValue(key, out var arr) && arr.ValueKind == JsonValueKind.Array
            ? arr.EnumerateArray().Select(x => x.Clone()).ToList() : [];
        list.Add(JsonSerializer.SerializeToElement(entry, JsonOpts));
        contacts[key] = JsonSerializer.SerializeToElement(list);
        profile.Contacts = JsonSerializer.Serialize(contacts);
        await _db.SaveChangesAsync(ct);
    }

    private async Task WriteDraft(Guid profileId, Guid applicationId, JsonElement answers, CancellationToken ct)
    {
        var profile = await _db.Profiles.FirstAsync(p => p.Id == profileId, ct);
        var contacts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(profile.Contacts) ?? new();
        var drafts = contacts.TryGetValue("draftApplications", out var d) && d.ValueKind == JsonValueKind.Object
            ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(d.GetRawText())! : new();
        drafts[applicationId.ToString()] = answers.Clone();
        contacts["draftApplications"] = JsonSerializer.SerializeToElement(drafts);
        profile.Contacts = JsonSerializer.Serialize(contacts);
        await _db.SaveChangesAsync(ct);
    }

    private async Task<JsonElement> ReadDraft(Guid profileId, Guid applicationId, CancellationToken ct)
    {
        var profile = await _db.Profiles.FirstAsync(p => p.Id == profileId, ct);
        var contacts = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(profile.Contacts) ?? new();
        if (contacts.TryGetValue("draftApplications", out var d) && d.ValueKind == JsonValueKind.Object
            && d.TryGetProperty(applicationId.ToString(), out var a)) return a;
        return JsonSerializer.SerializeToElement(new { });
    }

    private static object InvestorDto(ApplicationEntity app, ApplicationType type, Case? cse, JsonElement answers) => new
    {
        app.Id, app.PublicNumber, type = new { type.Code, names = Json(type.Names) }, app.Source,
        answers = app.Snapshot is not null ? Json(app.Snapshot) : answers.ValueKind == JsonValueKind.Undefined ? new { } : JsonSerializer.Deserialize<object>(answers.GetRawText()),
        snapshot = app.Snapshot is null ? null : Json(app.Snapshot),
        app.SubmittedAt,
        investorStatus = cse is null ? InvestorVisibleStatus.DRAFT : StatusMapping.ToInvestorStatus(cse.InternalStatus),
        nextStep = cse?.InternalStatus == CaseInternalStatus.WAITING_ADDITIONAL_INFO ? "Provide the requested information" : null,
        finalResult = cse?.FinalResult is null ? null : Json(cse.FinalResult),
    };

    private static object? Json(string raw)
    {
        try { return JsonSerializer.Deserialize<object>(raw); }
        catch { return raw; }
    }

    private static string NamesFor(string namesJson, string locale)
    {
        try
        {
            using var doc = JsonDocument.Parse(namesJson);
            if (doc.RootElement.TryGetProperty(locale, out var v)) return v.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("en", out var en)) return en.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("az", out var az)) return az.GetString() ?? "";
        }
        catch { /* ignore */ }
        return "";
    }

    private static object WithVersion(RouteOutput output, string version) => new
    {
        output.Estimated, output.RegistrationRoute, output.LegalForm, output.Legalization, output.VisaNote,
        output.ResidenceBasis, output.EstimatedWorkingDays, output.PhysicalContactsInAzerbaijan,
        output.StateFees, output.PartnerFees, output.PoliteStop, ruleVersion = version,
    };

    private static object CaseDto(Case c) => new
    {
        c.Id, c.ApplicationId, c.InternalStatus, c.CaseManagerId, c.SlaDueAt, c.RegisteredAt, c.ClosedAt,
        c.PausedAt, c.EscalatedAt, finalResult = c.FinalResult is null ? null : Json(c.FinalResult),
        c.SectorId, c.RegionId, c.InstitutionId, c.ReopenedAt, c.ReopenedById, c.ReopenReason, c.CreatedAt, c.UpdatedAt,
    };

    private static object TaskDto(TaskItem t) => new
    {
        t.Id, t.CaseId, t.InstitutionId, t.AssigneeUserId, t.DueAt, t.Status, t.Opinion, t.CreatedAt, t.UpdatedAt,
    };

    private static object EvalDto(Evaluation e) => new
    {
        e.Id, e.CaseId, e.UserId, e.Route, e.EvaluatorId, e.Opinion,
        criteriaUsed = e.CriteriaUsed is null ? null : Json(e.CriteriaUsed),
        e.ListVersion, e.StartedAt, e.DueAt, e.Status, e.CreatedAt, e.UpdatedAt,
    };

    private static object MessageDto(Message m) => new
    {
        m.Id, m.ApplicationId, m.SenderUserId, m.Body, m.CreatedAt, m.IsInternal,
    };

    private static object NotificationDto(Notification n) => new
    {
        n.Id, n.UserId, n.EventType, n.Channel, n.DeliveryResult, n.ReadAt, n.Body, payload = Json(n.Payload), n.CreatedAt,
    };

    private static object ClassificationDto(Classification c) => new
    {
        c.Id, c.Kind, c.Code, names = Json(c.Names), c.ParentId, c.IsActive, c.SortOrder, c.CreatedAt, c.UpdatedAt,
    };

    private static object RuleSetDto(RuleSet r) => new
    {
        r.Id, r.Kind, r.Version, r.EffectiveAt, r.ApprovedById, body = Json(r.Body), r.CreatedAt,
    };

    private static object CmsDto(CmsContent c) => new
    {
        c.Id, c.PageKey, c.Slug, title = Json(c.Title), body = Json(c.Body), c.Status, c.OwnerUserId,
        c.EffectiveAt, c.PublishedAt, c.ScheduledAt, c.Version, c.CreatedAt, c.UpdatedAt,
    };

    private static object? SnapshotAnswers(string snapshot)
    {
        try
        {
            using var doc = JsonDocument.Parse(snapshot);
            if (doc.RootElement.TryGetProperty("answers", out var answers))
                return JsonSerializer.Deserialize<object>(answers.GetRawText());
        }
        catch { /* ignore */ }
        return Json(snapshot);
    }
}
