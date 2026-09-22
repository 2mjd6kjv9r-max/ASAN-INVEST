namespace AsanInvest.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string? PasswordHash { get; set; }
    public IdentificationLevel IdentificationLevel { get; set; } = IdentificationLevel.BASIC;
    public string Locale { get; set; } = "az";
    public string Consents { get; set; } = "{}";
    public string? ConsentVersion { get; set; }
    public DateTimeOffset? ConsentedAt { get; set; }
    public AuthProvider AuthProvider { get; set; } = AuthProvider.EMAIL;
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorSecret { get; set; }
    public UserStatus Status { get; set; } = UserStatus.ACTIVE;
    public Guid? InstitutionId { get; set; }
    public string? PepSanctionsStatus { get; set; }
    public DateTimeOffset? PepSanctionsCheckedAt { get; set; }
    public string? PepSanctionsListVersion { get; set; }
    /// TZ §2: stored if issued; does not change resident / non-resident labelling.
    public string? VirtualFin { get; set; }
    public string? Fin { get; set; }
    public string? EsignIssuer { get; set; }
    public DateTimeOffset? IdentificationUpgradedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Classification? Institution { get; set; }
    public Profile? Profile { get; set; }
    public ICollection<UserRoleAssignment> RoleAssignments { get; set; } = new List<UserRoleAssignment>();
    public ICollection<PartnerSelection> PartnerSelections { get; set; } = new List<PartnerSelection>();
    public ICollection<FlagChangeEvent> FlagChangeEvents { get; set; } = new List<FlagChangeEvent>();
}

public class UserRoleAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public UserRole Role { get; set; }
    public DateTimeOffset ValidFrom { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ValidTo { get; set; }
    public Guid? GrantedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public User User { get; set; } = null!;
}

public class Profile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? CountryId { get; set; }
    public Guid? SectorId { get; set; }
    public Guid? ActivityAreaId { get; set; }
    public string Contacts { get; set; } = "{}";
    public string? CompanyName { get; set; }
    public Guid? CompanyCountryId { get; set; }
    public string? CompanyRegId { get; set; }
    public string? TaxId { get; set; }
    public string? CompanyActivity { get; set; }
    public string? DvxRegistrationStatus { get; set; }
    public DateTimeOffset? DvxRegisteredAt { get; set; }
    public string? CompanyLegalForm { get; set; }
    public EResidencyStatus EResidencyStatus { get; set; } = EResidencyStatus.NONE;
    public string? UboStructure { get; set; }
    public int Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public User User { get; set; } = null!;
    public ICollection<ProfileVersion> Versions { get; set; } = new List<ProfileVersion>();
    public ICollection<Representation> Representations { get; set; } = new List<Representation>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<KyaResult> KyaResults { get; set; } = new List<KyaResult>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}

public class ProfileVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfileId { get; set; }
    public int Version { get; set; }
    public string Snapshot { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Profile Profile { get; set; } = null!;
}

public class Representation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfileId { get; set; }
    public Guid RepresentativeUserId { get; set; }
    public RepresentationAuthority Authority { get; set; }
    public Guid? PowerOfAttorneyDocumentId { get; set; }
    public DateTimeOffset ValidFrom { get; set; }
    public DateTimeOffset? ValidTo { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Profile Profile { get; set; } = null!;
    public User RepresentativeUser { get; set; } = null!;
}

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfileId { get; set; }
    public string Name { get; set; } = null!;
    public Guid? SectorId { get; set; }
    public Guid? TerritoryId { get; set; }
    public decimal VolumeAmount { get; set; }
    public Currency VolumeCurrency { get; set; }
    public ProjectSizeCategory SizeCategory { get; set; }
    public string? CompanyRef { get; set; }
    public Guid? PermanentCaseManagerId { get; set; }
    public Guid CreatedById { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.PREPARATION;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Profile Profile { get; set; } = null!;
    public ICollection<Stage> Stages { get; set; } = new List<Stage>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
    public ICollection<KyaResult> KyaResults { get; set; } = new List<KyaResult>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Stage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid ProcedureId { get; set; }
    public Flag Flag { get; set; }
    public int SortOrder { get; set; }
    public int? ExpectedDurationDays { get; set; }
    public DateTimeOffset? ActualStartedAt { get; set; }
    public DateTimeOffset? ActualCompletedAt { get; set; }
    public Guid? ApplicationId { get; set; }
    public bool IsNotApplicable { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Project Project { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
    public Application? Application { get; set; }
    public ICollection<PartnerSelection> PartnerSelections { get; set; } = new List<PartnerSelection>();
}

public class KyaResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfileId { get; set; }
    public Guid? ProjectId { get; set; }
    public string InputParameters { get; set; } = "{}";
    public string Procedures { get; set; } = "[]";
    public Guid RuleSetId { get; set; }
    public string RuleVersion { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Profile Profile { get; set; } = null!;
    public Project? Project { get; set; }
    public RuleSet RuleSet { get; set; } = null!;
}

public class Application
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? PublicNumber { get; set; }
    public Guid TypeId { get; set; }
    public WorkflowKind Workflow { get; set; } = WorkflowKind.STANDARD;
    public string? Snapshot { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ProfileId { get; set; }
    public ApplicationSource Source { get; set; } = ApplicationSource.NEW_APPLICATION;
    public DateTimeOffset? WithdrawnAt { get; set; }
    public string? WithdrawalReason { get; set; }
    public DateTimeOffset? SubmittedAt { get; set; }
    public Guid? LinkedCaseId { get; set; }
    public BankChannel? BankChannel { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ApplicationType Type { get; set; } = null!;
    public Project? Project { get; set; }
    public Profile? Profile { get; set; }
    public Case? Case { get; set; }
    public Case? LinkedCase { get; set; }
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<SystemicProblemApplication> SystemicProblemLinks { get; set; } = new List<SystemicProblemApplication>();
    public ICollection<PartnerSelection> PartnerSelections { get; set; } = new List<PartnerSelection>();
}

public class Case
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ApplicationId { get; set; }
    public CaseInternalStatus InternalStatus { get; set; } = CaseInternalStatus.REGISTERED;
    public Guid? CaseManagerId { get; set; }
    public DateTimeOffset? SlaDueAt { get; set; }
    public DateTimeOffset RegisteredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? PausedAt { get; set; }
    public DateTimeOffset? EscalatedAt { get; set; }
    public string? FinalResult { get; set; }
    public Guid? SectorId { get; set; }
    public Guid? RegionId { get; set; }
    public Guid? InstitutionId { get; set; }
    public DateTimeOffset? ReopenedAt { get; set; }
    public Guid? ReopenedById { get; set; }
    public string? ReopenReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Application Application { get; set; } = null!;
    public User? CaseManager { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<Application> OmbudsmanApplications { get; set; } = new List<Application>();
}

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CaseId { get; set; }
    public Guid InstitutionId { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public string Status { get; set; } = "open";
    public string? Opinion { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Case Case { get; set; } = null!;
    public Classification Institution { get; set; } = null!;
}

public class Evaluation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CaseId { get; set; }
    public Guid UserId { get; set; }
    public string Route { get; set; } = null!;
    public Guid? EvaluatorId { get; set; }
    public string? Opinion { get; set; }
    public string? CriteriaUsed { get; set; }
    public string? ListVersion { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Case Case { get; set; } = null!;
    public User Subject { get; set; } = null!;
}

public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TypeId { get; set; }
    public int Version { get; set; } = 1;
    public DateTimeOffset? ValidUntil { get; set; }
    public DocumentSource Source { get; set; }
    public string StorageKey { get; set; } = null!;
    public string? OriginalName { get; set; }
    public string? MimeType { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Classification Type { get; set; } = null!;
    public ICollection<DocumentLink> Links { get; set; } = new List<DocumentLink>();
}

public class DocumentLink
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public DocumentLinkObject ObjectType { get; set; }
    public Guid ObjectId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Document Document { get; set; } = null!;
}

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ApplicationId { get; set; }
    public Guid SenderUserId { get; set; }
    public string Body { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsInternal { get; set; }
    public Application Application { get; set; } = null!;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string EventType { get; set; } = null!;
    public NotificationChannel Channel { get; set; }
    public string DeliveryResult { get; set; } = "pending";
    public DateTimeOffset? ReadAt { get; set; }
    public string Body { get; set; } = null!;
    public string Payload { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public User User { get; set; } = null!;
}

public class RuleSet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public RuleSetKind Kind { get; set; }
    public string Version { get; set; } = null!;
    public DateTimeOffset EffectiveAt { get; set; }
    public Guid? ApprovedById { get; set; }
    public string Body { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public PaymentKind Kind { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.EXTERNAL;
    public string? Provider { get; set; }
    public string? ProviderRef { get; set; }
    public string? RawPayload { get; set; }
    public string? FailureReason { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public Guid? ReceiptDocumentId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ApplicationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class AuditRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ActorUserId { get; set; }
    public string Action { get; set; } = null!;
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Before { get; set; }
    public string? After { get; set; }
    public string ObjectType { get; set; } = null!;
    public string ObjectId { get; set; } = null!;
}

public class Classification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public ClassificationKind Kind { get; set; }
    public string Code { get; set; } = null!;
    public string Names { get; set; } = "{}";
    public Guid? ParentId { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Procedure
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = null!;
    public string Names { get; set; } = "{}";
    public Guid InstitutionId { get; set; }
    public Flag Flag { get; set; }
    public int? ExpectedDurationDays { get; set; }
    public decimal? FeeAmount { get; set; }
    public Currency? FeeCurrency { get; set; }
    public string? LegalBasis { get; set; }
    public string? EServiceUrl { get; set; }
    public Guid? ApplicationTypeId { get; set; }
    public string? IntegrationCode { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Classification Institution { get; set; } = null!;
    public ICollection<ProcedureDependency> Dependencies { get; set; } = new List<ProcedureDependency>();
    public ICollection<StateFee> StateFees { get; set; } = new List<StateFee>();
    public ICollection<FlagChangeEvent> FlagChangeEvents { get; set; } = new List<FlagChangeEvent>();
}

public class ProcedureDependency
{
    public Guid ProcedureId { get; set; }
    public Guid DependsOnProcedureId { get; set; }
}

public class ApplicationType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = null!;
    public string Names { get; set; } = "{}";
    public WorkflowKind Workflow { get; set; } = WorkflowKind.STANDARD;
    public IdentificationLevel IdentificationLevel { get; set; }
    public bool RequiresEvaluation { get; set; }
    public string FormSchema { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<StateFee> StateFees { get; set; } = new List<StateFee>();
}

public class WorkflowStatus
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public WorkflowKind Workflow { get; set; } = WorkflowKind.STANDARD;
    public CaseInternalStatus InternalStatus { get; set; }
    public InvestorVisibleStatus InvestorVisibleStatus { get; set; }
    public int SortOrder { get; set; }
    public int? SlaWorkingDays { get; set; }
    public bool PauseSlaOnThisStatus { get; set; }
    public bool IsTerminal { get; set; }
}

public class WorkflowTransition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public WorkflowKind Workflow { get; set; } = WorkflowKind.STANDARD;
    public CaseInternalStatus FromStatus { get; set; }
    public CaseInternalStatus ToStatus { get; set; }
    public UserRole? RequiredRole { get; set; }
    public bool RequiresReason { get; set; }
}

public class CmsContent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PageKey { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string Title { get; set; } = "{}";
    public string Body { get; set; } = "{}";
    public CmsStatus Status { get; set; } = CmsStatus.DRAFT;
    public Guid? OwnerUserId { get; set; }
    public DateTimeOffset? EffectiveAt { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? ScheduledAt { get; set; }
    public int Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class CmsContentVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContentId { get; set; }
    public int Version { get; set; }
    public string Title { get; set; } = "{}";
    public string Body { get; set; } = "{}";
    public CmsStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class NotificationTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = null!;
    public UserRole? Role { get; set; }
    public string Locale { get; set; } = "az";
    public NotificationChannel Channel { get; set; }
    public string Subject { get; set; } = null!;
    public string Body { get; set; } = null!;
    public bool IsMandatory { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class GuestSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Email { get; set; }
    public string Answers { get; set; } = "{}";
    public string Locale { get; set; } = "az";
    public Guid? ConvertedUserId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// TZ §4.3 / FR-OMB-07 — shared by Ombudsman and Aftercare.
public class SystemicProblem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Category { get; set; } = null!;
    public Guid InstitutionId { get; set; }
    public string Cause { get; set; } = null!;
    public ReformStatus ReformStatus { get; set; } = ReformStatus.IDENTIFIED;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Classification Institution { get; set; } = null!;
    public ICollection<SystemicProblemApplication> Applications { get; set; } = new List<SystemicProblemApplication>();
}

public class SystemicProblemApplication
{
    public Guid ProblemId { get; set; }
    public Guid ApplicationId { get; set; }
    public SystemicProblem Problem { get; set; } = null!;
    public Application Application { get; set; } = null!;
}

/// FR-ADM-10 / FR-PAY-02 — contract is off-platform.
public class Partner
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Names { get; set; } = "{}";
    public string ServiceKind { get; set; } = null!;
    public decimal PriceAmount { get; set; }
    public Currency PriceCurrency { get; set; } = Currency.AZN;
    public string? DurationNote { get; set; }
    public decimal? Rating { get; set; }
    public AccreditationStatus AccreditationStatus { get; set; } = AccreditationStatus.PENDING;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<PartnerSelection> Selections { get; set; } = new List<PartnerSelection>();
}

/// FR-PAY-03 — one selection per passport stage.
public class PartnerSelection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PartnerId { get; set; }
    public Guid StageId { get; set; }
    public Guid UserId { get; set; }
    public Guid? ApplicationId { get; set; }
    public DateTimeOffset SelectedAt { get; set; } = DateTimeOffset.UtcNow;
    public Partner Partner { get; set; } = null!;
    public Stage Stage { get; set; } = null!;
    public User User { get; set; } = null!;
    public Application? Application { get; set; }
}

/// Opaque DVX/bank adapter log until an integration spec exists. Append-only.
public class IntegrationMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Provider { get; set; } = null!;
    public string Direction { get; set; } = null!;
    public string ObjectType { get; set; } = null!;
    public string ObjectId { get; set; } = null!;
    public string? ProviderRef { get; set; }
    public string Payload { get; set; } = "{}";
    public string Status { get; set; } = null!;
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}

/// FR-ADM-10 dövlət rüsumları. Never mixed with partner prices (TZ §20).
public class StateFee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = null!;
    public string Names { get; set; } = "{}";
    public decimal Amount { get; set; }
    public Currency Currency { get; set; } = Currency.AZN;
    public Guid? ProcedureId { get; set; }
    public Guid? ApplicationTypeId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Procedure? Procedure { get; set; }
    public ApplicationType? ApplicationType { get; set; }
}

/// FR-FLAG-03 — procedure flag promotion audit. Append-only.
public class FlagChangeEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProcedureId { get; set; }
    public Flag FromFlag { get; set; }
    public Flag ToFlag { get; set; }
    public Guid? ActorUserId { get; set; }
    public int NotifiedCount { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public Procedure Procedure { get; set; } = null!;
    public User? Actor { get; set; }
}
