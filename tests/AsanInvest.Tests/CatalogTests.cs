using AsanInvest.Core.Domain;
using AsanInvest.Core.Engine;
using static AsanInvest.Tests.Mini;

namespace AsanInvest.Tests;

public static class CatalogTests
{
    public static void Register()
    {
        Test("katalog: 36 qurum və 8 qrup yüklənir", () =>
        {
            Equal(36, Fixtures.Catalog.Institutions.Count, "qurum sayı");
            Equal(8, Fixtures.Catalog.Groups.Count, "qrup sayı");
        });

        Test("katalog: qrup üzrə mərhələ sayı Əlavə A ilə uyğundur", () =>
        {
            var expected = new Dictionary<string, int>
            { ["H-R-0"] = 9, ["H-Q-0"] = 10, ["H-R-M"] = 9, ["H-Q-M"] = 12, ["F-R-0"] = 13, ["F-Q-0"] = 13, ["F-R-M"] = 8, ["F-Q-M"] = 8 };
            foreach (var (g, n) in expected) Equal(n, Fixtures.Catalog.Group(g).Stages.Count, g);
        });

        Test("katalog: hər qurum ən azı bir mərhələdə iştirak edir", () =>
        {
            foreach (var code in Fixtures.Catalog.Institutions.Keys)
                True(Fixtures.Catalog.StagesOfInstitution(code).Count > 0, $"{code} heç bir mərhələdə yoxdur");
        });

        Test("katalog: qurumsuz mərhələlər yalnız «Dövlət qurumu iştirak etmir» olanlardır", () =>
        {
            var empty = Fixtures.Catalog.Groups.Values
                .SelectMany(g => g.Stages.Where(s => s.InstitutionCodes.Count == 0).Select(s => $"{g.Code}:{s.Number}"))
                .OrderBy(x => x).ToList();
            var expected = new[] { "F-Q-0:0", "F-Q-M:0", "F-R-0:0", "F-R-M:0", "H-R-M:3", "H-R-M:4" }.OrderBy(x => x).ToList();
            Equal(string.Join(",", expected), string.Join(",", empty), "qurumsuz mərhələlər");
        });

        Test("katalog: Əlavə A-dakı qurum sayları (Tikinti mərhələsi)", () =>
        {
            Equal(14, Fixtures.Catalog.Group("H-R-0").Stage("7")!.InstitutionCodes.Count, "H-R-0:7");
            Equal(14, Fixtures.Catalog.Group("H-Q-0").Stage("7")!.InstitutionCodes.Count, "H-Q-0:7");
            Equal(8, Fixtures.Catalog.Group("H-Q-0").Stage("0")!.InstitutionCodes.Count, "H-Q-0:0");
            var h0 = Fixtures.Catalog.Group("H-Q-M").Stage("0")!.InstitutionCodes.OrderBy(x => x).ToList();
            Equal("DVX,EIMZA,EMDX,KOB,NOT,POCT,XIN,XOS", string.Join(",", h0), "H-Q-M:0 (Əlavə A.4)");
        });

        Test("katalog: çeklistlər yüklənir (miras və kopya)", () =>
        {
            Equal(5, Fixtures.Catalog.Group("H-R-0").Stage("1")!.Tasks.Count, "H-R-0:1");
            var fq = Fixtures.Catalog.Group("F-Q-0").Stage("2.1")!;
            var fr = Fixtures.Catalog.Group("F-R-0").Stage("2.1")!;
            Equal(fr.Tasks.Count + 3, fq.Tasks.Count, "F-Q-0:2.1 əlavə 3 bənd");
            Equal(6, Fixtures.Catalog.Group("F-R-0").Stage("L1")!.Tasks.Count, "L1 = H-R-0:4");
            True(Fixtures.Catalog.Group("H-R-0").Stage("4")!.Tasks[0].Optional, "«İstəsə…» bəndi məcburi olmamalıdır");
            True(Fixtures.Catalog.Groups.Values.SelectMany(g => g.Stages).All(s => s.Tasks.Count > 0),
                "tapşırığı olmayan mərhələ var");
        });

        Test("katalog: tapşırıq açarları unikaldır", () =>
        {
            foreach (var s in Fixtures.Catalog.Groups.Values.SelectMany(g => g.Stages))
            {
                var keys = s.Tasks.SelectMany(t => new[] { t.Key }.Concat(t.Children.Select(c => c.Key))).ToList();
                Equal(keys.Count, keys.Distinct().Count(), $"{s.GroupCode}:{s.Number}");
            }
        });

        Test("ssenari: 12 ssenari və mərhələ sayları (cəmi / yolda) TZ cədvəli ilə uyğundur", () =>
        {
            // TZ bölmə 4: kod → (cəmi, yolda)
            var expected = new Dictionary<string, (int Total, int OnPath)>
            {
                ["H-R-0"] = (9, 9), ["H-Q-0"] = (10, 10), ["H-R-M-P"] = (9, 9), ["H-R-M-K"] = (9, 7),
                ["H-Q-M-P"] = (12, 10), ["H-Q-M-K"] = (12, 10), ["F-R-0"] = (13, 13), ["F-Q-0"] = (13, 13),
                ["F-R-M-P"] = (8, 7), ["F-R-M-K"] = (8, 7), ["F-Q-M-P"] = (8, 7), ["F-Q-M-K"] = (8, 7)
            };
            var all = ScenarioResolver.All();
            Equal(12, all.Count, "ssenari sayı");
            foreach (var sc in all)
            {
                var g = Fixtures.Catalog.Group(sc.GroupCode);
                var onPath = g.Stages.Count(s => StageEngine.IsOnPath(s, sc.Path));
                Equal(expected[sc.Code], (g.Stages.Count, onPath), sc.Code);
            }
        });

        Test("ssenari: dörd seçimdən düzgün kod çıxır", () =>
        {
            Equal("H-R-0", ScenarioResolver.Resolve(InvestorKind.Legal, Residency.Resident, ProjectKind.New, EntryPath.Share).Code);
            Equal("F-Q-M-K", ScenarioResolver.Resolve(InvestorKind.Natural, Residency.NonResident, ProjectKind.Existing, EntryPath.Capital).Code);
            Equal("H-Q-M-P", ScenarioResolver.Resolve(InvestorKind.Legal, Residency.NonResident, ProjectKind.Existing, EntryPath.Share).Code);
            Throws<ArgumentException>(() => ScenarioResolver.Resolve(InvestorKind.Legal, Residency.Resident, ProjectKind.Existing, EntryPath.None));
        });

        Test("kapital artımında pay mərhələləri boz (bu yolda keçilmir)", () =>
        {
            var g = Fixtures.Catalog.Group("H-R-M");
            True(!StageEngine.IsOnPath(g.Stage("3")!, EntryPath.Capital), "3 kapitalda keçilməməlidir");
            True(!StageEngine.IsOnPath(g.Stage("6")!, EntryPath.Capital), "6 kapitalda keçilməməlidir");
            True(StageEngine.IsOnPath(g.Stage("3")!, EntryPath.Share), "3 payda keçilməlidir");
        });
    }
}
