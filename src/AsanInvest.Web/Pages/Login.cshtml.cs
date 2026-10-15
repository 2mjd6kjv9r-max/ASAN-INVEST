using System.Security.Claims;
using AsanInvest.Infrastructure;
using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.RateLimiting;

namespace AsanInvest.Web.Pages;

[EnableRateLimiting("login")]
public class LoginModel(Platform platform, WebOptions options) : PageModel
{
    public bool DemoEnabled => options.Demo;
    public List<User> DemoUsers { get; private set; } = new();

    public void OnGet() => Load();

    private void Load() =>
        DemoUsers = DemoEnabled
            ? platform.Store.Users.All().Where(u => u.IsDemo && !u.Blocked).OrderBy(u => u.Role).ThenBy(u => u.Name).ToList()
            : new();

    // Demo giriş yalnız AsanInvest:Demo=true olduqda mövcuddur. İstehsalda burada ASAN Login callback-i olacaq.
    public async Task<IActionResult> OnPostDemoAsync(Guid userId)
    {
        if (!DemoEnabled) return NotFound();
        var user = platform.Store.Users.Find(userId);
        if (user is null || user.Blocked || !user.IsDemo)
        {
            TempData["err"] = "İstifadəçi tapılmadı.";
            return RedirectToPage();
        }
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        }, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(new ClaimsPrincipal(identity));
        Response.Cookies.Delete(Ctx.JobCookie);
        platform.Audit.Record(user, "auth.login", "User", user.Id.ToString());
        return RedirectToPage("/Index");
    }
}
