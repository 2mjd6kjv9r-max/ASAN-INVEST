using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Services;

/// <summary>Audit jurnalı: kim, kimin adından, nə, nə vaxt (TZ 14).</summary>
public sealed class AuditService(IDataStore store, IClock clock)
{
    public void Record(User actor, string action, string entityType, string entityId, Guid? jobId = null,
        string details = "", Guid? onBehalfOf = null)
    {
        store.Audit.Upsert(new AuditEntry
        {
            At = clock.UtcNow,
            ActorId = actor.Id,
            ActorName = actor.Name,
            OnBehalfOfId = onBehalfOf,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            JobId = jobId,
            Details = details
        });
    }
}

/// <summary>E-poçt/SMS göndərişi simulyasiyası; real kanal gələndə bu interfeys dəyişdirilir.</summary>
public interface IOutbox
{
    void Enqueue(User recipient, string channel, string ev, string text);
}

public sealed class NullOutbox : IOutbox
{
    public void Enqueue(User recipient, string channel, string ev, string text) { }
}

/// <summary>Bildiriş qaydaları (TZ 12.3).</summary>
public sealed class NotificationService(IDataStore store, IClock clock, IOutbox outbox)
{
    public void Notify(Guid userId, string ev, string text, string? link = null, bool email = false, bool sms = false)
    {
        var user = store.Users.Find(userId);
        if (user is null || user.Blocked) return;
        store.Notifications.Upsert(new Notification
        {
            UserId = userId, Event = ev, Text = text, Link = link, CreatedAt = clock.UtcNow
        });
        if (email) outbox.Enqueue(user, "e-poçt", ev, text);
        if (sms) outbox.Enqueue(user, "SMS", ev, text);
    }

    public bool AlreadySent(Guid userId, string ev) =>
        store.Notifications.All().Any(n => n.UserId == userId && n.Event == ev);

    public IReadOnlyList<Notification> For(Guid userId) =>
        store.Notifications.All().Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToList();

    public int UnreadCount(Guid userId) =>
        store.Notifications.All().Count(n => n.UserId == userId && !n.Read);

    public void MarkAllRead(Guid userId)
    {
        foreach (var n in store.Notifications.All().Where(n => n.UserId == userId && !n.Read))
        {
            n.Read = true;
            store.Notifications.Upsert(n);
        }
    }

    public void MarkRead(Guid userId, Guid notificationId)
    {
        var n = store.Notifications.Find(notificationId);
        if (n is null || n.UserId != userId) return;
        n.Read = true;
        store.Notifications.Upsert(n);
    }
}
