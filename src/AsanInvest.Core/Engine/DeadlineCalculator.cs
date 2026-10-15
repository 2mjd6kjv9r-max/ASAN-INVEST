using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Engine;

public sealed record DeadlineInfo(
    string StageNumber, string Label, DateTime DueDate, int DaysLeft, DeadlineSeverity Severity, string RuleText);

public static class DeadlineCalculator
{
    public const int WarningDays = 7;

    public static DeadlineSeverity Severity(int daysLeft) =>
        daysLeft < 0 ? DeadlineSeverity.Overdue : daysLeft <= WarningDays ? DeadlineSeverity.Warning : DeadlineSeverity.Normal;

    public static DeadlineInfo? Compute(
        StageTemplate t, StageRun run, Func<string, StageRun?> runOf, bool paperChannel, DateTime today)
    {
        var rule = t.Deadline;
        if (rule is null) return null;

        var anchor = rule.AnchorStage is null ? run.AnchorDate : runOf(rule.AnchorStage)?.CompletedAt;
        if (anchor is null) return null;
        var start = anchor.Value.Date;

        var days = paperChannel && rule.PaperAmount.HasValue ? rule.PaperAmount.Value : rule.Amount;
        var due = rule.Unit == 'm' ? start.AddMonths(days) : start.AddDays(days);
        var left = (due.Date - today.Date).Days;
        var text = rule.Unit == 'm' ? $"{days} ay" : $"{days} gün";
        return new DeadlineInfo(t.Number, $"{t.Name} (Mərhələ {t.Number})", due, left, Severity(left), text);
    }
}
