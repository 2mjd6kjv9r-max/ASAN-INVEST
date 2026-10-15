using AsanInvest.Core.Catalog;

namespace AsanInvest.Infrastructure;

public static class SeedLoader
{
    public static CatalogData Load(string seedDir)
    {
        var institutions = File.ReadAllText(Path.Combine(seedDir, "institutions.md"));
        var stages = File.ReadAllText(Path.Combine(seedDir, "stages.md"));
        var tasks = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var f in Directory.GetFiles(Path.Combine(seedDir, "tasks"), "*.md"))
            tasks[Path.GetFileNameWithoutExtension(f)] = File.ReadAllText(f);
        return SeedParser.Parse(institutions, stages, tasks);
    }
}
