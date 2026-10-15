using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

public static class JobFactory
{
    /// <summary>Ssenarinin bütün mərhələlərini (keçilməyənlər də daxil olmaqla) iş üçün yaradır.</summary>
    public static List<StageRun> CreateStageRuns(
        CatalogData catalog, string groupCode, JobAnswers a, Guid jobId, IEnumerable<StageOverride> overrides)
    {
        var group = catalog.Group(groupCode);
        var ovr = overrides.Where(o => o.GroupCode.Equals(groupCode, StringComparison.OrdinalIgnoreCase)).ToList();
        var runs = new List<StageRun>();

        foreach (var t in group.Stages)
        {
            var codes = t.InstitutionCodes.ToList();
            foreach (var o in ovr.Where(o => o.StageNumber == t.Number))
            {
                foreach (var c in o.AddCodes) if (!codes.Contains(c, StringComparer.OrdinalIgnoreCase)) codes.Add(c);
                codes.RemoveAll(c => o.RemoveCodes.Contains(c, StringComparer.OrdinalIgnoreCase));
            }

            runs.Add(new StageRun
            {
                JobId = jobId,
                Number = t.Number,
                OnPath = StageEngine.IsOnPath(t, a.Path),
                Answer = InitialAnswer(t, a),
                InstitutionCodes = codes
            });
        }
        return runs;
    }

    private static bool? InitialAnswer(StageTemplate t, JobAnswers a)
    {
        bool? fromWizard =
            t.HasTag("construction") ? a.Construction :
            t.HasTag("foreignworker") ? a.ForeignWorker :
            t.HasTag("incentive") ? a.IncentiveDoc :
            t.HasTag("land") ? a.Land : null;

        return t.Kind switch
        {
            StageKind.Conditional => fromWizard,           // null = «bilmirəm», şərti qalır
            StageKind.Voluntary => fromWizard == true,     // könüllü mərhələ yalnız istəyəndə əlavə olunur
            _ => null
        };
    }
}
