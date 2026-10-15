using AsanInvest.Web.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Web.Pages.Admin;

public class StagesModel(Ctx ctx) : AppPage(ctx)
{
    public string Group { get; private set; } = "H-R-0";
    public List<string> Groups => P.Catalog.Groups.Keys.OrderBy(k => k).ToList();
    public AsanInvest.Core.Catalog.GroupTemplate Tpl => P.Catalog.Group(Group);
    public List<StageOverride> Overrides { get; private set; } = new();
    public IReadOnlyList<AsanInvest.Core.Engine.ScenarioInfo> Scenarios => ScenarioResolver.All();

    public void OnGet(string? group)
    {
        if (group is not null && P.Catalog.Groups.ContainsKey(group)) Group = P.Catalog.Groups[group].Code;
        Overrides = P.Store.Overrides.All().Where(o => o.GroupCode == Group).ToList();
    }

    public IActionResult OnPostChange(string group, string stage, string code, string op)
    {
        if (!P.Catalog.Groups.TryGetValue(group, out var g) || g.Stage(stage) is null || P.Catalog.Inst(code) is null)
        {
            TempData["err"] = "Yanlış qrup, mərhələ və ya qurum kodu.";
            return RedirectToPage(new { group });
        }
        var o = P.Store.Overrides.All().FirstOrDefault(x => x.GroupCode == g.Code && x.StageNumber == stage)
                ?? new StageOverride { GroupCode = g.Code, StageNumber = stage };
        o.AddCodes.Remove(code); o.RemoveCodes.Remove(code);
        (op == "add" ? o.AddCodes : o.RemoveCodes).Add(code);
        P.Store.Overrides.Upsert(o);
        P.Audit.Record(Me, "catalog.override", "Stage", $"{g.Code}:{stage}", null, $"{op} {code}");
        TempData["ok"] = "Dəyişiklik saxlanıldı. Yalnız YENİ işlərə tətbiq olunur; mövcud işlər dəyişmir.";
        return RedirectToPage(new { group });
    }

    public IActionResult OnPostClear(Guid id, string group)
    {
        P.Store.Overrides.Delete(id);
        P.Audit.Record(Me, "catalog.override-clear", "Stage", id.ToString());
        return RedirectToPage(new { group });
    }
}
