using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Infrastructure;

/// <summary>
/// Hər kolleksiya data/{ad}.json faylında saxlanılır. Bu, DB qoşulana qədər müvəqqəti yerli yaddaşdır:
/// IRepository/IDataStore interfeyslərinin EF Core (PostgreSQL) implementasiyası ilə əvəz edilməsi kifayətdir.
/// Fayllar atomik yazılır (müvəqqəti fayl + yerdəyişmə). Oxunan obyektlər kopyadır: dəyişiklik yalnız Upsert ilə saxlanılır.
/// </summary>
public sealed class JsonRepository<T> : IRepository<T> where T : Entity
{
    internal static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter() },
        PropertyNameCaseInsensitive = true
    };

    private readonly string _path;
    private readonly object _lock = new();
    private readonly Dictionary<Guid, string> _rows = new();
    private readonly List<Guid> _order = new();

    public JsonRepository(string directory, string name)
    {
        Directory.CreateDirectory(directory);
        _path = Path.Combine(directory, name + ".json");
        if (!File.Exists(_path)) return;

        using var doc = JsonDocument.Parse(File.ReadAllText(_path));
        foreach (var el in doc.RootElement.EnumerateArray())
        {
            var json = el.GetRawText();
            var entity = JsonSerializer.Deserialize<T>(json, Options)!;
            _rows[entity.Id] = json;
            _order.Add(entity.Id);
        }
    }

    public IReadOnlyList<T> All()
    {
        lock (_lock) return _order.Select(id => JsonSerializer.Deserialize<T>(_rows[id], Options)!).ToList();
    }

    public T? Find(Guid id)
    {
        lock (_lock) return _rows.TryGetValue(id, out var json) ? JsonSerializer.Deserialize<T>(json, Options) : null;
    }

    public void Upsert(T entity)
    {
        lock (_lock)
        {
            if (!_rows.ContainsKey(entity.Id)) _order.Add(entity.Id);
            _rows[entity.Id] = JsonSerializer.Serialize(entity, Options);
            Persist();
        }
    }

    public void Delete(Guid id)
    {
        lock (_lock)
        {
            if (_rows.Remove(id)) { _order.Remove(id); Persist(); }
        }
    }

    private void Persist()
    {
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, "[" + string.Join(",\n", _order.Select(id => _rows[id])) + "]");
        File.Move(tmp, _path, overwrite: true);
    }
}

public sealed class JsonDataStore : IDataStore
{
    public JsonDataStore(string directory)
    {
        Users = new JsonRepository<User>(directory, "users");
        Profiles = new JsonRepository<InvestorProfile>(directory, "profiles");
        Representations = new JsonRepository<Representation>(directory, "representations");
        Jobs = new JsonRepository<Job>(directory, "jobs");
        StageRuns = new JsonRepository<StageRun>(directory, "stage-runs");
        TaskRuns = new JsonRepository<TaskRun>(directory, "task-runs");
        Documents = new JsonRepository<Document>(directory, "documents");
        Requests = new JsonRepository<InstitutionRequest>(directory, "requests");
        Messages = new JsonRepository<Message>(directory, "messages");
        Notifications = new JsonRepository<Notification>(directory, "notifications");
        Audit = new JsonRepository<AuditEntry>(directory, "audit");
        Overrides = new JsonRepository<StageOverride>(directory, "stage-overrides");
        Settings = new JsonRepository<AppSetting>(directory, "settings");
    }

    public object Gate { get; } = new();
    public IRepository<User> Users { get; }
    public IRepository<InvestorProfile> Profiles { get; }
    public IRepository<Representation> Representations { get; }
    public IRepository<Job> Jobs { get; }
    public IRepository<StageRun> StageRuns { get; }
    public IRepository<TaskRun> TaskRuns { get; }
    public IRepository<Document> Documents { get; }
    public IRepository<InstitutionRequest> Requests { get; }
    public IRepository<Message> Messages { get; }
    public IRepository<Notification> Notifications { get; }
    public IRepository<AuditEntry> Audit { get; }
    public IRepository<StageOverride> Overrides { get; }
    public IRepository<AppSetting> Settings { get; }
}
