using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

/// <summary>Mərhələnin aktivliyi və statusu (TZ 4.1 və 12.2 qaydaları). Təmiz funksiyalar, I/O yoxdur.</summary>
public static class StageEngine
{
    public const string TagAltChannel = "alt-channel";
    public const string TagCompetition = "competition";
    public const string TagNeedsCompetition = "needs-competition";
    public const string TagRegistryChange = "registry-change";

    public static bool IsOnPath(StageTemplate t, EntryPath path) => t.Path switch
    {
        StagePath.All => true,
        StagePath.Share => path == EntryPath.Share,
        StagePath.Capital => path == EntryPath.Capital,
        StagePath.Asc => false, // ASC halı 12 ssenaridə ayrıca yazılmayıb (açıq məsələ №7): mərhələ boz qalır
        _ => true
    };

    /// <summary>Mərhələ bu işdə fəal sayılır (statusu boz deyil).</summary>
    public static bool IsApplicable(StageTemplate t, StageRun r)
    {
        if (!r.OnPath) return false;
        if (t.Kind == StageKind.Conditional && r.Answer == false) return false;
        if (t.Kind == StageKind.Voluntary && r.Answer != true) return false;
        if (t.HasTag(TagAltChannel) && r.Answer == false) return false;
        return true;
    }

    public static IReadOnlyList<TaskTemplate> RequiredTasks(StageTemplate t) =>
        t.Tasks.Where(x => !x.Optional).ToList();

    public static bool AllMandatoryTasksDone(StageTemplate t, ISet<string> doneKeys) =>
        RequiredTasks(t).All(x => doneKeys.Contains(x.Key));

    public static (int Done, int Total) TaskProgress(StageTemplate t, ISet<string> doneKeys) =>
        (RequiredTasks(t).Count(x => doneKeys.Contains(x.Key)), RequiredTasks(t).Count);

    /// <summary>Yenidən göndərilmə / yeni sorğu ilə əvəz olunmuş köhnə sorğular nəzərə alınmır.</summary>
    public static IReadOnlyList<InstitutionRequest> CurrentRequests(IEnumerable<InstitutionRequest> requests)
    {
        var all = requests.ToList();
        var superseded = all.Where(r => r.Supersedes.HasValue).Select(r => r.Supersedes!.Value).ToHashSet();
        return all.Where(r => !superseded.Contains(r.Id)).ToList();
    }

    public static StageStatus Status(
        StageTemplate t, StageRun r, ISet<string> doneKeys,
        IEnumerable<InstitutionRequest> stageRequests, bool deadlineOverdue)
    {
        if (!r.OnPath) return StageStatus.NotOnPath;
        if (t.Kind == StageKind.Conditional && r.Answer == false) return StageStatus.NotApplicable;
        if (t.HasTag(TagAltChannel) && r.Answer == false) return StageStatus.NotApplicable;
        if (t.Kind == StageKind.Voluntary && r.Answer != true) return StageStatus.NotAdded;

        var reqs = CurrentRequests(stageRequests);
        if (reqs.Any(x => x.Status is RequestStatus.MoreDocsRequired or RequestStatus.Rejected) || deadlineOverdue)
            return StageStatus.NeedsAttention;
        if (reqs.Any(x => x.Status is RequestStatus.Sent or RequestStatus.UnderReview))
            return StageStatus.AtInstitution;

        var tasksDone = AllMandatoryTasksDone(t, doneKeys);
        var requestsDone = reqs.All(x => x.Status == RequestStatus.Approved);
        var hasProgress = doneKeys.Count > 0 || reqs.Any(x => x.Status == RequestStatus.Approved);
        if (tasksDone && requestsDone && hasProgress) return StageStatus.Completed;
        if (doneKeys.Count > 0 || reqs.Count > 0) return StageStatus.InProgress;
        return StageStatus.NotStarted;
    }

    /// <summary>Rəqabət orqanının razılığı tələb olunub, amma alınmayıbsa notarial müqavilə / reyestr mərhələləri bloklanır (TZ 12.4).</summary>
    public static string? BlockReason(
        StageTemplate t, IEnumerable<(StageTemplate Template, StageRun Run, StageStatus Status)> all)
    {
        if (!t.HasTag(TagNeedsCompetition)) return null;
        var pending = all.Any(x => x.Template.HasTag(TagCompetition)
                                   && x.Run.Answer == true
                                   && x.Status != StageStatus.Completed);
        return pending ? "Razılıq alınana qədər pay notariusda keçirilmir və kapital artımı qeydiyyata verilmir." : null;
    }

    /// <summary>Xarici təsisçi ilə pay alınmasında reyestr dəyişikliyi yalnız kağız qaydada aparılır (TZ 12.4).</summary>
    public static RequestChannel ChannelFor(StageTemplate t, JobAnswers a, InstitutionChannel institutionChannel)
    {
        if (t.HasTag(TagRegistryChange) && a.Residency == Residency.NonResident && a.Path == EntryPath.Share)
            return RequestChannel.Paper;
        if (t.HasTag(TagAltChannel) && t.Number.EndsWith(".2")) return RequestChannel.Paper;
        return institutionChannel == InstitutionChannel.Paper ? RequestChannel.Paper : RequestChannel.Electronic;
    }
}
