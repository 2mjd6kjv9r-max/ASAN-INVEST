namespace AsanInvest.Core.Domain;

public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
}

public class User : Entity
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public Role Role { get; set; }
    /// <summary>Qurum əməkdaşı üçün qurum kodu.</summary>
    public string? InstitutionCode { get; set; }
    public string Language { get; set; } = "az";
    public bool Blocked { get; set; }
    public bool IsDemo { get; set; }
}

public class InvestorProfile : Entity
{
    public Guid UserId { get; set; }
    public InvestorKind Kind { get; set; }
    public Residency Residency { get; set; }
    public string DisplayName { get; set; } = "";
    public string Country { get; set; } = "Azərbaycan";
    /// <summary>Hüquqi şəxs üçün qeydiyyat nömrəsi; fiziki şəxs üçün FİN/pasport (yalnız demo/uydurma).</summary>
    public string IdentityNumber { get; set; } = "";
    public string AuthorizedPerson { get; set; } = "";
    public string BeneficialOwner { get; set; } = "";
    public string Contact { get; set; } = "";
    public EsignStatus Esign { get; set; } = EsignStatus.Unknown;
    public bool? HasResidencePermit { get; set; }
}

public class Representation : Entity
{
    public Guid InvestorUserId { get; set; }
    public Guid RepresentativeUserId { get; set; }
    public string Basis { get; set; } = "e-Təmsilçi";
    public DateTime ValidUntil { get; set; }
}

public class JobAnswers
{
    public InvestorKind Kind { get; set; }
    public Residency Residency { get; set; }
    public ProjectKind Project { get; set; }
    public EntryPath Path { get; set; }
    public bool? Construction { get; set; }
    public bool? ForeignWorker { get; set; }
    public bool? IncentiveDoc { get; set; }
    public bool? Land { get; set; }
    public bool? HasResidencePermit { get; set; }
    public bool? HasEsign { get; set; }
}

public class Job : Entity
{
    public Guid InvestorUserId { get; set; }
    public string Title { get; set; } = "";
    public string ScenarioCode { get; set; } = "";
    public string GroupCode { get; set; } = "";
    public int ScenarioVersion { get; set; } = 1;
    public JobAnswers Answers { get; set; } = new();
    public Guid? CoordinatorId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool Closed { get; set; }
    /// <summary>Ssenari dəyişəndə köhnə iş arxivləşir.</summary>
    public Guid? ReplacedByJobId { get; set; }
}

public class StageRun : Entity
{
    public Guid JobId { get; set; }
    public string Number { get; set; } = "";
    /// <summary>Seçilmiş yola aiddir (Pay/Kapital/ASC filtri).</summary>
    public bool OnPath { get; set; } = true;
    /// <summary>Şərti sual cavabı; könüllü mərhələdə «əlavə edildi»; alternativdə seçim. null = hələ cavab verilməyib.</summary>
    public bool? Answer { get; set; }
    /// <summary>Mərhələ yaranan an qurumların şablon snapshot-ı (admin sonradan dəyişəndə mövcud işlər təsirlənmir).</summary>
    public List<string> InstitutionCodes { get; set; } = new();
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    /// <summary>Son tarix hesablanması üçün əl ilə qeyd edilən başlanğıc tarix.</summary>
    public DateTime? AnchorDate { get; set; }
    /// <summary>İnvestor bütün məcburi bəndləri bitirdi və sorğuların göndərilməsini gözləyir.</summary>
    public bool ReadyToSend { get; set; }
}

public class TaskRun : Entity
{
    public Guid JobId { get; set; }
    public string StageNumber { get; set; } = "";
    /// <summary>Şablondakı açar: «3» (üst bənd) və ya «3.2» (alt bənd).</summary>
    public string Key { get; set; } = "";
    public Guid DoneBy { get; set; }
    public Guid? OnBehalfOf { get; set; }
    public DateTime DoneAt { get; set; }
}

public class Document : Entity
{
    public Guid JobId { get; set; }
    public string Type { get; set; } = "";
    public string FileName { get; set; } = "";
    /// <summary>Diskdə təsadüfi ad; istifadəçi adı heç vaxt yola qoşulmur.</summary>
    public string StoredName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public string SourceCountry { get; set; } = "";
    public ForeignDocStatus Foreign { get; set; } = ForeignDocStatus.NotForeign;
    public ReviewStatus Review { get; set; } = ReviewStatus.Pending;
    public string? ReviewReason { get; set; }
    public DateTime? ValidUntil { get; set; }
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public List<string> StageNumbers { get; set; } = new();
    /// <summary>Qurum nəticə sənədi (şəhadətnamə, arayış) ilə bağlıdırsa sorğu id-si.</summary>
    public Guid? ResultOfRequestId { get; set; }
}

public class InstitutionRequest : Entity
{
    public string Number { get; set; } = "";
    public Guid JobId { get; set; }
    public string StageNumber { get; set; } = "";
    public string InstitutionCode { get; set; } = "";
    public string Type { get; set; } = "";
    public RequestStatus Status { get; set; } = RequestStatus.Draft;
    public RequestChannel Channel { get; set; } = RequestChannel.Electronic;
    public int ResubmissionCount { get; set; }
    public Guid? Supersedes { get; set; }
    public List<Guid> DocumentIds { get; set; } = new();
    public Guid? ResultDocumentId { get; set; }
    public string? DecisionReason { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? GatewayReference { get; set; }
    public bool Simulated { get; set; } = true;
}

public class Message : Entity
{
    public Guid JobId { get; set; }
    public string? StageNumber { get; set; }
    public Guid? RequestId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid? OnBehalfOf { get; set; }
    public string Text { get; set; } = "";
    /// <summary>Daxili qeyd: investora görünmür.</summary>
    public bool Internal { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Notification : Entity
{
    public Guid UserId { get; set; }
    public string Event { get; set; } = "";
    public string Text { get; set; } = "";
    public string? Link { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditEntry : Entity
{
    public DateTime At { get; set; }
    public Guid ActorId { get; set; }
    public string ActorName { get; set; } = "";
    public Guid? OnBehalfOfId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public string EntityId { get; set; } = "";
    public Guid? JobId { get; set; }
    public string Details { get; set; } = "";
}

/// <summary>Adminin mərhələ kataloquna etdiyi dəyişiklik; yalnız yeni işlərə tətbiq olunur.</summary>
public class StageOverride : Entity
{
    public string GroupCode { get; set; } = "";
    public string StageNumber { get; set; } = "";
    public List<string> AddCodes { get; set; } = new();
    public List<string> RemoveCodes { get; set; } = new();
}

public class AppSetting : Entity
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
}
