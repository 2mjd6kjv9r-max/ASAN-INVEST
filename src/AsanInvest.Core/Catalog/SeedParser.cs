using AsanInvest.Core.Domain;

namespace AsanInvest.Core.Catalog;

/// <summary>seed/*.md fayllarını (layihə sənədlərindən köçürülmüş cədvəllər) oxuyur.</summary>
public static class SeedParser
{
    public static CatalogData Parse(string institutionsMd, string stagesMd, IReadOnlyDictionary<string, string> tasksByGroup)
    {
        var data = new CatalogData();
        var specs = ParseInstitutions(institutionsMd, data);
        ParseStages(stagesMd, data);

        foreach (var (code, perGroup) in specs)
            foreach (var (group, numbers) in perGroup)
            {
                if (!data.Groups.TryGetValue(group, out var g))
                    throw new InvalidDataException($"institutions.md: {code} üçün naməlum qrup {group}");
                foreach (var n in numbers)
                {
                    var stage = g.Stage(n) ?? throw new InvalidDataException(
                        $"institutions.md: {code} → {group} qrupunda «{n}» mərhələsi yoxdur");
                    if (!stage.InstitutionCodes.Contains(code)) stage.InstitutionCodes.Add(code);
                }
            }

        ParseTasks(tasksByGroup, data);
        return data;
    }

    // ---------- institutions ----------
    private static Dictionary<string, Dictionary<string, List<string>>> ParseInstitutions(string md, CatalogData data)
    {
        var specs = new Dictionary<string, Dictionary<string, List<string>>>(StringComparer.OrdinalIgnoreCase);
        foreach (var cells in TableRows(md))
        {
            if (cells.Count < 5) continue;
            var code = cells[0];
            if (code.Equals("Kod", StringComparison.OrdinalIgnoreCase)) continue;
            var channel = cells[3].Trim() switch
            {
                "E+K" => InstitutionChannel.Both,
                "E" => InstitutionChannel.Electronic,
                "K" => InstitutionChannel.Paper,
                _ => InstitutionChannel.Unknown
            };
            data.Institutions[code] = new Institution(code, cells[1], cells[2], channel);
            data.InstitutionOrder.Add(code);
            var perGroup = new Dictionary<string, List<string>>();
            foreach (var part in cells[4].Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var kv = part.Split(':', 2, StringSplitOptions.TrimEntries);
                if (kv.Length != 2) throw new InvalidDataException($"institutions.md: səhv format «{part}» ({code})");
                perGroup[kv[0]] = kv[1].Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            }
            specs[code] = perGroup;
        }
        return specs;
    }

    // ---------- stages ----------
    private static void ParseStages(string md, CatalogData data)
    {
        GroupTemplate? current = null;
        foreach (var raw in md.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            if (line.StartsWith("## "))
            {
                var head = line[3..].Split('|', 2, StringSplitOptions.TrimEntries);
                current = new GroupTemplate { Code = head[0], Title = head.Length > 1 ? head[1] : head[0] };
                data.Groups[current.Code] = current;
                continue;
            }
            if (current is null || !line.StartsWith('|')) continue;
            var cells = SplitRow(line);
            if (cells.Count < 8 || cells[0] == "№" || cells[0].StartsWith("---")) continue;

            current.Stages.Add(new StageTemplate
            {
                GroupCode = current.Code,
                Number = cells[0],
                Name = cells[1],
                Kind = cells[2] switch
                {
                    "Məcburi" => StageKind.Mandatory,
                    "Şərti" => StageKind.Conditional,
                    "Könüllü" => StageKind.Voluntary,
                    var k => throw new InvalidDataException($"stages.md: naməlum növ «{k}» ({current.Code} {cells[0]})")
                },
                Path = cells[3] switch
                {
                    "Hamısı" => StagePath.All,
                    "Pay" => StagePath.Share,
                    "Kapital" => StagePath.Capital,
                    "ASC" => StagePath.Asc,
                    var p => throw new InvalidDataException($"stages.md: naməlum yol «{p}» ({current.Code} {cells[0]})")
                },
                Duration = cells[4] == "—" ? "" : cells[4],
                Tags = new HashSet<string>(
                    cells[5].Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
                    StringComparer.OrdinalIgnoreCase),
                Question = string.IsNullOrWhiteSpace(cells[6]) ? null : cells[6],
                Deadline = DeadlineRule.Parse(cells[7])
            });
        }
    }

    // ---------- tasks ----------
    private sealed class RawStage
    {
        public List<TaskTemplate> Tasks = new();
        public List<string> Notes = new();
        public string? CopyFrom;
    }

    private static void ParseTasks(IReadOnlyDictionary<string, string> tasksByGroup, CatalogData data)
    {
        var raw = new Dictionary<string, Dictionary<string, RawStage>>(StringComparer.OrdinalIgnoreCase);
        var extends = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (group, text) in tasksByGroup)
        {
            var stages = new Dictionary<string, RawStage>(StringComparer.OrdinalIgnoreCase);
            RawStage? cur = null;
            TaskTemplate? lastTop = null;
            foreach (var l in text.Split('\n'))
            {
                var line = l.TrimEnd('\r');
                if (line.StartsWith("@extends ")) { extends[group] = line[9..].Trim(); continue; }
                if (line.StartsWith("### "))
                {
                    cur = new RawStage();
                    stages[line[4..].Trim()] = cur;
                    lastTop = null;
                    continue;
                }
                if (cur is null) continue;
                if (line.StartsWith("@copy ")) { cur.CopyFrom = line[6..].Trim(); continue; }
                if (line.StartsWith("> "))
                {
                    cur.Notes.Add(line[2..].Trim());
                    continue;
                }
                if (line.StartsWith("- "))
                {
                    lastTop = new TaskTemplate { Text = line[2..].Trim() };
                    cur.Tasks.Add(lastTop);
                }
                else if (line.StartsWith("  - ") && lastTop is not null)
                {
                    lastTop.Children.Add(new TaskTemplate { Text = line[4..].Trim() });
                }
            }
            raw[group] = stages;
        }

        List<TaskTemplate> Resolve(string group, string stage, HashSet<string> seen)
        {
            if (!seen.Add($"{group}:{stage}")) throw new InvalidDataException($"tasks: dövrü istinad {group}:{stage}");
            var result = new List<TaskTemplate>();
            if (extends.TryGetValue(group, out var baseGroup) && raw.ContainsKey(baseGroup))
                result.AddRange(Resolve(baseGroup, stage, seen));
            if (raw.TryGetValue(group, out var stages) && stages.TryGetValue(stage, out var rs))
            {
                if (rs.CopyFrom is not null)
                {
                    var parts = rs.CopyFrom.Split(':', 2);
                    result.AddRange(Resolve(parts[0], parts[1], seen));
                }
                result.AddRange(rs.Tasks.Select(t => t.Clone()));
            }
            return result;
        }

        List<string> ResolveNotes(string group, string stage)
        {
            var notes = new List<string>();
            if (extends.TryGetValue(group, out var baseGroup) && raw.ContainsKey(baseGroup))
                notes.AddRange(ResolveNotes(baseGroup, stage));
            if (raw.TryGetValue(group, out var stages) && stages.TryGetValue(stage, out var rs))
            {
                if (rs.CopyFrom is not null)
                {
                    var parts = rs.CopyFrom.Split(':', 2);
                    notes.AddRange(ResolveNotes(parts[0], parts[1]));
                }
                notes.AddRange(rs.Notes);
            }
            return notes.Distinct().ToList();
        }

        foreach (var g in data.Groups.Values)
            foreach (var s in g.Stages)
            {
                var tasks = Resolve(g.Code, s.Number, new HashSet<string>());
                for (var i = 0; i < tasks.Count; i++)
                {
                    tasks[i].Key = (i + 1).ToString();
                    tasks[i].Optional = tasks[i].Text.StartsWith("İstəsə", StringComparison.Ordinal);
                    for (var j = 0; j < tasks[i].Children.Count; j++)
                        tasks[i].Children[j].Key = $"{i + 1}.{j + 1}";
                }
                s.Tasks = tasks;
                s.Notes = ResolveNotes(g.Code, s.Number);
            }
    }

    // ---------- helpers ----------
    private static IEnumerable<List<string>> TableRows(string md)
    {
        foreach (var raw in md.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            if (!line.StartsWith('|')) continue;
            var cells = SplitRow(line);
            if (cells.Count == 0 || cells[0].StartsWith("---")) continue;
            yield return cells;
        }
    }

    private static List<string> SplitRow(string line)
    {
        var inner = line.Trim();
        if (inner.StartsWith('|')) inner = inner[1..];
        if (inner.EndsWith('|')) inner = inner[..^1];
        return inner.Split('|').Select(c => c.Trim()).ToList();
    }
}
