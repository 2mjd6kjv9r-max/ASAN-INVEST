using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Catalog;
using AsanInvest.Infrastructure;

namespace AsanInvest.Tests;

public static class Fixtures
{
    public static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "seed"))) dir = dir.Parent;
        return dir?.FullName ?? throw new DirectoryNotFoundException("seed qovluğu tapılmadı");
    }

    private static CatalogData? _catalog;
    public static CatalogData Catalog => _catalog ??= SeedLoader.Load(Path.Combine(RepoRoot(), "seed"));

    public sealed class FakeClock : IClock
    {
        public DateTime Now { get; set; } = new(2026, 10, 15, 9, 0, 0, DateTimeKind.Utc);
        public DateTime UtcNow => Now;
        public DateTime Today => Now.AddHours(4).Date;
        public DateTime ToLocal(DateTime utc) => utc.AddHours(4);
        public void AddDays(int d) => Now = Now.AddDays(d);
    }
}

public static class TestPlatform
{
    public static (AsanInvest.Infrastructure.Platform P, Fixtures.FakeClock Clock, string Dir) Create(bool demo = true)
    {
        var dir = Path.Combine(Path.GetTempPath(), "asan-test-" + Guid.NewGuid().ToString("N"));
        var clock = new Fixtures.FakeClock();
        var p = AsanInvest.Infrastructure.Platform.Create(dir, Path.Combine(Fixtures.RepoRoot(), "seed"), clock,
            new AsanInvest.Core.Services.NullOutbox());
        if (demo) AsanInvest.Infrastructure.DemoData.SeedIfEmpty(p);
        return (p, clock, dir);
    }

    public static AsanInvest.Core.Domain.User User(AsanInvest.Infrastructure.Platform p, string email) =>
        p.Store.Users.All().First(u => u.Email == email);

    public static AsanInvest.Core.Domain.Job JobOf(AsanInvest.Infrastructure.Platform p, string investorEmail) =>
        p.Store.Jobs.All().First(j => j.InvestorUserId == User(p, investorEmail).Id && !j.Closed);

    public static byte[] Pdf(string name = "x") => AsanInvest.Infrastructure.DemoData.SamplePdf(name);
}
