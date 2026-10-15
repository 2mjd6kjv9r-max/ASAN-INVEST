using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

public sealed record ScenarioInfo(
    string Code, string GroupCode, InvestorKind Kind, Residency Residency,
    ProjectKind Project, EntryPath Path, string Title);

/// <summary>Dörd seçimdən 12 ssenarinin biri: H-R-0, H-Q-0, H-R-M-P, H-R-M-K, … F-Q-M-K.</summary>
public static class ScenarioResolver
{
    public static string GroupCode(InvestorKind kind, Residency residency, ProjectKind project) =>
        $"{(kind == InvestorKind.Legal ? 'H' : 'F')}-{(residency == Residency.Resident ? 'R' : 'Q')}-{(project == ProjectKind.New ? '0' : 'M')}";

    public static ScenarioInfo Resolve(InvestorKind kind, Residency residency, ProjectKind project, EntryPath path)
    {
        if (project == ProjectKind.New) path = EntryPath.None;
        else if (path == EntryPath.None) throw new ArgumentException("Mövcud layihə üçün yol (pay / kapital) seçilməlidir.");

        var group = GroupCode(kind, residency, project);
        var code = project == ProjectKind.New ? group : $"{group}-{(path == EntryPath.Share ? 'P' : 'K')}";
        return new ScenarioInfo(code, group, kind, residency, project, path, Title(kind, residency, project, path));
    }

    public static ScenarioInfo Resolve(JobAnswers a) => Resolve(a.Kind, a.Residency, a.Project, a.Path);

    public static string Title(InvestorKind kind, Residency residency, ProjectKind project, EntryPath path)
    {
        var k = kind == InvestorKind.Legal ? "Hüquqi şəxs" : "Fiziki şəxs";
        var r = kind == InvestorKind.Legal
            ? (residency == Residency.Resident ? "Rezident" : "Qeyri-rezident")
            : (residency == Residency.Resident ? "Vətəndaş" : "Əcnəbi");
        var p = project == ProjectKind.New ? "Sıfırdan" : $"Mövcud · {path.Of()}";
        return $"{k} · {r} · {p}";
    }

    public static IReadOnlyList<ScenarioInfo> All()
    {
        var list = new List<ScenarioInfo>();
        foreach (var kind in new[] { InvestorKind.Legal, InvestorKind.Natural })
            foreach (var res in new[] { Residency.Resident, Residency.NonResident })
            {
                list.Add(Resolve(kind, res, ProjectKind.New, EntryPath.None));
                list.Add(Resolve(kind, res, ProjectKind.Existing, EntryPath.Share));
                list.Add(Resolve(kind, res, ProjectKind.Existing, EntryPath.Capital));
            }
        return list;
    }
}
