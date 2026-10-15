using System.Text;
using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Domain;
using AsanInvest.Core.Services;

namespace AsanInvest.Infrastructure;

/// <summary>
/// TZ 10.1: dörd nümunə iş. Ad və şirkətlər uydurmadır. Yalnız demo rejimində və data boş olanda yüklənir.
/// </summary>
public static class DemoData
{
    public const string CoordinatorEmail = "koordinator@demo.az";
    public const string AdminEmail = "admin@demo.az";

    public static byte[] SamplePdf(string title)
    {
        var safe = new string(title.Where(c => c < 128 && c != '(' && c != ')' && c != '\\').ToArray());
        var text = $"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
                   "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
                   $"4 0 obj<</Length 60>>stream\nBT /F1 12 Tf 20 50 Td ({safe}) Tj ET\nendstream endobj\n" +
                   "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
        return Encoding.ASCII.GetBytes(text);
    }

    public static User EnsureUser(Platform p, string name, string email, Role role, string? institution = null)
    {
        var existing = p.Store.Users.All().FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return existing;
        var u = new User { Name = name, Email = email, Role = role, InstitutionCode = institution, IsDemo = true };
        p.Store.Users.Upsert(u);
        return u;
    }

    /// <summary>Rol dəyişdiricisi üçün: istənilən qurum üçün demo əməkdaş.</summary>
    public static User EnsureOfficer(Platform p, string institutionCode)
    {
        var name = p.Catalog.InstName(institutionCode);
        return EnsureUser(p, $"{name} əməkdaşı (demo)", $"{institutionCode.ToLowerInvariant()}@demo.az",
            Role.InstitutionOfficer, institutionCode);
    }

    public static bool SeedIfEmpty(Platform p)
    {
        if (p.Store.Users.All().Count > 0) return false;

        var coordinator = EnsureUser(p, "Aysel Məmmədova (koordinator)", CoordinatorEmail, Role.Coordinator);
        EnsureUser(p, "Admin (demo)", AdminEmail, Role.Admin);
        var dvx = EnsureOfficer(p, "DVX");
        var not = EnsureOfficer(p, "NOT");
        var bank = EnsureOfficer(p, "BANK");
        var ain = EnsureOfficer(p, "AIN");

        // 1. Demo Agro Ltd. — H-Q-0, bank KYC üçün apostilli sənəd istəyib
        var agro = Investor(p, "Demo Agro Ltd. (Türkiyə)", "agro@demo.az", InvestorKind.Legal, Residency.NonResident, "Türkiyə");
        var job1 = p.Jobs.CreateJob(agro, agro.Id, new JobAnswers
            { Kind = InvestorKind.Legal, Residency = Residency.NonResident, Project = ProjectKind.New, HasEsign = true });
        CompleteStage(p, agro, job1, "0");
        CompleteStage(p, agro, job1, "1", send: ("DVX", "Şirkətin dövlət qeydiyyatı"), officer: dvx, approve: true);
        DoSome(p, agro, job1, "2", count: 2);
        UploadDemo(p, agro, job1, "Bank sənədi", "bank-anketi.pdf", null, "2");
        p.Jobs.SetReady(agro, job1.Id, "2", false);
        MarkAllMandatory(p, agro, job1, "2");
        p.Jobs.SetReady(agro, job1.Id, "2", true);
        var r1 = p.Requests.CreateAndSend(coordinator, job1.Id, "2", new[] { "BANK" }, "Hesabın açılması (KYC)").First();
        p.Requests.Decide(bank, r1.Id, RequestStatus.MoreDocsRequired,
            "KYC üçün xarici təsisçinin apostilli qeydiyyat sənədi və notarial tərcüməsi tələb olunur.");

        // 2. Nərmin Əlizadə — F-R-M-P, notarius baxır, ƏMDX arayışı gözlənilir
        var nermin = Investor(p, "Nərmin Əlizadə", "nermin@demo.az", InvestorKind.Natural, Residency.Resident, "Azərbaycan");
        var job2 = p.Jobs.CreateJob(nermin, nermin.Id, new JobAnswers
            { Kind = InvestorKind.Natural, Residency = Residency.Resident, Project = ProjectKind.Existing, Path = EntryPath.Share });
        CompleteStage(p, nermin, job2, "0");
        CompleteStage(p, nermin, job2, "1");
        p.Jobs.Answer(nermin, job2.Id, "2", false);
        MarkAllMandatory(p, nermin, job2, "3.1");
        UploadDemo(p, nermin, job2, "Qərar / protokol", "terefler-qerari.pdf", null, "3.1");
        p.Jobs.SetReady(nermin, job2.Id, "3.1", true);
        var r2 = p.Requests.CreateAndSend(coordinator, job2.Id, "3.1", new[] { "NOT", "EMDX" }, "Pay alqı-satqısının təsdiqi");
        p.Requests.Open(not, r2.First(r => r.InstitutionCode == "NOT").Id);

        // 3. Hans Demo — F-Q-M-K, DVX əlavə sənəd tələb edib, son tarixə 5 gün
        var hans = Investor(p, "Hans Demo (Almaniya)", "hans@demo.az", InvestorKind.Natural, Residency.NonResident, "Almaniya");
        var job3 = p.Jobs.CreateJob(hans, hans.Id, new JobAnswers
            { Kind = InvestorKind.Natural, Residency = Residency.NonResident, Project = ProjectKind.Existing, Path = EntryPath.Capital });
        CompleteStage(p, hans, job3, "0");
        CompleteStage(p, hans, job3, "1");
        p.Jobs.Answer(hans, job3.Id, "2", false);
        CompleteStage(p, hans, job3, "3.2");
        MarkAllMandatory(p, hans, job3, "4");
        UploadDemo(p, hans, job3, "Reyestr çıxarışı", "qeydiyyat-senedi.pdf", "Almaniya", "4");
        p.Jobs.SetAnchorDate(hans, job3.Id, "4", p.Clock.Today.AddDays(-10));
        p.Jobs.SetReady(hans, job3.Id, "4", true);
        var r3 = p.Requests.CreateAndSend(coordinator, job3.Id, "4", new[] { "DVX" }, "Reyestr dəyişikliyi").First();
        p.Requests.Decide(dvx, r3.Id, RequestStatus.MoreDocsRequired,
            "Yeni iştirakçının leqallaşdırılmış və tərcümə olunmuş qeydiyyat sənədi əlavə edilməlidir.");

        // 4. Demo Tekstil MMC — H-R-M-K, rəqabət razılığı mərhələsi aktivdir; 3 və 6 bu yolda keçilmir
        var tekstil = Investor(p, "Demo Tekstil MMC", "tekstil@demo.az", InvestorKind.Legal, Residency.Resident, "Azərbaycan");
        var job4 = p.Jobs.CreateJob(tekstil, tekstil.Id, new JobAnswers
            { Kind = InvestorKind.Legal, Residency = Residency.Resident, Project = ProjectKind.Existing, Path = EntryPath.Capital });
        CompleteStage(p, tekstil, job4, "1");
        CompleteStage(p, tekstil, job4, "2");
        CompleteStage(p, tekstil, job4, "4");
        p.Jobs.Answer(tekstil, job4.Id, "5", true);
        DoSome(p, tekstil, job4, "5", count: 3);
        _ = ain;

        // Nümayəndə: Hans Demo adından işləyir
        var rep = EnsureUser(p, "Rövşən Demo (nümayəndə)", "numayende@demo.az", Role.Representative);
        p.Store.Representations.Upsert(new Representation
        {
            InvestorUserId = hans.Id, RepresentativeUserId = rep.Id, Basis = "Etibarnamə (demo)",
            ValidUntil = p.Clock.Today.AddYears(1)
        });

        p.Jobs.ScanDeadlines();
        return true;
    }

    private static User Investor(Platform p, string name, string email, InvestorKind kind, Residency res, string country)
    {
        var u = EnsureUser(p, name, email, Role.Investor);
        p.Store.Profiles.Upsert(new InvestorProfile
        {
            UserId = u.Id, Kind = kind, Residency = res, DisplayName = name, Country = country,
            IdentityNumber = "DEMO-" + email.Split('@')[0].ToUpperInvariant(), Contact = email, Esign = EsignStatus.Unknown
        });
        return u;
    }

    private static void MarkAllMandatory(Platform p, User actor, Job job, string stage)
    {
        var t = p.Catalog.Group(job.GroupCode).Stage(stage)!;
        foreach (var task in t.Tasks.Where(x => !x.Optional)) p.Jobs.SetTask(actor, job.Id, stage, task.Key, true);
    }

    private static void DoSome(Platform p, User actor, Job job, string stage, int count)
    {
        var t = p.Catalog.Group(job.GroupCode).Stage(stage)!;
        foreach (var task in t.Tasks.Where(x => !x.Optional).Take(count)) p.Jobs.SetTask(actor, job.Id, stage, task.Key, true);
    }

    private static void UploadDemo(Platform p, User actor, Job job, string type, string fileName, string? country, string stage)
    {
        using var ms = new MemoryStream(SamplePdf(fileName));
        p.Documents.Upload(actor, job.Id, ms, fileName, type, country, new[] { stage }, null);
    }

    private static void CompleteStage(Platform p, User investor, Job job, string stage,
        (string Inst, string Type)? send = null, User? officer = null, bool approve = false)
    {
        MarkAllMandatory(p, investor, job, stage);
        if (send is null) return;
        p.Jobs.SetReady(investor, job.Id, stage, true);
        var coordinator = p.Store.Users.Find(job.CoordinatorId!.Value)!;
        var reqs = p.Requests.CreateAndSend(coordinator, job.Id, stage, new[] { send.Value.Inst }, send.Value.Type);
        if (approve && officer is not null)
            foreach (var r in reqs) p.Requests.Decide(officer, r.Id, RequestStatus.Approved, null);
    }
}
