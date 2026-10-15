using AsanInvest.Core.Catalog;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Stage;

/// <summary>Mərhələ səhifəsi: investor, nümayəndə və koordinator üçün eyni görünüş (rola uyğun düymələrlə).</summary>
public class IndexModel(Ctx ctx) : AppPage(ctx)
{
    public Job Job { get; private set; } = null!;
    public JobView View { get; private set; } = null!;
    public StageView S { get; private set; } = null!;
    public bool CanEdit { get; private set; }
    public bool IsCoordinator => Me.Role == Role.Coordinator;
    public string Tab { get; private set; } = "tasks";
    public IReadOnlyList<Document> Docs { get; private set; } = new List<Document>();
    public IReadOnlyList<Document> AllDocs { get; private set; } = new List<Document>();
    public IReadOnlyList<Message> Thread { get; private set; } = new List<Message>();
    public List<AuditEntry> History { get; private set; } = new();
    public string[] DocTypes => DocumentService.Types;

    private bool Load(Guid jobId, string number)
    {
        var job = P.Store.Jobs.Find(jobId);
        if (job is null || !P.Access.CanView(Me, job)) return false;
        Job = job;
        View = P.Jobs.Build(jobId);
        var s = View.Stage(number);
        if (s is null) return false;
        S = s;
        CanEdit = P.Access.CanEdit(Me, job);
        return true;
    }

    public IActionResult OnGet(Guid jobId, string number, string? tab)
    {
        if (!Load(jobId, number)) return NotFound();
        Tab = tab is "docs" or "institutions" or "messages" or "history" ? tab : "tasks";
        AllDocs = P.Documents.ForJob(jobId);
        Docs = AllDocs.Where(d => d.StageNumbers.Contains(number)).ToList();
        Thread = P.Messages.Thread(Me, jobId, number);
        var reqNumbers = S.AllRequests.Select(r => r.Number).ToHashSet();
        History = P.Store.Audit.All().Where(a => a.JobId == jobId &&
                (a.EntityId == number || a.EntityId.StartsWith(number + "/") || reqNumbers.Contains(a.EntityId)))
            .OrderByDescending(a => a.At).Take(40).ToList();
        return Page();
    }

    private IActionResult Back(Guid jobId, string number, string tab) =>
        RedirectToPage(new { jobId, number, tab });

    public IActionResult OnPostTask(Guid jobId, string number, string key, bool done)
    {
        Do(() => P.Jobs.SetTask(Me, jobId, number, key, done));
        return Back(jobId, number, "tasks");
    }

    public IActionResult OnPostAnswer(Guid jobId, string number, bool answer)
    {
        Do(() => P.Jobs.Answer(Me, jobId, number, answer));
        return Back(jobId, number, "tasks");
    }

    public IActionResult OnPostReady(Guid jobId, string number, bool ready)
    {
        Do(() => P.Jobs.SetReady(Me, jobId, number, ready), ready ? "Mərhələ koordinatora göndərməyə hazır kimi işarələndi." : null);
        return Back(jobId, number, "tasks");
    }

    public IActionResult OnPostAnchor(Guid jobId, string number, DateTime date)
    {
        Do(() => P.Jobs.SetAnchorDate(Me, jobId, number, date), "Başlanğıc tarix saxlanıldı.");
        return Back(jobId, number, "tasks");
    }

    public async Task<IActionResult> OnPostUploadAsync(Guid jobId, string number, IFormFile? file, string type,
        string? country, DateTime? validUntil)
    {
        if (file is null || file.Length == 0) TempData["err"] = "Fayl seçilməyib.";
        else
        {
            try
            {
                await using var s = file.OpenReadStream();
                var ms = new MemoryStream();
                await s.CopyToAsync(ms);
                ms.Position = 0;
                P.Documents.Upload(Me, jobId, ms, file.FileName, type, country, new[] { number }, validUntil);
                TempData["ok"] = "Sənəd yükləndi.";
            }
            catch (ServiceException e) { TempData["err"] = e.Message; }
        }
        return Back(jobId, number, "docs");
    }

    public IActionResult OnPostLink(Guid jobId, string number, Guid docId)
    {
        Do(() => P.Documents.LinkToStage(Me, docId, number), "Sənəd mərhələyə bağlandı.");
        return Back(jobId, number, "docs");
    }

    public IActionResult OnPostSend(Guid jobId, string number, string[] codes, string requestType)
    {
        Do(() => P.Requests.CreateAndSend(Me, jobId, number, codes ?? Array.Empty<string>(), requestType), "Sorğu qurumlara göndərildi.");
        return Back(jobId, number, "institutions");
    }

    public IActionResult OnPostResubmit(Guid jobId, string number, Guid requestId)
    {
        Do(() => P.Requests.Resubmit(Me, requestId), "Sorğu yenidən göndərildi.");
        return Back(jobId, number, "institutions");
    }

    public IActionResult OnPostMessage(Guid jobId, string number, string text, bool isInternal)
    {
        Do(() => P.Messages.Post(Me, jobId, number, null, text, isInternal));
        return Back(jobId, number, "messages");
    }
}
