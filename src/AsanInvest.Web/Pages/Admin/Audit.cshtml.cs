using AsanInvest.Web.Infrastructure;

namespace AsanInvest.Web.Pages.Admin;

public class AuditModel(Ctx ctx) : AppPage(ctx)
{
    public List<AuditEntry> Items { get; private set; } = new();
    public string? Q { get; private set; }
    public void OnGet(string? q)
    {
        Q = q;
        var all = P.Store.Audit.All().AsEnumerable();
        if (!string.IsNullOrWhiteSpace(q))
            all = all.Where(a => a.Action.Contains(q, StringComparison.OrdinalIgnoreCase) || a.ActorName.Contains(q, StringComparison.OrdinalIgnoreCase)
                                 || a.Details.Contains(q, StringComparison.OrdinalIgnoreCase) || a.EntityId.Contains(q, StringComparison.OrdinalIgnoreCase));
        Items = all.OrderByDescending(a => a.At).Take(300).ToList();
    }
}
