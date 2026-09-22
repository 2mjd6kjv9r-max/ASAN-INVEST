using System.Text.Json;

namespace AsanInvest.Domain;

public static class StatusMapping
{
    public static readonly IReadOnlyDictionary<CaseInternalStatus, InvestorVisibleStatus> InvestorVisible =
        new Dictionary<CaseInternalStatus, InvestorVisibleStatus>
        {
            [CaseInternalStatus.DRAFT] = InvestorVisibleStatus.DRAFT,
            [CaseInternalStatus.SUBMITTED] = InvestorVisibleStatus.SUBMITTED,
            [CaseInternalStatus.REGISTERED] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.IN_EVALUATION] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.WAITING_ADDITIONAL_INFO] = InvestorVisibleStatus.WAITING_YOUR_RESPONSE,
            [CaseInternalStatus.ASSIGNED_FOR_EXECUTION] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.UNDER_REVIEW] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.INTER_AGENCY_COORDINATION] = InvestorVisibleStatus.AT_INSTITUTION,
            [CaseInternalStatus.RESULT_BEING_PREPARED] = InvestorVisibleStatus.RESULT_BEING_PREPARED,
            [CaseInternalStatus.COMPLETED] = InvestorVisibleStatus.COMPLETED,
            [CaseInternalStatus.REJECTED] = InvestorVisibleStatus.REJECTED,
            [CaseInternalStatus.WITHDRAWN] = InvestorVisibleStatus.WITHDRAWN,
            [CaseInternalStatus.ARCHIVED] = InvestorVisibleStatus.ARCHIVED,
            // TZ §14.2 / PLAN-PHASE2 §2.1 — investigation/mediation/opinion → UNDER_CONSIDERATION
            [CaseInternalStatus.UNDER_INVESTIGATION] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.IN_MEDIATION] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.OPINION_PREPARED] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.OPINION_PENDING_APPROVAL] = InvestorVisibleStatus.RESULT_BEING_PREPARED,
            [CaseInternalStatus.NEXT_CONTACT_PLANNED] = InvestorVisibleStatus.UNDER_CONSIDERATION,
            [CaseInternalStatus.IN_MONITORING] = InvestorVisibleStatus.UNDER_CONSIDERATION,
        };

    public const string StageLocked = "LOCKED";
    public const string StageOpen = "OPEN";
    public const string StageInProgress = "IN_PROGRESS";
    public const string StageWaiting = "WAITING_YOUR_RESPONSE";
    public const string StageCompleted = "COMPLETED";
    public const string StageProblematic = "PROBLEMATIC";
    public const string StageNotApplicable = "NOT_APPLICABLE";

    public static InvestorVisibleStatus ToInvestorStatus(CaseInternalStatus internalStatus) =>
        InvestorVisible[internalStatus];

    public static string ToStageStatus(bool notApplicable, bool locked, bool hasApplication, CaseInternalStatus? caseStatus)
    {
        if (notApplicable) return StageNotApplicable;
        if (locked) return StageLocked;
        if (!hasApplication || caseStatus is null || caseStatus == CaseInternalStatus.DRAFT) return StageOpen;
        if (caseStatus == CaseInternalStatus.WAITING_ADDITIONAL_INFO) return StageWaiting;
        if (caseStatus == CaseInternalStatus.COMPLETED) return StageCompleted;
        if (caseStatus == CaseInternalStatus.REJECTED) return StageProblematic;
        return StageInProgress;
    }
}

public static class Roles
{
    public static readonly UserRole[] Internal =
    [
        UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.INSTITUTION_REP, UserRole.EVALUATOR,
        UserRole.OMBUDSMAN_OFFICER, UserRole.CONTENT_MANAGER, UserRole.ANALYST, UserRole.SYSADMIN,
    ];

    public static bool IsInternal(IEnumerable<UserRole> roles) => roles.Any(r => Internal.Contains(r));

    public static bool RequiresTwoFactor(IEnumerable<UserRole> roles) => IsInternal(roles);

    public static IReadOnlyList<UserRole> Active(IEnumerable<Entities.UserRoleAssignment> assignments, DateTimeOffset now) =>
        assignments.Where(a => a.ValidFrom <= now && (a.ValidTo is null || a.ValidTo > now)).Select(a => a.Role).ToList();
}

public static class Workflow
{
    public static bool CanTransition(CaseInternalStatus from, CaseInternalStatus to, IReadOnlyCollection<UserRole> roles)
    {
        if (roles.Contains(UserRole.SYSADMIN) && Allowed.Any(x => x.From == from && x.To == to)) return true;
        return Allowed.Any(x => x.From == from && x.To == to && x.Roles.Any(roles.Contains));
    }

    public static DateTimeOffset AddWorkingDays(DateTimeOffset from, int days)
    {
        var cursor = new DateTimeOffset(from.UtcDateTime.Date, TimeSpan.Zero);
        var added = 0;
        while (added < days)
        {
            cursor = cursor.AddDays(1);
            if (cursor.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            added++;
        }
        return cursor;
    }

    public static string SlaState(DateTimeOffset? dueAt, DateTimeOffset now, DateTimeOffset? pausedAt)
    {
        if (pausedAt is not null) return "paused";
        if (dueAt is null) return "ok";
        var ms = (dueAt.Value - now).TotalMilliseconds;
        if (ms < 0) return "overdue";
        if (ms <= TimeSpan.FromDays(2).TotalMilliseconds) return "warn";
        return "ok";
    }

    public static string NextApplicationNumber(int year, int sequence) =>
        $"INV-{year}-{sequence.ToString().PadLeft(5, '0')}";

    public static void AssertLinked(Guid? projectId, Guid? profileId)
    {
        var hasProject = projectId is not null;
        var hasProfile = profileId is not null;
        if (hasProject == hasProfile)
            throw new InvalidOperationException("Every application must be linked to a project or a profile, not both");
    }

    private static readonly (CaseInternalStatus From, CaseInternalStatus To, UserRole[] Roles)[] Allowed =
    [
        (CaseInternalStatus.DRAFT, CaseInternalStatus.SUBMITTED, [UserRole.INVESTOR]),
        (CaseInternalStatus.SUBMITTED, CaseInternalStatus.REGISTERED, [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.REGISTERED, CaseInternalStatus.IN_EVALUATION, [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.EVALUATOR]),
        (CaseInternalStatus.REGISTERED, CaseInternalStatus.ASSIGNED_FOR_EXECUTION, [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.IN_EVALUATION, CaseInternalStatus.ASSIGNED_FOR_EXECUTION, [UserRole.EVALUATOR, UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.IN_EVALUATION, CaseInternalStatus.WAITING_ADDITIONAL_INFO, [UserRole.EVALUATOR]),
        (CaseInternalStatus.IN_EVALUATION, CaseInternalStatus.REJECTED, [UserRole.SUPERVISOR]),
        (CaseInternalStatus.ASSIGNED_FOR_EXECUTION, CaseInternalStatus.UNDER_REVIEW, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.UNDER_REVIEW, CaseInternalStatus.INTER_AGENCY_COORDINATION, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.UNDER_REVIEW, CaseInternalStatus.WAITING_ADDITIONAL_INFO, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.UNDER_REVIEW, CaseInternalStatus.RESULT_BEING_PREPARED, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.INTER_AGENCY_COORDINATION, CaseInternalStatus.WAITING_ADDITIONAL_INFO, [UserRole.INSTITUTION_REP]),
        (CaseInternalStatus.INTER_AGENCY_COORDINATION, CaseInternalStatus.RESULT_BEING_PREPARED, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.WAITING_ADDITIONAL_INFO, CaseInternalStatus.UNDER_REVIEW, [UserRole.INVESTOR]),
        (CaseInternalStatus.WAITING_ADDITIONAL_INFO, CaseInternalStatus.IN_EVALUATION, [UserRole.INVESTOR]),
        (CaseInternalStatus.RESULT_BEING_PREPARED, CaseInternalStatus.COMPLETED, [UserRole.CASE_MANAGER]),
        (CaseInternalStatus.RESULT_BEING_PREPARED, CaseInternalStatus.REJECTED, [UserRole.SUPERVISOR]),
        (CaseInternalStatus.DRAFT, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.SUBMITTED, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.REGISTERED, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.UNDER_REVIEW, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.COMPLETED, CaseInternalStatus.ARCHIVED, [UserRole.SYSADMIN, UserRole.SUPERVISOR]),
        (CaseInternalStatus.REJECTED, CaseInternalStatus.ARCHIVED, [UserRole.SYSADMIN, UserRole.SUPERVISOR]),
        (CaseInternalStatus.WITHDRAWN, CaseInternalStatus.ARCHIVED, [UserRole.SYSADMIN, UserRole.SUPERVISOR]),
        (CaseInternalStatus.REJECTED, CaseInternalStatus.UNDER_REVIEW, [UserRole.SUPERVISOR]),
        // TZ §14.2 Ombudsman
        (CaseInternalStatus.REGISTERED, CaseInternalStatus.UNDER_INVESTIGATION, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR, UserRole.SYSADMIN]),
        (CaseInternalStatus.UNDER_INVESTIGATION, CaseInternalStatus.IN_MEDIATION, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.UNDER_INVESTIGATION, CaseInternalStatus.WAITING_ADDITIONAL_INFO, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.UNDER_INVESTIGATION, CaseInternalStatus.OPINION_PREPARED, [UserRole.OMBUDSMAN_OFFICER]),
        (CaseInternalStatus.IN_MEDIATION, CaseInternalStatus.OPINION_PREPARED, [UserRole.OMBUDSMAN_OFFICER]),
        (CaseInternalStatus.IN_MEDIATION, CaseInternalStatus.UNDER_INVESTIGATION, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.OPINION_PREPARED, CaseInternalStatus.OPINION_PENDING_APPROVAL, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.OPINION_PENDING_APPROVAL, CaseInternalStatus.COMPLETED, [UserRole.SUPERVISOR, UserRole.SYSADMIN]),
        (CaseInternalStatus.OPINION_PENDING_APPROVAL, CaseInternalStatus.OPINION_PREPARED, [UserRole.SUPERVISOR, UserRole.SYSADMIN]),
        (CaseInternalStatus.WAITING_ADDITIONAL_INFO, CaseInternalStatus.UNDER_INVESTIGATION, [UserRole.INVESTOR, UserRole.OMBUDSMAN_OFFICER]),
        (CaseInternalStatus.UNDER_INVESTIGATION, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.IN_MEDIATION, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.OPINION_PREPARED, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.UNDER_INVESTIGATION, CaseInternalStatus.COMPLETED, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.IN_MEDIATION, CaseInternalStatus.COMPLETED, [UserRole.OMBUDSMAN_OFFICER, UserRole.SUPERVISOR]),
        // TZ §14.2 Aftercare
        (CaseInternalStatus.REGISTERED, CaseInternalStatus.IN_MONITORING, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN]),
        (CaseInternalStatus.IN_MONITORING, CaseInternalStatus.NEXT_CONTACT_PLANNED, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.NEXT_CONTACT_PLANNED, CaseInternalStatus.IN_MONITORING, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.IN_MONITORING, CaseInternalStatus.WAITING_ADDITIONAL_INFO, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.WAITING_ADDITIONAL_INFO, CaseInternalStatus.IN_MONITORING, [UserRole.INVESTOR, UserRole.CASE_MANAGER]),
        (CaseInternalStatus.IN_MONITORING, CaseInternalStatus.COMPLETED, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.NEXT_CONTACT_PLANNED, CaseInternalStatus.COMPLETED, [UserRole.CASE_MANAGER, UserRole.SUPERVISOR]),
        (CaseInternalStatus.IN_MONITORING, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
        (CaseInternalStatus.NEXT_CONTACT_PLANNED, CaseInternalStatus.WITHDRAWN, [UserRole.INVESTOR]),
    ];
}

/// FR-REG-05…07 — bank KYC pilot is capped at two institutions.
public static class BankPilot
{
    public const int MaxBanks = 2;
    public const string CodePrefix = "pilot-bank";

    public static bool ExceedsLimit(int uniqueBankCount) => uniqueBankCount > MaxBanks;

    public static bool IsPilotInstitution(string? code) =>
        !string.IsNullOrWhiteSpace(code) && code.StartsWith(CodePrefix, StringComparison.OrdinalIgnoreCase);
}

/// PLAN-PHASE2 §4.2.2 — lift WORKFLOW_PHASE2 only for these type codes.
public static class Phase2Types
{
    public static readonly HashSet<string> Codes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ombudsman", "aftercare", "company_registration", "bank_kyc",
    };

    public static bool AllowsWorkflow(string typeCode, WorkflowKind workflow) =>
        workflow == WorkflowKind.STANDARD || Codes.Contains(typeCode);
}

/// FR-FLAG-02 — «N iş günü · M fiziki təmas» from open passport stages.
public static class FlagSummary
{
    public static (int WorkingDays, int PhysicalContacts) FromStages(IEnumerable<(Flag Flag, int? ExpectedDurationDays, bool Completed, bool NotApplicable)> stages)
    {
        var open = stages.Where(s => !s.Completed && !s.NotApplicable).ToList();
        return (open.Sum(s => s.ExpectedDurationDays ?? 0), open.Count(s => s.Flag == Flag.PHYSICAL));
    }

    public static bool IsOpenStage(DateTimeOffset? actualCompletedAt, bool notApplicable) =>
        actualCompletedAt is null && !notApplicable;

    public static bool IsTerminalCase(CaseInternalStatus? status) =>
        status is CaseInternalStatus.COMPLETED or CaseInternalStatus.REJECTED
            or CaseInternalStatus.WITHDRAWN or CaseInternalStatus.ARCHIVED;

    /// FR-FLAG-03 — refresh open passport stages only. Case COMPLETED counts even when ActualCompletedAt was never written.
    public static bool IsOpenForFlagRefresh(DateTimeOffset? actualCompletedAt, bool notApplicable, CaseInternalStatus? caseStatus) =>
        !notApplicable && actualCompletedAt is null && !IsTerminalCase(caseStatus);
}

/// PLAN-PHASE3 §1.3 / §4.2.5 — PLAN adapters must not mint LEGAL / GRANTED.
public static class Phase3Integrity
{
    public static bool MayUpgradeENonresident(bool enabled, bool adapterAvailable, string? assertion, string? providerRef) =>
        enabled
        && adapterAvailable
        && !string.IsNullOrWhiteSpace(assertion)
        && !string.IsNullOrWhiteSpace(providerRef);

    public static bool MayGrantEResidency(bool legislationEnabled, EResidencyStatus current) =>
        legislationEnabled && current is EResidencyStatus.APPLIED or EResidencyStatus.PLAN_PENDING;

    public static bool HasKycContent(JsonElement packet)
    {
        if (packet.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null) return false;
        if (packet.ValueKind == JsonValueKind.String) return !string.IsNullOrWhiteSpace(packet.GetString());
        if (packet.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False) return true;
        if (packet.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in packet.EnumerateArray())
                if (HasKycContent(item)) return true;
            return false;
        }
        if (packet.ValueKind != JsonValueKind.Object) return false;
        foreach (var property in packet.EnumerateObject())
            if (HasKycContent(property.Value)) return true;
        return false;
    }
}

public static class FinMask
{
    /// Present but masked so notifications / public JSON do not leak a full FİN (FR-NOT-06).
    public static string? Mask(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        if (v.Length <= 4) return new string('*', v.Length);
        return $"{v[..2]}{new string('*', v.Length - 4)}{v[^2..]}";
    }
}

public static class PaymentHmac
{
    public static string Sign(string secret, string payload)
    {
        var key = System.Text.Encoding.UTF8.GetBytes(secret);
        var data = System.Text.Encoding.UTF8.GetBytes(payload);
        var hash = System.Security.Cryptography.HMACSHA256.HashData(key, data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static bool Verify(string secret, string payload, string? signature)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signature)) return false;
        var expected = Sign(secret, payload);
        var provided = signature.Trim().ToLowerInvariant();
        if (provided.StartsWith("sha256=", StringComparison.Ordinal)) provided = provided[7..];
        var expectedBytes = System.Text.Encoding.UTF8.GetBytes(expected);
        var providedBytes = System.Text.Encoding.UTF8.GetBytes(provided);
        return expectedBytes.Length == providedBytes.Length
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }
}

/// Provider refs, webhook bodies, and adapter logs must not be stored unbounded or as empty unique keys.
public static class PaymentIntegrity
{
    public const int MaxPayloadChars = 4096;
    public const int MaxRawBodyChars = 16384;
    public const int MaxProviderRefChars = 128;

    public static string? NormalizeProviderRef(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length <= MaxProviderRefChars ? trimmed : trimmed[..MaxProviderRefChars];
    }

    public static string? SanitizePayload(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var trimmed = raw.Trim();
        if (trimmed.Length > MaxPayloadChars)
            return JsonSerializer.Serialize(new { truncated = true, length = trimmed.Length });
        try
        {
            using var doc = JsonDocument.Parse(trimmed);
            return doc.RootElement.GetRawText();
        }
        catch (JsonException)
        {
            return JsonSerializer.Serialize(new { invalid = true, length = trimmed.Length });
        }
    }
}
