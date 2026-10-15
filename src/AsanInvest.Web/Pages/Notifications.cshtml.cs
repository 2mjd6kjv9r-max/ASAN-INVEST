using AsanInvest.Core.Domain;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages;

public class NotificationsModel(Ctx ctx) : AppPage(ctx)
{
    public IReadOnlyList<Notification> Items { get; private set; } = new List<Notification>();
    public void OnGet() => Items = P.Notifications.For(Me.Id);

    public IActionResult OnPostReadAll()
    {
        P.Notifications.MarkAllRead(Me.Id);
        return RedirectToPage();
    }
}
