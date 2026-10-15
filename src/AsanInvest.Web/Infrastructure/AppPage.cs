using AsanInvest.Core.Domain;
using AsanInvest.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AsanInvest.Web.Infrastructure;

public abstract class AppPage(Ctx ctx) : PageModel
{
    public Ctx C => ctx;
    public AsanInvest.Infrastructure.Platform P => ctx.P;
    public User Me => ctx.Me;

    /// <summary>Servis xətasını istifadəçiyə göstərilən mesaja çevirir (PRG).</summary>
    protected bool Do(Action action, string? okMessage = null)
    {
        try
        {
            action();
            if (okMessage is not null) TempData["ok"] = okMessage;
            return true;
        }
        catch (ServiceException e)
        {
            TempData["err"] = e.Message;
            return false;
        }
    }

    protected IActionResult Fail(string message)
    {
        TempData["err"] = message;
        return RedirectToPage("/Index");
    }
}
