using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Investor;

public class MessagesModel(Ctx ctx) : AppPage(ctx)
{
    public Job? Job { get; private set; }
    public IReadOnlyList<Message> Thread { get; private set; } = new List<Message>();
    public bool CanEdit { get; private set; }

    public IActionResult OnGet()
    {
        if (C.CurrentJob is not { } job) return RedirectToPage("Onboarding");
        Job = job;
        Thread = P.Messages.Thread(Me, job.Id);
        CanEdit = P.Access.CanEdit(Me, job);
        return Page();
    }

    public IActionResult OnPost(string text)
    {
        if (C.CurrentJob is { } job) Do(() => P.Messages.Post(Me, job.Id, null, null, text, false));
        return RedirectToPage();
    }
}
