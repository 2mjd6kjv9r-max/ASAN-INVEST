using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Catalog;

public sealed record Institution(string Code, string Name, string Type, InstitutionChannel Channel);

public sealed class TaskTemplate
{
    /// <summary>«3» (üst bənd) və ya «3.2» (alt bənd).</summary>
    public string Key { get; set; } = "";
    public string Text { get; set; } = "";
    /// <summary>«İstəsə, …» ilə başlayan bənd məcburi sayılmır.</summary>
    public bool Optional { get; set; }
    public List<TaskTemplate> Children { get; set; } = new();

    public TaskTemplate Clone() => new()
    {
        Key = Key, Text = Text, Optional = Optional,
        Children = Children.Select(c => c.Clone()).ToList()
    };
}

/// <summary>«3m&lt;-1», «15d&lt;-manual», «15d/40d&lt;-manual».</summary>
public sealed class DeadlineRule
{
    public int Amount { get; init; }
    public char Unit { get; init; } = 'd';
    /// <summary>Xarici təsisçi ilə kağız müraciətdə tətbiq olunan fərqli müddət (gün).</summary>
    public int? PaperAmount { get; init; }
    /// <summary>Başlanğıc tarix hansı mərhələnin tamamlanmasıdır; null = əl ilə qeyd.</summary>
    public string? AnchorStage { get; init; }

    public static DeadlineRule? Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var parts = text.Split("<-", 2, StringSplitOptions.TrimEntries);
        if (parts.Length != 2) return null;
        var amounts = parts[0].Split('/', StringSplitOptions.TrimEntries);
        if (!TryAmount(amounts[0], out var amt, out var unit)) return null;
        int? paper = null;
        if (amounts.Length > 1 && TryAmount(amounts[1], out var p, out _)) paper = p;
        var anchor = parts[1].Equals("manual", StringComparison.OrdinalIgnoreCase) ? null : parts[1];
        return new DeadlineRule { Amount = amt, Unit = unit, PaperAmount = paper, AnchorStage = anchor };
    }

    private static bool TryAmount(string s, out int amount, out char unit)
    {
        amount = 0; unit = 'd';
        if (s.Length < 2) return false;
        unit = s[^1];
        return (unit is 'd' or 'm') && int.TryParse(s[..^1], out amount);
    }
}

public sealed class StageTemplate
{
    public string GroupCode { get; set; } = "";
    public string Number { get; set; } = "";
    public string Name { get; set; } = "";
    public StageKind Kind { get; set; }
    public StagePath Path { get; set; }
    public string Duration { get; set; } = "";
    public HashSet<string> Tags { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? Question { get; set; }
    public DeadlineRule? Deadline { get; set; }
    /// <summary>Kataloq (institutions.md) əsasında bu mərhələdə iştirak edən qurumlar.</summary>
    public List<string> InstitutionCodes { get; set; } = new();
    public List<TaskTemplate> Tasks { get; set; } = new();
    public List<string> Notes { get; set; } = new();

    public bool HasTag(string tag) => Tags.Contains(tag);
    public string Label => $"Mərhələ {Number}";
}

public sealed class GroupTemplate
{
    public string Code { get; set; } = "";
    public string Title { get; set; } = "";
    public List<StageTemplate> Stages { get; set; } = new();
    public StageTemplate? Stage(string number) =>
        Stages.FirstOrDefault(s => string.Equals(s.Number, number, StringComparison.OrdinalIgnoreCase));
}

public sealed class CatalogData
{
    public Dictionary<string, Institution> Institutions { get; } = new(StringComparer.OrdinalIgnoreCase);
    public List<string> InstitutionOrder { get; } = new();
    public Dictionary<string, GroupTemplate> Groups { get; } = new(StringComparer.OrdinalIgnoreCase);

    public GroupTemplate Group(string code) =>
        Groups.TryGetValue(code, out var g) ? g : throw new KeyNotFoundException($"Qrup tapılmadı: {code}");

    public Institution? Inst(string code) => Institutions.GetValueOrDefault(code);

    public string InstName(string code) => Institutions.TryGetValue(code, out var i) ? i.Name : code;

    /// <summary>Qurum nəyə görə iştirak edir: qrup → mərhələ nömrələri.</summary>
    public Dictionary<string, List<string>> StagesOfInstitution(string code)
    {
        var result = new Dictionary<string, List<string>>();
        foreach (var g in Groups.Values)
        {
            var nums = g.Stages.Where(s => s.InstitutionCodes.Contains(code, StringComparer.OrdinalIgnoreCase))
                .Select(s => s.Number).ToList();
            if (nums.Count > 0) result[g.Code] = nums;
        }
        return result;
    }
}
