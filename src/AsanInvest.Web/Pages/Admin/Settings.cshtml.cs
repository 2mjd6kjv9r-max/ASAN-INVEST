using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Admin;

public class SettingsModel(Ctx ctx) : AppPage(ctx)
{
    public int MaxMb, NormDays;
    public void OnGet() { MaxMb = P.Settings.GetInt(SettingsService.MaxFileMb); NormDays = P.Settings.GetInt(SettingsService.ResponseNormDays); }

    public IActionResult OnPost(int maxMb, int normDays)
    {
        if (maxMb is < 1 or > 10) { TempData["err"] = "Fayl həddi 1–10 MB arasında olmalıdır (server limiti 12 MB)."; return RedirectToPage(); }
        if (normDays is < 1 or > 60) { TempData["err"] = "Cavab normu 1–60 gün arasında olmalıdır."; return RedirectToPage(); }
        P.Settings.Set(SettingsService.MaxFileMb, maxMb.ToString());
        P.Settings.Set(SettingsService.ResponseNormDays, normDays.ToString());
        P.Audit.Record(Me, "settings.update", "Settings", "global", null, $"MaxFileMb={maxMb}, ResponseNormDays={normDays}");
        TempData["ok"] = "Parametrlər saxlanıldı.";
        return RedirectToPage();
    }
}
