using System.Text.Json;
using AsanInvest.Domain;

namespace AsanInvest.Application;

public sealed record TokenResult(string AccessToken, string RefreshToken, DateTimeOffset RefreshExpiresAt, object User);

public sealed class AuthOutcome
{
    public bool TwoFactorRequired { get; init; }
    public string? ChallengeId { get; init; }
    public TokenResult? Tokens { get; init; }
}

public sealed record LoginRequest(string Email, string Password);
public sealed record TwoFactorRequest(string ChallengeId, string Code);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Token, string Password);
public sealed record VerifyEmailRequest(string Token);
public sealed record GuestCreateRequest(string? Locale);
public sealed record GuestPatchRequest(JsonElement Answers, string? Email, string? Locale);

public sealed record RepresentationCreateRequest(string RepresentativeEmail, RepresentationAuthority Authority, DateTimeOffset? ValidTo, Guid? PowerOfAttorneyDocumentId);
public sealed record ConsentRequest(string Version, bool PersonalData);

public sealed record ProjectCreateRequest(string Name, string Sector, string Territory, string VolumeAmount, string VolumeCurrency, string? CompanyRef, Guid? KyaResultId);
public sealed record ApplicationCreateRequest(string TypeCode, Guid? ProjectId, JsonElement? Answers, ApplicationSource? Source, Guid? StageId);
public sealed record ApplicationPatchRequest(JsonElement Answers);
public sealed record WithdrawRequest(string Reason);

public sealed record CaseTransitionRequest(CaseInternalStatus To, string? Reason);
public sealed record CaseAssignRequest(Guid CaseManagerId);
public sealed record ExtraInfoRequest(JsonElement Fields, DateTimeOffset DueAt, string? TemplateHint);
public sealed record ExtraInfoRespondRequest(JsonElement Response);
public sealed record CaseCloseRequest(string Decision, string Reasoning, string? LegalBasis, string? NextSteps);
public sealed record CaseReopenRequest(string Reason);
public sealed record CaseExtendRequest(DateTimeOffset SlaDueAt, string Reason);
public sealed record ComplaintRequest(string Description);
public sealed record CreateTaskRequest(Guid InstitutionId, DateTimeOffset DueAt, Guid? AssigneeUserId, string? Notes);
public sealed record CompleteTaskRequest(string Opinion);
public sealed record EvaluationOpinionRequest(string Opinion, bool ContinueCase = true);
public sealed record MessageCreateRequest(string Body, bool? Internal);

public sealed record AdminUserCreateRequest(string Email, string Password, List<UserRole> Roles, Guid? InstitutionId, DateTimeOffset? ValidTo);
public sealed record AdminStatusRequest(UserStatus Status);
public sealed record ClassificationCreateRequest(ClassificationKind Kind, string Code, JsonElement Names, Guid? ParentId, int? SortOrder);
public sealed record ApplicationTypeCreateRequest(string Code, JsonElement Names, IdentificationLevel IdentificationLevel, bool RequiresEvaluation, JsonElement? FormSchema);
public sealed record ProcedureCreateRequest(string Code, JsonElement Names, Guid InstitutionId, Flag Flag, int? ExpectedDurationDays, string? LegalBasis, string? EServiceUrl);
public sealed record RuleSetCreateRequest(RuleSetKind Kind, string Version, DateTimeOffset EffectiveAt, JsonElement Body);
public sealed record CmsCreateRequest(string PageKey, string Slug, JsonElement Title, JsonElement Body);
public sealed record CmsTransitionRequest(CmsStatus To);
public sealed record NotificationTemplateCreateRequest(string EventType, UserRole? Role, string Locale, NotificationChannel Channel, string Subject, string Body, bool IsMandatory);

public sealed record RouteRequest(
    string Country,
    string Sector,
    string VolumeAmount,
    string VolumeCurrency,
    string Territory,
    bool? HasESignature,
    string? NationalityType,
    string? GuestSessionToken);

public sealed record IncentiveRequest(
    string Sector,
    string? Activity,
    string VolumeAmount,
    string VolumeCurrency,
    string Territory,
    bool? InAgropark,
    bool? InIndustrialPark,
    string? GuestSessionToken);

public sealed record KyaRequest(
    string Sector,
    string Territory,
    string VolumeAmount,
    string VolumeCurrency,
    int? ForeignWorkers,
    string? Description,
    bool ConfirmedParameters,
    JsonElement? SiParameters);
