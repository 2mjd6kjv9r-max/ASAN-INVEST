using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;
using AsanInvest.Core.Engine;

namespace AsanInvest.Core.Services;

public sealed class RequestService(
    IDataStore store, CatalogData catalog, IClock clock, IInstitutionGateway gateway,
    AuditService audit, NotificationService notes, AccessService access,
    JobService jobs, DocumentService documents, SettingsService settings)
{
    /// <summary>Koordinator seçilmiş qurumlara sorğu yaradır və göndərir. Mərhələnin sənədləri avtomatik əlavə olunur (TZ 7.2).</summary>
    public IReadOnlyList<InstitutionRequest> CreateAndSend(
        User coordinator, Guid jobId, string stageNumber, IEnumerable<string> institutionCodes, string requestType)
    {
        lock (store.Gate)
        {
            var job = store.Jobs.Find(jobId) ?? throw new ServiceException("İş tapılmadı.");
            if (coordinator.Role != Role.Coordinator || job.CoordinatorId != coordinator.Id || job.Closed)
                throw new ServiceException("Sorğunu yalnız işə təyin olunmuş koordinator göndərə bilər.");
            if (string.IsNullOrWhiteSpace(requestType)) throw new ServiceException("Sorğu növü göstərilməlidir.");

            var view = jobs.Build(jobId);
            var stage = view.Stage(stageNumber) ?? throw new ServiceException("Mərhələ tapılmadı.");
            if (!stage.Applicable) throw new ServiceException("Mərhələ fəal deyil.");
            if (stage.BlockReason is not null) throw new ServiceException(stage.BlockReason);
            if (!stage.Run.ReadyToSend) throw new ServiceException("İnvestor mərhələni göndərməyə hazır kimi işarələməyib.");

            var codes = institutionCodes.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (codes.Count == 0) throw new ServiceException("Ən azı bir qurum seçilməlidir.");
            foreach (var c in codes)
                if (!stage.Run.InstitutionCodes.Contains(c, StringComparer.OrdinalIgnoreCase))
                    throw new ServiceException($"«{catalog.InstName(c)}» bu mərhələdə iştirak etmir.");

            var docs = store.Documents.All()
                .Where(d => d.JobId == jobId && d.ResultOfRequestId is null && d.StageNumbers.Contains(stageNumber)).ToList();
            var expired = docs.FirstOrDefault(documents.IsExpired);
            if (expired is not null)
                throw new ServiceException($"Sənədin etibarlılıq müddəti bitib: {expired.FileName}. Sorğu göndərilə bilməz.");
            var bad = docs.FirstOrDefault(d => d.Review == ReviewStatus.ChangesRequested);
            if (bad is not null)
                throw new ServiceException($"Sənəd üçün düzəliş tələb olunub və hələ düzəldilməyib: {bad.FileName}.");

            var created = new List<InstitutionRequest>();
            foreach (var code in codes)
            {
                var inst = catalog.Inst(code);
                var existing = stage.AllRequests.Where(r => r.InstitutionCode.Equals(code, StringComparison.OrdinalIgnoreCase)
                                                            && r.Type.Equals(requestType.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
                var current = StageEngine.CurrentRequests(existing).FirstOrDefault();
                if (current is not null && current.Status != RequestStatus.Rejected)
                    throw new ServiceException($"«{catalog.InstName(code)}» üçün bu növ sorğu artıq mövcuddur ({current.Status.Of()}).");

                var req = new InstitutionRequest
                {
                    Number = NextNumber(),
                    JobId = jobId,
                    StageNumber = stageNumber,
                    InstitutionCode = code,
                    Type = requestType.Trim(),
                    Channel = StageEngine.ChannelFor(stage.Template, job.Answers, inst?.Channel ?? InstitutionChannel.Unknown),
                    Supersedes = current?.Id,
                    DocumentIds = docs.Select(d => d.Id).ToList(),
                    CreatedBy = coordinator.Id,
                    CreatedAt = clock.UtcNow,
                    UpdatedAt = clock.UtcNow
                };
                store.Requests.Upsert(req);
                Transition(coordinator, req, RequestStatus.Sent, null);
                req.SentAt = clock.UtcNow;
                req.DueAt = clock.UtcNow.AddDays(settings.GetInt(SettingsService.ResponseNormDays));
                var receipt = gateway.Dispatch(req, job, docs);
                req.GatewayReference = receipt.Reference;
                req.Simulated = receipt.Simulated;
                store.Requests.Upsert(req);
                created.Add(req);

                audit.Record(coordinator, "request.send", "Request", req.Number, jobId, $"{code} · {req.Type} · {req.Channel.Of()}");
                foreach (var officer in store.Users.All().Where(u => u.Role == Role.InstitutionOfficer && !u.Blocked
                             && string.Equals(u.InstitutionCode, code, StringComparison.OrdinalIgnoreCase)))
                    notes.Notify(officer.Id, $"request-new:{req.Id}", $"Yeni sorğu daxil oldu: {req.Number} ({req.Type})",
                        $"/Officer/Request/{req.Id}", email: true);
            }
            jobs.Refresh(jobId, coordinator);
            return created;
        }
    }

    /// <summary>Qurum əməkdaşı sorğunu açanda status «Baxılır» olur.</summary>
    public InstitutionRequest Open(User officer, Guid requestId)
    {
        lock (store.Gate)
        {
            var req = LoadFor(officer, requestId);
            if (req.Status == RequestStatus.Sent)
            {
                Transition(officer, req, RequestStatus.UnderReview, null);
                store.Requests.Upsert(req);
                audit.Record(officer, "request.open", "Request", req.Number, req.JobId);
                jobs.Refresh(req.JobId, officer);
            }
            return req;
        }
    }

    public void Decide(User officer, Guid requestId, RequestStatus decision, string? reason,
        Stream? resultFile = null, string? resultFileName = null)
    {
        lock (store.Gate)
        {
            if (decision is not (RequestStatus.Approved or RequestStatus.MoreDocsRequired or RequestStatus.Rejected))
                throw new ServiceException("Yanlış qərar.");
            var req = LoadFor(officer, requestId);
            if (req.Status == RequestStatus.Sent) Transition(officer, req, RequestStatus.UnderReview, null);
            Transition(officer, req, decision, reason);

            req.DecisionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
            if (decision == RequestStatus.Approved && resultFile is not null)
            {
                var doc = documents.UploadResult(officer, req, resultFile, resultFileName ?? "netice.pdf");
                req.ResultDocumentId = doc.Id;
            }
            store.Requests.Upsert(req);

            var job = store.Jobs.Find(req.JobId)!;
            audit.Record(officer, $"request.{decision.ToString().ToLowerInvariant()}", "Request", req.Number, req.JobId, req.DecisionReason ?? "");
            var text = $"{catalog.InstName(req.InstitutionCode)}: {req.Number} — {decision.Of()}" +
                       (req.DecisionReason is null ? "" : $" ({req.DecisionReason})");
            var ev = $"request-decision:{req.Id}:{clock.UtcNow.Ticks}";
            notes.Notify(job.InvestorUserId, ev, text, $"/Investor/Stage/{req.StageNumber}?tab=institutions", email: true);
            if (job.CoordinatorId is { } c) notes.Notify(c, ev, text, $"/Coordinator/Job/{job.Id}", email: true);
            jobs.Refresh(req.JobId, officer);
        }
    }

    /// <summary>«Əlavə sənəd tələb olunur» statusunda investor yeni sənəd yükləyəndən sonra sorğu yenidən göndərilir.</summary>
    public void Resubmit(User actor, Guid requestId)
    {
        lock (store.Gate)
        {
            var req = store.Requests.Find(requestId) ?? throw new ServiceException("Sorğu tapılmadı.");
            var job = store.Jobs.Find(req.JobId)!;
            if (!access.CanEdit(actor, job)) throw new ServiceException("İcazə yoxdur.");
            if (req.Status != RequestStatus.MoreDocsRequired) throw new ServiceException("Sorğu əlavə sənəd gözləmir.");

            var fresh = store.Documents.All().Where(d => d.JobId == job.Id && d.ResultOfRequestId is null
                    && d.UploadedAt > req.UpdatedAt && d.StageNumbers.Contains(req.StageNumber)
                    && !req.DocumentIds.Contains(d.Id)).ToList();
            if (fresh.Count == 0) throw new ServiceException("Əvvəlcə tələb olunan sənədi bu mərhələyə yükləyin.");
            var expired = fresh.FirstOrDefault(documents.IsExpired);
            if (expired is not null) throw new ServiceException($"Sənədin etibarlılıq müddəti bitib: {expired.FileName}.");

            Transition(actor, req, RequestStatus.Sent, null);
            req.ResubmissionCount++;
            req.DocumentIds.AddRange(fresh.Select(d => d.Id));
            req.DecisionReason = null;
            req.SentAt = clock.UtcNow;
            req.DueAt = clock.UtcNow.AddDays(settings.GetInt(SettingsService.ResponseNormDays));
            store.Requests.Upsert(req);

            audit.Record(actor, "request.resubmit", "Request", req.Number, job.Id, $"#{req.ResubmissionCount}", access.OnBehalfOf(actor, job));
            foreach (var officer in store.Users.All().Where(u => u.Role == Role.InstitutionOfficer && !u.Blocked
                         && string.Equals(u.InstitutionCode, req.InstitutionCode, StringComparison.OrdinalIgnoreCase)))
                notes.Notify(officer.Id, $"request-resent:{req.Id}:{req.ResubmissionCount}",
                    $"Sorğu yenidən göndərildi: {req.Number}", $"/Officer/Request/{req.Id}", email: true);
            jobs.Refresh(job.Id, actor);
        }
    }

    public bool IsLate(InstitutionRequest r) =>
        RequestStateMachine.IsOpen(r.Status) && r.Status != RequestStatus.MoreDocsRequired
        && r.DueAt.HasValue && r.DueAt.Value < clock.UtcNow;

    public IReadOnlyList<InstitutionRequest> InboxFor(User officer) =>
        string.IsNullOrEmpty(officer.InstitutionCode) ? new List<InstitutionRequest>() :
        store.Requests.All().Where(r => r.InstitutionCode.Equals(officer.InstitutionCode, StringComparison.OrdinalIgnoreCase))
            .Where(r => r.Status != RequestStatus.Draft)
            .OrderByDescending(r => r.UpdatedAt).ToList();

    // ---------------------------------------------------------------- daxili

    private InstitutionRequest LoadFor(User officer, Guid requestId)
    {
        var req = store.Requests.Find(requestId) ?? throw new ServiceException("Sorğu tapılmadı.");
        var job = store.Jobs.Find(req.JobId)!;
        if (officer.Role != Role.InstitutionOfficer || !access.CanViewRequest(officer, req, job))
            throw new ServiceException("Bu sorğu sizin qurumunuza aid deyil.");
        return req;
    }

    private void Transition(User actor, InstitutionRequest req, RequestStatus to, string? reason)
    {
        var check = RequestStateMachine.CanTransition(req.Status, to, actor.Role, reason);
        if (!check.Ok) throw new ServiceException(check.Error!);
        req.Status = to;
        req.UpdatedAt = clock.UtcNow;
    }

    private string NextNumber() => $"SOR-{clock.Today.Year}-{store.Requests.All().Count + 1:0000}";
}
