using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Catalog;
using AsanInvest.Core.Services;

namespace AsanInvest.Infrastructure;

/// <summary>Bütün servisləri birləşdirir (Web və testlər eyni qurulumdan istifadə edir).</summary>
public sealed class Platform
{
    public required IDataStore Store { get; init; }
    public required CatalogData Catalog { get; init; }
    public required IClock Clock { get; init; }
    public required IFileStorage Files { get; init; }
    public required AuditService Audit { get; init; }
    public required NotificationService Notifications { get; init; }
    public required AccessService Access { get; init; }
    public required SettingsService Settings { get; init; }
    public required JobService Jobs { get; init; }
    public required DocumentService Documents { get; init; }
    public required RequestService Requests { get; init; }
    public required MessageService Messages { get; init; }
    public required IInstitutionGateway Gateway { get; init; }

    public static Platform Create(string dataDir, string seedDir, IClock? clock = null, IOutbox? outbox = null,
        IInstitutionGateway? gateway = null)
    {
        clock ??= new SystemClock();
        var store = new JsonDataStore(dataDir);
        var catalog = SeedLoader.Load(seedDir);
        var files = new LocalFileStorage(Path.Combine(dataDir, "files"));
        outbox ??= new FileOutbox(Path.Combine(dataDir, "outbox.log"));
        gateway ??= new MockInstitutionGateway();

        var audit = new AuditService(store, clock);
        var notes = new NotificationService(store, clock, outbox);
        var access = new AccessService(store, clock);
        var settings = new SettingsService(store);
        var jobs = new JobService(store, catalog, clock, audit, notes, access);
        var docs = new DocumentService(store, catalog, clock, files, audit, notes, access, settings);
        var requests = new RequestService(store, catalog, clock, gateway, audit, notes, access, jobs, docs, settings);
        var messages = new MessageService(store, clock, audit, notes, access);

        return new Platform
        {
            Store = store, Catalog = catalog, Clock = clock, Files = files, Audit = audit, Notifications = notes,
            Access = access, Settings = settings, Jobs = jobs, Documents = docs, Requests = requests,
            Messages = messages, Gateway = gateway
        };
    }
}
