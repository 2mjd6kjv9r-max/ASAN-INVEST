using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

public sealed record Recommendation(string Title, string Text, bool Warning);

/// <summary>Onboarding nəticəsində çıxan xəbərdarlıq kartları (TZ 3.3).</summary>
public static class Recommendations
{
    public static IReadOnlyList<Recommendation> For(JobAnswers a)
    {
        var list = new List<Recommendation>();

        if (a.Residency == Residency.NonResident && a.HasEsign == false)
            list.Add(new("Elektron imza yoxdur",
                "e-Təmsilçi və ya nümayəndə təyin edin; konsulluq vasitəsilə e-imza mexanizmi praktikada tətbiq edilmir.", true));

        if (a.Residency == Residency.NonResident)
            list.Add(new("Xarici sənədlər",
                "Xarici ölkədə verilmiş sənədlər üçün apostil (və ya leqallaşdırma) və notarial tərcümə çeklistindən istifadə edin.", false));

        if (a.Kind == InvestorKind.Natural && a.Residency == Residency.NonResident
            && a.Project == ProjectKind.Existing && a.Path == EntryPath.Share)
            list.Add(new("Təsisçi dəyişikliyi kağız qaydadadır",
                "Əcnəbi fiziki şəxsin pay alması ilə təsisçi dəyişikliyi kağız qaydada qeydiyyata alınır.", true));

        if (a.Project == ProjectKind.Existing)
            list.Add(new("Rəqabət orqanının razılığı",
                "Razılığın lazım olub-olmadığını yoxlamaq üçün dövriyyə hədlərini (25 mln, 35 mln, 15 / 5 mln manat və 20% bazar payı) nəzərdən keçirin.", false));

        return list;
    }
}
