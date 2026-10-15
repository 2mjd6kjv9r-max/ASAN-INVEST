using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Coordinator;

public class JobModel(Ctx ctx) : AppPage(ctx)
{
    public JobView View { get; private set; } = null!;
    public InvestorProfile? Profile { get; private set; }
    public IReadOnlyList<Document> Docs { get; private set; } = new List<Document>();
    public IReadOnlyList<Message> Thread { get; private set; } = new List<Message>();

    public IActionResult OnGet(Guid id)
    {
        var job = P.Store.Jobs.Find(id);
        if (job is null || !P.Access.CanView(Me, job)) return NotFound();
        View = P.Jobs.Build(id);
        Profile = P.Store.Profiles.All().FirstOrDefault(p => p.UserId == job.InvestorUserId);
        Docs = P.Documents.ForJob(id).OrderByDescending(d => d.UploadedAt).ToList();
        Thread = P.Messages.Thread(Me, id);
        return Page();
    }

    public IActionResult OnPostReview(Guid id, Guid docId, bool accept, string? reason)
    {
        Do(() => P.Documents.Review(Me, docId, accept, reason), accept ? "Sənəd qəbul edildi." : "Düzəliş tələbi investora göndərildi.");
        return RedirectToPage(new { id });
    }

    public IActionResult OnPostForeign(Guid id, Guid docId)
    {
        Do(() => P.Documents.AdvanceForeign(Me, docId), "Xarici sənəd statusu yeniləndi.");
        return RedirectToPage(new { id });
    }

    public IActionResult OnPostMessage(Guid id, string text, bool isInternal)
    {
        Do(() => P.Messages.Post(Me, id, null, null, text, isInternal));
        return RedirectToPage(new { id });
    }
}
