using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Services;

public sealed class DocumentService(
    IDataStore store, CatalogData catalog, IClock clock, IFileStorage files,
    AuditService audit, NotificationService notes, AccessService access, SettingsService settings)
{
    public static readonly string[] Types =
    {
        "Pasport / şəxsiyyət vəsiqəsi", "Reyestr çıxarışı", "Nizamnamə", "Qeydiyyat şəhadətnaməsi", "Etibarnamə",
        "Bank sənədi", "Müqavilə", "Qərar / protokol", "Arayış", "Biznes plan",
        "Apostilli xarici sənəd", "Notarial tərcümə", "Digər"
    };

    private static readonly Dictionary<string, (string Mime, byte[] Magic)> Allowed = new()
    {
        [".pdf"] = ("application/pdf", "%PDF-"u8.ToArray()),
        [".jpg"] = ("image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF }),
        [".jpeg"] = ("image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF }),
        [".png"] = ("image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })
    };

    public const string HomeCountry = "Azərbaycan";

    public Document Upload(User actor, Guid jobId, Stream content, string originalName, string type,
        string? country, IEnumerable<string>? stageNumbers, DateTime? validUntil)
    {
        var job = store.Jobs.Find(jobId) ?? throw new ServiceException("İş tapılmadı.");
        if (!access.CanEdit(actor, job)) throw new ServiceException("Sənəd yükləmək üçün icazəniz yoxdur.");
        var doc = Save(actor, job, content, originalName, type, country, stageNumbers, validUntil, null);
        audit.Record(actor, "document.upload", "Document", doc.Id.ToString(), jobId, doc.FileName, access.OnBehalfOf(actor, job));
        return doc;
    }

    /// <summary>Qurumun nəticə sənədi (şəhadətnamə, arayış): yalnız sorğu qərarı ilə birlikdə çağırılır.</summary>
    public Document UploadResult(User officer, InstitutionRequest request, Stream content, string originalName)
    {
        var job = store.Jobs.Find(request.JobId) ?? throw new ServiceException("İş tapılmadı.");
        var doc = Save(officer, job, content, originalName, "Nəticə sənədi", null, new[] { request.StageNumber }, null, request.Id);
        doc.Review = ReviewStatus.Accepted;
        store.Documents.Upsert(doc);
        return doc;
    }

    private Document Save(User actor, Job job, Stream content, string originalName, string type, string? country,
        IEnumerable<string>? stageNumbers, DateTime? validUntil, Guid? resultOf)
    {
        var name = SanitizeName(originalName);
        var ext = Path.GetExtension(name).ToLowerInvariant();
        if (!Allowed.TryGetValue(ext, out var rule))
            throw new ServiceException("Yalnız PDF, JPG və PNG faylları qəbul olunur.");

        var maxBytes = (long)settings.GetInt(SettingsService.MaxFileMb) * 1024 * 1024;
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = content.Read(chunk, 0, chunk.Length)) > 0)
        {
            buffer.Write(chunk, 0, read);
            if (buffer.Length > maxBytes)
                throw new ServiceException($"Fayl ölçüsü limiti aşıldı (maksimum {settings.GetInt(SettingsService.MaxFileMb)} MB).");
        }
        if (buffer.Length == 0) throw new ServiceException("Fayl boşdur.");

        var bytes = buffer.GetBuffer();
        if (buffer.Length < rule.Magic.Length || !bytes.AsSpan(0, rule.Magic.Length).SequenceEqual(rule.Magic))
            throw new ServiceException("Faylın məzmunu seçilmiş formata (" + ext + ") uyğun gəlmir.");

        buffer.Position = 0;
        var stored = files.Save(buffer, ext);

        var group = catalog.Group(job.GroupCode);
        var stages = (stageNumbers ?? Array.Empty<string>())
            .Where(n => group.Stage(n) is not null).Distinct().ToList();
        var foreign = !string.IsNullOrWhiteSpace(country) && !country.Trim().Equals(HomeCountry, StringComparison.OrdinalIgnoreCase);

        var doc = new Document
        {
            JobId = job.Id,
            Type = Types.Contains(type) || resultOf is not null ? type : "Digər",
            FileName = name,
            StoredName = stored,
            ContentType = rule.Mime,
            Size = buffer.Length,
            SourceCountry = country?.Trim() ?? "",
            Foreign = foreign ? ForeignDocStatus.Uploaded : ForeignDocStatus.NotForeign,
            ValidUntil = validUntil?.Date,
            UploadedBy = actor.Id,
            UploadedAt = clock.UtcNow,
            StageNumbers = stages,
            ResultOfRequestId = resultOf
        };
        store.Documents.Upsert(doc);
        return doc;
    }

    public static string SanitizeName(string? raw)
    {
        var name = Path.GetFileName((raw ?? "").Replace('\\', '/'));
        name = new string(name.Where(c => !char.IsControl(c) && c is not ('<' or '>' or '"' or '|' or '?' or '*' or ':')).ToArray()).Trim();
        if (name.Length > 120) name = name[^120..];
        return string.IsNullOrWhiteSpace(name) ? "sened" : name;
    }

    public IReadOnlyList<Document> ForJob(Guid jobId) =>
        store.Documents.All().Where(d => d.JobId == jobId && d.ResultOfRequestId is null)
            .OrderByDescending(d => d.UploadedAt).ToList();

    public bool IsExpired(Document d) => d.ValidUntil.HasValue && d.ValidUntil.Value.Date < clock.Today;

    public void LinkToStage(User actor, Guid docId, string stageNumber)
    {
        var doc = store.Documents.Find(docId) ?? throw new ServiceException("Sənəd tapılmadı.");
        var job = store.Jobs.Find(doc.JobId)!;
        if (!access.CanEdit(actor, job)) throw new ServiceException("İcazə yoxdur.");
        if (catalog.Group(job.GroupCode).Stage(stageNumber) is null) throw new ServiceException("Mərhələ tapılmadı.");
        if (!doc.StageNumbers.Contains(stageNumber)) doc.StageNumbers.Add(stageNumber);
        store.Documents.Upsert(doc);
        audit.Record(actor, "document.link", "Document", doc.Id.ToString(), job.Id, $"Mərhələ {stageNumber}", access.OnBehalfOf(actor, job));
    }

    /// <summary>Koordinator sənədi «Qəbul» və ya «Düzəliş tələb et» (səbəb məcburi) edir (TZ 7.2).</summary>
    public void Review(User coordinator, Guid docId, bool accept, string? reason)
    {
        var doc = store.Documents.Find(docId) ?? throw new ServiceException("Sənəd tapılmadı.");
        var job = store.Jobs.Find(doc.JobId)!;
        if (coordinator.Role != Role.Coordinator || job.CoordinatorId != coordinator.Id)
            throw new ServiceException("Sənədi yalnız təyin olunmuş koordinator yoxlaya bilər.");
        if (!accept && string.IsNullOrWhiteSpace(reason)) throw new ServiceException("Düzəliş üçün səbəb göstərilməlidir.");

        doc.Review = accept ? ReviewStatus.Accepted : ReviewStatus.ChangesRequested;
        doc.ReviewReason = accept ? null : reason!.Trim();
        store.Documents.Upsert(doc);
        audit.Record(coordinator, accept ? "document.accept" : "document.changes", "Document", doc.Id.ToString(), job.Id, doc.ReviewReason ?? "");
        if (!accept)
            notes.Notify(job.InvestorUserId, $"doc-changes:{doc.Id}:{clock.UtcNow.Ticks}",
                $"Sənəd üçün düzəliş tələb olunur: {doc.FileName} — {doc.ReviewReason}", "/Investor/Documents", email: true);
    }

    /// <summary>Xarici sənədin statusu: Yükləndi → Apostil təsdiqləndi → Tərcümə notarial təsdiqləndi.</summary>
    public void AdvanceForeign(User coordinator, Guid docId)
    {
        var doc = store.Documents.Find(docId) ?? throw new ServiceException("Sənəd tapılmadı.");
        var job = store.Jobs.Find(doc.JobId)!;
        if (coordinator.Role != Role.Coordinator || job.CoordinatorId != coordinator.Id)
            throw new ServiceException("İcazə yoxdur.");
        doc.Foreign = doc.Foreign switch
        {
            ForeignDocStatus.Uploaded => ForeignDocStatus.ApostilleConfirmed,
            ForeignDocStatus.ApostilleConfirmed => ForeignDocStatus.TranslationConfirmed,
            _ => throw new ServiceException("Bu sənəd üçün növbəti status yoxdur.")
        };
        store.Documents.Upsert(doc);
        audit.Record(coordinator, "document.foreign", "Document", doc.Id.ToString(), job.Id, doc.Foreign.ToString());
    }

    public (Document Doc, Stream Content) Open(User user, Guid docId)
    {
        var doc = store.Documents.Find(docId) ?? throw new ServiceException("Sənəd tapılmadı.");
        if (!access.CanViewDocument(user, doc)) throw new ServiceException("Bu sənədə baxmaq üçün icazəniz yoxdur.");
        return (doc, files.Open(doc.StoredName));
    }
}
