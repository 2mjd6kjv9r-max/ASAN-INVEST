using AsanInvest.Core.Abstractions;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Officer;

public class RequestModel(Ctx ctx) : AppPage(ctx)
{
    public InstitutionRequest Req { get; private set; } = null!;
    public Job Job { get; private set; } = null!;
    public IReadOnlyList<SystemDataItem> SystemData { get; private set; } = new List<SystemDataItem>();
    public List<Document> Docs { get; private set; } = new();
    public IReadOnlyList<Message> Thread { get; private set; } = new List<Message>();
    public bool Open => Req.Status is RequestStatus.Sent or RequestStatus.UnderReview;

    public IActionResult OnGet(Guid id)
    {
        try { Req = P.Requests.Open(Me, id); }   // «Baxılır» statusuna keçirir
        catch (ServiceException) { return NotFound(); }
        Job = P.Store.Jobs.Find(Req.JobId)!;
        var profile = P.Store.Profiles.All().FirstOrDefault(p => p.UserId == Job.InvestorUserId);
        SystemData = P.Gateway.GetSystemData(Req, Job, profile);
        Docs = Req.DocumentIds.Select(d => P.Store.Documents.Find(d)).Where(d => d is not null).Select(d => d!).ToList();
        Thread = P.Messages.Thread(Me, Job.Id, null, Req.Id);
        return Page();
    }

    public async Task<IActionResult> OnPostDecideAsync(Guid id, RequestStatus decision, string? reason, IFormFile? result)
    {
        try
        {
            if (result is { Length: > 0 } && decision == RequestStatus.Approved)
            {
                var ms = new MemoryStream();
                await using (var s = result.OpenReadStream()) await s.CopyToAsync(ms);
                ms.Position = 0;
                P.Requests.Decide(Me, id, decision, reason, ms, result.FileName);
            }
            else P.Requests.Decide(Me, id, decision, reason);
            TempData["ok"] = "Qərar qeyd edildi və investora bildiriş göndərildi.";
        }
        catch (ServiceException e) { TempData["err"] = e.Message; }
        return RedirectToPage(new { id });
    }

    public IActionResult OnPostMessage(Guid id, string text)
    {
        var req = P.Store.Requests.Find(id);
        if (req is null) return NotFound();
        Do(() => P.Messages.Post(Me, req.JobId, null, id, text, false));
        return RedirectToPage(new { id });
    }
}
