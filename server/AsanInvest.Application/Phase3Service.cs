using System.Text.Json;
using AsanInvest.Domain;
using AsanInvest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ApplicationEntity = AsanInvest.Domain.Entities.Application;

namespace AsanInvest.Application;

public sealed class Phase3Service
{
    public static readonly string[] IntegrationCodes =
    [
        "asan_login", "e_nonresident", "foreign_esign", "visa", "customs",
        "electricity", "gas", "water", "migration", "notary", "planning",
        "cadastre", "remote_bank", "e_residency",
    ];

    private readonly IAppDbContext _db;
    private readonly AppSettings _settings;
    private readonly IENonresidentClient _eNonresident;
    private readonly IForeignEsignClient _foreignEsign;
    private readonly IVisaClient _visa;
    private readonly ICustomsClient _customs;
    private readonly IUtilityClient _utilities;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public Phase3Service(
        IAppDbContext db,
        IOptions<AppSettings> settings,
        IENonresidentClient eNonresident,
        IForeignEsignClient foreignEsign,
        IVisaClient visa,
        ICustomsClient customs,
        IUtilityClient utilities)
    {
        _db = db;
        _settings = settings.Value;
        _eNonresident = eNonresident;
        _foreignEsign = foreignEsign;
        _visa = visa;
        _customs = customs;
        _utilities = utilities;
    }

    public object AuthProviders() => new object[]
    {
        Provider("EMAIL", true, Flag.ONLINE, IdentificationLevel.BASIC, "Email registration is live (identification level 1)."),
        Provider("ASAN_LOGIN", false, Flag.PLANNED, IdentificationLevel.LEGAL, "ASAN Login / SİMA is not connected. Completing it later would raise identification to LEGAL without dropping profile data."),
        Provider("E_NONRESIDENT", false, Flag.PLANNED, IdentificationLevel.LEGAL, "e-qeyri-rezident / virtual FİN is not connected. Continue via a representative (TZ §7.2)."),
        Provider("FOREIGN_ESIGN", false, Flag.PLANNED, IdentificationLevel.BASIC, "Foreign e-signatures are not on a trust list. This channel does not raise identification to LEGAL."),
    };

    public object AsanLogin()
    {
        _ = _settings.AsanLoginEnabled;
        const bool available = false;
        return new
        {
            provider = "asan_login",
            available,
            flag = Flag.PLANNED,
            identificationLevelIfCompleted = IdentificationLevel.LEGAL,
            code = available ? (string?)null : "INTEGRATION_UNAVAILABLE",
            message = "ASAN Login is not connected. No session was created. Use email registration (level 1).",
        };
    }

    public async Task<object> StartENonresidentAsync(CurrentUser user, CancellationToken ct)
    {
        var outcome = await _eNonresident.StartAsync(user.Id, ct);
        LogIntegration("e_nonresident", "outbound", "user", user.Id.ToString(), outcome);
        Audit(user.Id, "identity.e_nonresident_start", "user", user.Id.ToString(), new { outcome.Available, outcome.Flag });
        await _db.SaveChangesAsync(ct);
        return new
        {
            flag = Flag.PLANNED,
            available = false,
            next = "representative",
            code = "INTEGRATION_UNAVAILABLE",
            message = outcome.Message,
        };
    }

    public async Task<object> CompleteENonresidentAsync(CurrentUser user, string? assertion, CancellationToken ct)
    {
        var outcome = await _eNonresident.CompleteAsync(user.Id, assertion, ct);
        LogIntegration("e_nonresident", "outbound", "user", user.Id.ToString(), outcome);
        var row = await _db.Users.FirstAsync(u => u.Id == user.Id, ct);
        if (outcome.Available && _settings.ENonresidentEnabled)
        {
            // Only a real adapter may issue a virtual FİN and raise LEGAL (TZ §7.2). Stubs never take this branch.
            row.VirtualFin = outcome.ProviderRef;
            row.AuthProvider = AuthProvider.E_NONRESIDENT;
            if (row.IdentificationLevel != IdentificationLevel.LEGAL)
            {
                row.IdentificationLevel = IdentificationLevel.LEGAL;
                row.IdentificationUpgradedAt = DateTimeOffset.UtcNow;
            }
        }
        Audit(user.Id, "identity.e_nonresident_complete", "user", user.Id.ToString(), new { outcome.Available, keptLevel = row.IdentificationLevel });
        await _db.SaveChangesAsync(ct);
        return new
        {
            available = outcome.Available,
            flag = Flag.PLANNED,
            identificationLevel = row.IdentificationLevel,
            virtualFin = FinMask.Mask(row.VirtualFin),
            code = outcome.Available ? (string?)null : "INTEGRATION_UNAVAILABLE",
            message = outcome.Message ?? "Identification level stays 1 until a live e-qeyri-rezident adapter exists.",
        };
    }

    public async Task<object> StartForeignEsignAsync(string? issuer, CancellationToken ct)
    {
        var outcome = await _foreignEsign.StartAsync(issuer, ct);
        LogIntegration("foreign_esign", "outbound", "auth", issuer ?? "unknown", outcome);
        await _db.SaveChangesAsync(ct);
        return new
        {
            flag = Flag.PLANNED,
            available = false,
            identificationLevel = IdentificationLevel.BASIC,
            code = "INTEGRATION_UNAVAILABLE",
            message = outcome.Message,
        };
    }

    public object IntegrationStatus(string code)
    {
        var normalized = NormalizeCode(code);
        if (!IntegrationCodes.Contains(normalized))
            throw AppException.NotFound("Unknown integration code");
        var enabled = FlagEnabled(normalized);
        return new
        {
            code = normalized,
            available = false,
            flag = Flag.PLANNED,
            enabled,
            message = HonestyMessage(normalized),
        };
    }

    public async Task<object> EResidencyPageAsync(CancellationToken ct)
    {
        var page = await _db.CmsContents
            .Where(p => (p.Slug == "e-residency" || p.PageKey == "ERES") && p.Status == CmsStatus.PUBLISHED)
            .OrderByDescending(p => p.Version)
            .FirstOrDefaultAsync(ct);
        return new
        {
            flag = Flag.PLANNED,
            legalStatus = "not_in_force",
            grantAvailable = false,
            applyEnabled = false,
            title = page is null ? "e-Rezidentlik" : NamesFor(page.Title, "az"),
            body = page is null
                ? "e-Rezidentlik qanunvericilikdə hələ qüvvədə deyil. Maraq bildirişi mümkün olsa da, status GRANTED stub ilə verilmir."
                : NamesFor(page.Body, "az"),
        };
    }

    public async Task<object> GrantEResidencyAsync(CurrentUser actor, Guid userId, CancellationToken ct)
    {
        if (!_settings.EResidencyEnabled)
            throw new AppException(403, "LEGISLATION_PENDING", "e-Residency cannot be granted until legislation is recorded in settings.");
        var user = await _db.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw AppException.NotFound("User not found");
        if (user.Profile is null) throw AppException.NotFound("Profile not found");
        user.Profile.EResidencyStatus = EResidencyStatus.GRANTED;
        Audit(actor.Id, "eresidency.granted", "profile", user.Profile.Id.ToString(), new { userId });
        Notify(user.Id, "ERESIDENCY_GRANTED", "e-Residency status was recorded by an administrator after legislation.", new { });
        await _db.SaveChangesAsync(ct);
        return new { userId, eResidencyStatus = user.Profile.EResidencyStatus };
    }

    public async Task<object> ChangeProcedureFlagAsync(CurrentUser user, Guid procedureId, Flag from, Flag to, bool notify, CancellationToken ct)
    {
        var procedure = await _db.Procedures.FirstOrDefaultAsync(p => p.Id == procedureId, ct)
            ?? throw AppException.NotFound("Procedure not found");
        if (procedure.Flag != from)
            throw AppException.Conflict($"Current flag is {procedure.Flag}, not {from}", "FLAG_MISMATCH");
        procedure.Flag = to;
        var openStages = await _db.Stages.Include(s => s.Project)
            .Where(s => s.ProcedureId == procedure.Id && s.ActualCompletedAt == null && !s.IsNotApplicable)
            .ToListAsync(ct);
        foreach (var stage in openStages)
            stage.Flag = to;

        var ownerIds = openStages.Select(s => s.Project.ProfileId).Distinct().ToList();
        var profiles = await _db.Profiles.Where(p => ownerIds.Contains(p.Id)).Select(p => new { p.Id, p.UserId }).ToListAsync(ct);
        var notified = 0;
        if (notify)
        {
            foreach (var profile in profiles)
            {
                Notify(profile.UserId, "FLAG_CHANGED",
                    "A procedure honesty flag on an open passport stage was updated. Open the project for the new working-days and physical-contact summary.",
                    new { procedureId, toFlag = to.ToString() });
                notified++;
            }
        }

        _db.FlagChangeEvents.Add(new FlagChangeEvent
        {
            ProcedureId = procedure.Id,
            FromFlag = from,
            ToFlag = to,
            ActorUserId = user.Id,
            NotifiedCount = notified,
        });
        Audit(user.Id, "admin.procedure_flag_changed", "procedure", procedure.Id.ToString(), new { from, to, notified, openStages = openStages.Count });
        await _db.SaveChangesAsync(ct);
        return new
        {
            procedureId = procedure.Id,
            procedure.Code,
            from,
            to,
            openStagesUpdated = openStages.Count,
            notifiedCount = notified,
        };
    }

    public async Task<object> FlagChangesAsync(CancellationToken ct)
    {
        var rows = await _db.FlagChangeEvents.Include(e => e.Procedure)
            .OrderByDescending(e => e.OccurredAt).Take(100).ToListAsync(ct);
        return rows.Select(e => new
        {
            e.Id, e.ProcedureId, procedureCode = e.Procedure.Code, e.FromFlag, e.ToFlag,
            e.ActorUserId, e.NotifiedCount, e.OccurredAt,
        });
    }

    public async Task<object> ExternalSubmitAsync(CurrentUser user, Guid projectId, Guid stageId, CancellationToken ct)
    {
        var profile = await ProfileOf(user.Id, ct);
        var stage = await _db.Stages.Include(s => s.Procedure).Include(s => s.Project)
            .Include(s => s.Application)
            .FirstOrDefaultAsync(s => s.Id == stageId && s.ProjectId == projectId, ct)
            ?? throw AppException.NotFound("Stage not found");
        if (stage.Project.ProfileId != profile.Id)
            throw AppException.Forbidden();

        var code = NormalizeCode(stage.Procedure.IntegrationCode ?? stage.Procedure.Code);
        var outcome = await DispatchAdapter(code, stage.Id, ct);
        LogIntegration(code, "outbound", "stage", stage.Id.ToString(), outcome);

        Guid? caseId = null;
        Case? cse = null;
        if (stage.ApplicationId is Guid appId)
            cse = await _db.Cases.FirstOrDefaultAsync(c => c.ApplicationId == appId, ct);

        if (!outcome.Available)
        {
            if (cse is null && stage.ApplicationId is not null)
            {
                cse = new Case
                {
                    ApplicationId = stage.ApplicationId.Value,
                    InternalStatus = CaseInternalStatus.INTER_AGENCY_COORDINATION,
                    SlaDueAt = Workflow.AddWorkingDays(DateTimeOffset.UtcNow, 10),
                    InstitutionId = stage.Procedure.InstitutionId,
                    SectorId = stage.Project.SectorId,
                    RegionId = stage.Project.TerritoryId,
                };
                _db.Cases.Add(cse);
                await _db.SaveChangesAsync(ct);
            }
            if (cse is not null)
            {
                _db.Tasks.Add(new TaskItem
                {
                    CaseId = cse.Id,
                    InstitutionId = stage.Procedure.InstitutionId,
                    DueAt = cse.SlaDueAt ?? DateTimeOffset.UtcNow.AddDays(10),
                    Status = "open",
                    Opinion = "Complete this PLAN integration in back-office. The adapter is not available.",
                });
                cse.InternalStatus = CaseInternalStatus.INTER_AGENCY_COORDINATION;
                caseId = cse.Id;
            }
            else
            {
                // No application yet: still honest PLAN, Z-04 next step is to open a draft müraciət.
            }
        }

        Audit(user.Id, "integration.external_submit", "stage", stage.Id.ToString(), new { code, available = outcome.Available, flag = outcome.Flag });
        Notify(user.Id, "INTEGRATION_PLAN", "The external step is recorded with a PLAN honesty flag. Open the passport for the next action.", new { stageId });
        await _db.SaveChangesAsync(ct);
        return new
        {
            stageId,
            integrationCode = code,
            available = false,
            flag = Flag.PLANNED,
            caseId,
            code = "INTEGRATION_UNAVAILABLE",
            message = outcome.Message,
        };
    }

    private async Task<IntegrationOutcome> DispatchAdapter(string code, Guid objectId, CancellationToken ct) =>
        NormalizeCode(code) switch
        {
            "visa" => await _visa.SubmitAsync(objectId, ct),
            "customs" => await _customs.SubmitAsync(objectId, ct),
            "electricity" => await _utilities.SubmitAsync("electricity", objectId, ct),
            "gas" => await _utilities.SubmitAsync("gas", objectId, ct),
            "water" => await _utilities.SubmitAsync("water", objectId, ct),
            "e_nonresident" => await _eNonresident.StartAsync(objectId, ct),
            _ => new IntegrationOutcome(false, Flag.PLANNED.ToString(), null, "{}", HonestyMessage(NormalizeCode(code))),
        };

    public static string NormalizeCode(string code)
    {
        var n = code.Trim().ToLowerInvariant().Replace('-', '_');
        return n switch
        {
            "asan_viza" => "visa",
            "customs_incentive" => "customs",
            "electricity_connection" => "electricity",
            "gas_connection" => "gas",
            "water_connection" => "water",
            "work_permit" or "temporary_residence" => "migration",
            "e_notary" => "notary",
            "construction_permit" or "zoning_prequery" => "planning",
            "emdx" or "property_register" => "cadastre",
            _ => n,
        };
    }

    private bool FlagEnabled(string code) => code switch
    {
        "asan_login" => _settings.AsanLoginEnabled,
        "e_nonresident" => _settings.ENonresidentEnabled,
        "foreign_esign" => _settings.ForeignEsignEnabled,
        "remote_bank" => _settings.RemoteBankEnabled,
        "e_residency" => _settings.EResidencyEnabled,
        "visa" => _settings.VisaEnabled,
        "customs" => _settings.CustomsEnabled,
        "electricity" => _settings.ElectricityEnabled,
        "gas" => _settings.GasEnabled,
        "water" => _settings.WaterEnabled,
        _ => false,
    };

    private static string HonestyMessage(string code) => code switch
    {
        "asan_login" => "ASAN Login / SİMA has no spec in this repository. Email login stays level 1.",
        "e_nonresident" => "Virtual FİN is PLAN. Completing start/complete must not raise identification to LEGAL.",
        "foreign_esign" => "Foreign e-sign is PLAN. Unlisted issuers never raise identification to LEGAL.",
        "visa" => "ASAN Viza is PLAN. The platform does not issue visas.",
        "customs" => "Customs incentive is PLAN. The platform does not confirm customs decisions.",
        "electricity" => "Electricity connection is PLAN until a live adapter exists (do not claim ONLINE).",
        "gas" => "Gas connection is PLAN.",
        "water" => "Water connection is PLAN.",
        "migration" => "Work / residence permit stays PLAN. Biometrics remain PHYSICAL until TZ §25.3 item 6 is answered.",
        "notary" => "Electronic notary is PLAN. The platform does not generate a notarial act.",
        "planning" => "Digital zoning / construction plan is PLAN. Coefficients are not invented.",
        "cadastre" => "Property-register extract is PLAN.",
        "remote_bank" => "Remote e-sign bank opening is PLAN until Mərkəzi Bank. The platform does not open accounts.",
        "e_residency" => "e-Residency is not in force. GRANTED is locked except sysadmin after legislation.",
        _ => "This integration is PLAN. A back-office task continues the step.",
    };

    private static object Provider(string code, bool available, Flag flag, IdentificationLevel level, string message) => new
    {
        code,
        available,
        flag,
        identificationLevelIfCompleted = level,
        message,
    };

    private async Task<Profile> ProfileOf(Guid userId, CancellationToken ct) =>
        await _db.Profiles.FirstOrDefaultAsync(p => p.UserId == userId, ct) ?? throw AppException.NotFound("Profile not found");

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

    private static string NamesFor(string namesJson, string locale)
    {
        try
        {
            using var doc = JsonDocument.Parse(namesJson);
            if (doc.RootElement.TryGetProperty(locale, out var v)) return v.GetString() ?? "";
            if (doc.RootElement.TryGetProperty("az", out var az)) return az.GetString() ?? "";
        }
        catch { /* ignore */ }
        return "";
    }
}
