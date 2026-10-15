using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Abstractions;

public interface IClock
{
    DateTime UtcNow { get; }
    /// <summary>Bakı vaxtı ilə bugünkü tarix (son tarix hesablamaları üçün).</summary>
    DateTime Today { get; }
    DateTime ToLocal(DateTime utc);
}

public sealed class SystemClock : IClock
{
    private static readonly TimeZoneInfo Baku = Resolve();
    private static TimeZoneInfo Resolve()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Baku"); }
        catch { return TimeZoneInfo.CreateCustomTimeZone("AZT", TimeSpan.FromHours(4), "Baku", "Baku"); }
    }
    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime Today => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Baku).Date;
    public DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Baku);
}

/// <summary>Verilənlər bazasına keçid üçün sərhəd: hazırda JSON faylları, sonra PostgreSQL/EF Core.</summary>
public interface IRepository<T> where T : Entity
{
    IReadOnlyList<T> All();
    T? Find(Guid id);
    void Upsert(T entity);
    void Delete(Guid id);
}

public interface IDataStore
{
    /// <summary>Çoxmərhələli əməliyyatlar bu kilid altında aparılır.</summary>
    object Gate { get; }
    IRepository<User> Users { get; }
    IRepository<InvestorProfile> Profiles { get; }
    IRepository<Representation> Representations { get; }
    IRepository<Job> Jobs { get; }
    IRepository<StageRun> StageRuns { get; }
    IRepository<TaskRun> TaskRuns { get; }
    IRepository<Document> Documents { get; }
    IRepository<InstitutionRequest> Requests { get; }
    IRepository<Message> Messages { get; }
    IRepository<Notification> Notifications { get; }
    IRepository<AuditEntry> Audit { get; }
    IRepository<StageOverride> Overrides { get; }
    IRepository<AppSetting> Settings { get; }
}

public interface IFileStorage
{
    /// <summary>Fayl təsadüfi adla saxlanılır; qaytarılan ad Document.StoredName olur.</summary>
    string Save(Stream content, string extension);
    Stream Open(string storedName);
    void Delete(string storedName);
}

public sealed record GatewayReceipt(string Reference, RequestChannel Channel, bool Simulated);

public sealed record SystemDataItem(string Label, string Value);

/// <summary>Qurum inteqrasiyası üçün vahid interfeys. Hər qurum üçün real API gələndə yalnız bu interfeysin implementasiyası əlavə olunur.</summary>
public interface IInstitutionGateway
{
    GatewayReceipt Dispatch(InstitutionRequest request, Job job, IReadOnlyList<Document> documents);
    IReadOnlyList<SystemDataItem> GetSystemData(InstitutionRequest request, Job job, InvestorProfile? profile);
}
