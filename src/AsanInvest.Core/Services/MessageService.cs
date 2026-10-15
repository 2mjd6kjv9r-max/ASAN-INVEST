using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Services;

public sealed class MessageService(IDataStore store, IClock clock, AuditService audit, NotificationService notes, AccessService access)
{
    public Message Post(User author, Guid jobId, string? stageNumber, Guid? requestId, string text, bool isInternal)
    {
        lock (store.Gate)
        {
            text = (text ?? "").Trim();
            if (text.Length == 0) throw new ServiceException("Mesaj boşdur.");
            if (text.Length > 4000) throw new ServiceException("Mesaj çox uzundur (maksimum 4000 simvol).");
            var job = store.Jobs.Find(jobId) ?? throw new ServiceException("İş tapılmadı.");
            InstitutionRequest? req = requestId is null ? null : store.Requests.Find(requestId.Value);

            switch (author.Role)
            {
                case Role.InstitutionOfficer:
                    if (req is null || req.JobId != jobId || !access.CanViewRequest(author, req, job))
                        throw new ServiceException("Qurum əməkdaşı yalnız öz sorğusu daxilində yaza bilər.");
                    isInternal = false;
                    break;
                case Role.Coordinator:
                    if (job.CoordinatorId != author.Id) throw new ServiceException("İcazə yoxdur.");
                    break;
                case Role.Investor or Role.Representative:
                    if (!access.CanEdit(author, job)) throw new ServiceException("İcazə yoxdur.");
                    isInternal = false;
                    break;
                default:
                    throw new ServiceException("Mesaj yazmaq üçün icazə yoxdur.");
            }

            var msg = new Message
            {
                JobId = jobId, StageNumber = stageNumber, RequestId = requestId, AuthorId = author.Id,
                OnBehalfOf = access.OnBehalfOf(author, job), Text = text, Internal = isInternal, CreatedAt = clock.UtcNow
            };
            store.Messages.Upsert(msg);
            audit.Record(author, isInternal ? "message.internal" : "message.post", "Message", msg.Id.ToString(), jobId, "", msg.OnBehalfOf);

            var ev = $"message:{msg.Id}";
            if (!isInternal)
            {
                if (author.Role != Role.Investor && author.Role != Role.Representative)
                    notes.Notify(job.InvestorUserId, ev, $"Yeni mesaj: {job.Title}", $"/Investor/Messages?job={jobId}");
                if (author.Role != Role.Coordinator && job.CoordinatorId is { } c)
                    notes.Notify(c, ev, $"Yeni mesaj: {job.Title}", $"/Coordinator/Job/{jobId}");
                if (author.Role != Role.InstitutionOfficer && req is not null)
                    foreach (var o in store.Users.All().Where(u => u.Role == Role.InstitutionOfficer
                                 && string.Equals(u.InstitutionCode, req.InstitutionCode, StringComparison.OrdinalIgnoreCase)))
                        notes.Notify(o.Id, ev, $"Yeni mesaj: {req.Number}", $"/Officer/Request/{req.Id}");
            }
            return msg;
        }
    }

    /// <summary>Daxili qeydlər investora, nümayəndəyə və qurum əməkdaşına göstərilmir.</summary>
    public IReadOnlyList<Message> Thread(User viewer, Guid jobId, string? stageNumber = null, Guid? requestId = null)
    {
        var job = store.Jobs.Find(jobId);
        if (job is null) return new List<Message>();
        bool staff = viewer.Role is Role.Coordinator or Role.Admin;
        if (viewer.Role == Role.InstitutionOfficer)
        {
            var req = requestId is null ? null : store.Requests.Find(requestId.Value);
            if (req is null || !access.CanViewRequest(viewer, req, job)) return new List<Message>();
        }
        else if (!access.CanView(viewer, job)) return new List<Message>();

        return store.Messages.All().Where(m => m.JobId == jobId
                && (stageNumber is null || m.StageNumber == stageNumber)
                && (requestId is null || m.RequestId == requestId)
                && (viewer.Role != Role.InstitutionOfficer || m.RequestId == requestId)
                && (staff || !m.Internal))
            .OrderBy(m => m.CreatedAt).ToList();
    }
}
