using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;
using AsanInvest.Core.Engine;
using AsanInvest.Core.Services;
using static AsanInvest.Tests.Mini;
using static AsanInvest.Tests.TestPlatform;

namespace AsanInvest.Tests;

public static class ServiceTests
{
    public static void Register()
    {
        // ------------------------------------------------ demo vəziyyətləri (TZ 10.1)
        Test("demo: Demo Agro — 0 və 1 tamamlanıb, 2-də bank əlavə sənəd istəyib", () =>
        {
            var (p, _, _) = Create();
            var v = p.Jobs.Build(JobOf(p, "agro@demo.az").Id);
            Equal("H-Q-0", v.Scenario.Code);
            Equal(StageStatus.Completed, v.Stage("0")!.Status, "mərhələ 0");
            Equal(StageStatus.Completed, v.Stage("1")!.Status, "mərhələ 1");
            Equal(StageStatus.NeedsAttention, v.Stage("2")!.Status, "mərhələ 2");
            Equal(RequestStatus.MoreDocsRequired, v.Stage("2")!.Requests.Single().Status);
        });

        Test("demo: Nərmin — notarius «Baxılır», ƏMDX «Göndərildi»", () =>
        {
            var (p, _, _) = Create();
            var v = p.Jobs.Build(JobOf(p, "nermin@demo.az").Id);
            Equal("F-R-M-P", v.Scenario.Code);
            var s = v.Stage("3.1")!;
            Equal(StageStatus.AtInstitution, s.Status);
            Equal(RequestStatus.UnderReview, s.Requests.Single(r => r.InstitutionCode == "NOT").Status);
            Equal(RequestStatus.Sent, s.Requests.Single(r => r.InstitutionCode == "EMDX").Status);
            Equal(StageStatus.NotApplicable, v.Stage("2")!.Status, "2-ci mərhələ «Xeyr»");
            Equal(StageStatus.NotOnPath, v.Stage("3.2")!.Status, "3.2 payda keçilmir");
        });

        Test("demo: Hans — DVX əlavə sənəd istəyib, son tarixə 5 gün (sarı)", () =>
        {
            var (p, _, _) = Create();
            var v = p.Jobs.Build(JobOf(p, "hans@demo.az").Id);
            Equal("F-Q-M-K", v.Scenario.Code);
            var s = v.Stage("4")!;
            Equal(StageStatus.NeedsAttention, s.Status);
            Equal(5, s.Deadline!.DaysLeft, "qalan gün");
            Equal(DeadlineSeverity.Warning, s.Deadline.Severity);
        });

        Test("demo: Demo Tekstil — 5 aktivdir, 3 və 6 bu yolda keçilmir, 8 razılıq gözləyir", () =>
        {
            var (p, _, _) = Create();
            var v = p.Jobs.Build(JobOf(p, "tekstil@demo.az").Id);
            Equal("H-R-M-K", v.Scenario.Code);
            True(v.Stage("5")!.Applicable, "5 aktiv");
            Equal(StageStatus.NotOnPath, v.Stage("3")!.Status);
            Equal(StageStatus.NotOnPath, v.Stage("6")!.Status);
            True(v.Stage("8")!.BlockReason is not null, "8 bloklanmalıdır");
            True(v.Stage("5")!.Deadline is not null, "30 günlük rəqabət müddəti");
            Equal(7, v.Stages.Count(s => s.Applicable), "aktiv mərhələ sayı (9/7)");
        });

        Test("demo: Hans-ın nümayəndəsi işi görür və redaktə edir", () =>
        {
            var (p, _, _) = Create();
            var rep = User(p, "numayende@demo.az");
            var job = JobOf(p, "hans@demo.az");
            True(p.Access.CanView(rep, job), "baxış");
            True(p.Access.CanEdit(rep, job), "redaktə");
            True(!p.Access.CanView(rep, JobOf(p, "agro@demo.az")), "başqa investorun işinə çıxış olmamalıdır");
        });

        // ------------------------------------------------ 12.2 mərhələ statusu qaydaları
        Test("status: sorğu statusları mərhələ statusunu qaydalara görə dəyişir", () =>
        {
            var t = new StageTemplate
            {
                Number = "9", Name = "Test", Kind = StageKind.Mandatory,
                Tasks = { new TaskTemplate { Key = "1", Text = "a" }, new TaskTemplate { Key = "2", Text = "b" } }
            };
            var run = new StageRun { OnPath = true };
            StageStatus S(string[] done, params RequestStatus[] reqs) =>
                StageEngine.Status(t, run, done.ToHashSet(), reqs.Select(x => new InstitutionRequest { Status = x }), false);

            Equal(StageStatus.NotStarted, S(Array.Empty<string>()));
            Equal(StageStatus.InProgress, S(new[] { "1" }));
            Equal(StageStatus.AtInstitution, S(new[] { "1", "2" }, RequestStatus.Sent));
            Equal(StageStatus.AtInstitution, S(new[] { "1", "2" }, RequestStatus.UnderReview, RequestStatus.Approved));
            Equal(StageStatus.NeedsAttention, S(new[] { "1", "2" }, RequestStatus.MoreDocsRequired, RequestStatus.Sent));
            Equal(StageStatus.NeedsAttention, S(new[] { "1", "2" }, RequestStatus.Rejected));
            Equal(StageStatus.Completed, S(new[] { "1", "2" }, RequestStatus.Approved, RequestStatus.Approved));
            Equal(StageStatus.Completed, S(new[] { "1", "2" }));
            Equal(StageStatus.InProgress, S(new[] { "1" }, RequestStatus.Approved), "məcburi tapşırıq qalıb");
            Equal(StageStatus.InProgress, S(new[] { "1", "2" }, RequestStatus.Draft), "qaralama tamamlanma deyil");
        });

        Test("status: keçilməyən / tətbiq edilməyən / əlavə edilməyib", () =>
        {
            var cond = new StageTemplate { Number = "5", Kind = StageKind.Conditional };
            var vol = new StageTemplate { Number = "4", Kind = StageKind.Voluntary };
            var none = new HashSet<string>();
            var noReq = Array.Empty<InstitutionRequest>();
            Equal(StageStatus.NotOnPath, StageEngine.Status(cond, new StageRun { OnPath = false }, none, noReq, false));
            Equal(StageStatus.NotApplicable, StageEngine.Status(cond, new StageRun { Answer = false }, none, noReq, false));
            Equal(StageStatus.NotStarted, StageEngine.Status(cond, new StageRun { Answer = null }, none, noReq, false), "«bilmirəm» şərti qalır");
            Equal(StageStatus.NotAdded, StageEngine.Status(vol, new StageRun { Answer = false }, none, noReq, false));
            Equal(StageStatus.NotStarted, StageEngine.Status(vol, new StageRun { Answer = true }, none, noReq, false));
        });

        Test("status: yeni sorğu əvvəlki imtina olunmuşu əvəz edir", () =>
        {
            var old = new InstitutionRequest { Status = RequestStatus.Rejected };
            var fresh = new InstitutionRequest { Status = RequestStatus.Sent, Supersedes = old.Id };
            var cur = StageEngine.CurrentRequests(new[] { old, fresh });
            Equal(1, cur.Count);
            Equal(RequestStatus.Sent, cur[0].Status);
        });

        // ------------------------------------------------ son tarix
        Test("son tarix: 7 gündən az qalanda sarı, keçəndə qırmızı", () =>
        {
            Equal(DeadlineSeverity.Normal, DeadlineCalculator.Severity(8));
            Equal(DeadlineSeverity.Warning, DeadlineCalculator.Severity(7));
            Equal(DeadlineSeverity.Warning, DeadlineCalculator.Severity(0));
            Equal(DeadlineSeverity.Overdue, DeadlineCalculator.Severity(-1));
        });

        Test("son tarix: vaxt keçəndə mərhələ «Diqqət tələb edir» və bildiriş göndərilir", () =>
        {
            var (p, clock, _) = Create();
            var job = JobOf(p, "hans@demo.az");
            clock.AddDays(6);
            var v = p.Jobs.Build(job.Id);
            Equal(DeadlineSeverity.Overdue, v.Stage("4")!.Deadline!.Severity);
            Equal(StageStatus.NeedsAttention, v.Stage("4")!.Status);
            var hans = User(p, "hans@demo.az");
            var before = p.Notifications.For(hans.Id).Count(n => n.Event.StartsWith("deadline-over"));
            p.Jobs.ScanDeadlines();
            p.Jobs.ScanDeadlines();
            Equal(before + 1, p.Notifications.For(hans.Id).Count(n => n.Event.StartsWith("deadline-over")), "təkrar bildiriş olmamalıdır");
        });

        Test("son tarix: kapital ödənişi 3 ay (1-ci mərhələ tamamlanandan sonra)", () =>
        {
            var (p, _, _) = Create();
            var v = p.Jobs.Build(JobOf(p, "agro@demo.az").Id);
            var d = v.Stage("3")!.Deadline;
            True(d is not null, "geri sayım olmalıdır");
            True(d!.DaysLeft is > 85 and < 95, $"təxminən 3 ay: {d.DaysLeft}");
        });

        Test("son tarix: xarici təsisçi ilə pay alınmasında kağız müraciət üçün 40 gün", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t1@demo.az", "Test Əcnəbi");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Natural, Residency = Residency.NonResident,
                Project = ProjectKind.Existing, Path = EntryPath.Share });
            p.Jobs.SetAnchorDate(u, job.Id, "4", p.Clock.Today);
            Equal(40, p.Jobs.Build(job.Id).Stage("4")!.Deadline!.DaysLeft, "kağız");
        });

        // ------------------------------------------------ tapşırıqlar
        Test("tapşırıq: üst bənd alt bəndləri işarələyir, alt bəndlər üst bəndi", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t2@demo.az", "Test Hüquqi");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.NonResident, Project = ProjectKind.New });
            var stage = p.Catalog.Group("H-Q-0").Stage("0")!;
            var parent = stage.Tasks.First(t => t.Children.Count > 0);
            p.Jobs.SetTask(u, job.Id, "0", parent.Key, true);
            var done = p.Jobs.Build(job.Id).Stage("0")!.DoneKeys;
            True(parent.Children.All(c => done.Contains(c.Key)), "alt bəndlər işarələnməlidir");
            p.Jobs.SetTask(u, job.Id, "0", parent.Children[0].Key, false);
            True(!p.Jobs.Build(job.Id).Stage("0")!.DoneKeys.Contains(parent.Key), "üst bənd işarəsi götürülməlidir");
        });

        Test("tapşırıq: keçilməyən mərhələdə tapşırıq işarələmək olmaz", () =>
        {
            var (p, _, _) = Create();
            var u = User(p, "nermin@demo.az");
            var job = JobOf(p, "nermin@demo.az");
            Throws<ServiceException>(() => p.Jobs.SetTask(u, job.Id, "3.2", "1", true), "fəal deyil");
        });

        // ------------------------------------------------ mərhələ sualları
        Test("şərti mərhələ: bəli aktivləşdirir, xeyr söndürür; könüllü mərhələ əlavə olunur", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t3@demo.az", "Test 3");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.Resident, Project = ProjectKind.New });
            Equal(StageStatus.NotStarted, p.Jobs.Build(job.Id).Stage("7")!.Status, "bilmirəm → şərti qalır");
            p.Jobs.Answer(u, job.Id, "7", false);
            Equal(StageStatus.NotApplicable, p.Jobs.Build(job.Id).Stage("7")!.Status);
            p.Jobs.Answer(u, job.Id, "7", true);
            Equal(StageStatus.NotStarted, p.Jobs.Build(job.Id).Stage("7")!.Status);
            Equal(StageStatus.NotAdded, p.Jobs.Build(job.Id).Stage("4")!.Status, "könüllü");
            p.Jobs.Answer(u, job.Id, "4", true);
            True(p.Jobs.Build(job.Id).Stage("4")!.Applicable, "əlavə edildi");
            Throws<ServiceException>(() => p.Jobs.Answer(u, job.Id, "1", false), "məcburidir");
        });

        Test("onboarding cavabları şərti mərhələləri əvvəlcədən aktivləşdirir", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t4@demo.az", "Test 4");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.Resident,
                Project = ProjectKind.New, Construction = false, ForeignWorker = true, IncentiveDoc = true });
            var v = p.Jobs.Build(job.Id);
            Equal(StageStatus.NotApplicable, v.Stage("7")!.Status, "tikinti: xeyr");
            True(v.Stage("6")!.Applicable, "xarici işçi: bəli");
            True(v.Stage("4")!.Applicable, "təşviq sənədi istənilib");
        });

        Test("F-*-0: kanal seçimi 2.1 / 2.2-dən birini söndürür", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t5@demo.az", "Test 5");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Natural, Residency = Residency.Resident, Project = ProjectKind.New });
            var start = p.Jobs.Build(job.Id);
            Equal(13, start.Stages.Count(s => s.Run.OnPath), "yolda: 13/13");
            Equal(12, start.Stages.Count(s => s.Applicable), "başlanğıcda 2.1 və 2.2 fəaldır; könüllü L1 əlavə edilməyib");
            p.Jobs.Answer(u, job.Id, "2.1", true);
            var v = p.Jobs.Build(job.Id);
            Equal(StageStatus.NotApplicable, v.Stage("2.2")!.Status);
            Equal(11, v.Stages.Count(s => s.Applicable));
            p.Jobs.Answer(u, job.Id, "2.2", true);
            Equal(StageStatus.NotApplicable, p.Jobs.Build(job.Id).Stage("2.1")!.Status);
        });

        // ------------------------------------------------ sorğular
        Test("sorğu: göndərmək üçün investor «hazıram» işarəsi və koordinator lazımdır", () =>
        {
            var (p, _, _) = Create(demo: false);
            var (u, c, job) = Setup(p);
            Throws<ServiceException>(() => p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat"), "hazır");
            Throws<ServiceException>(() => p.Jobs.SetReady(u, job.Id, "1", true), "məcburi tapşırıqlar");
            foreach (var t in p.Catalog.Group("H-R-0").Stage("1")!.Tasks.Where(t => !t.Optional)) p.Jobs.SetTask(u, job.Id, "1", t.Key, true);
            p.Jobs.SetReady(u, job.Id, "1", true);
            Throws<ServiceException>(() => p.Requests.CreateAndSend(u, job.Id, "1", new[] { "DVX" }, "Qeydiyyat"), "koordinator");
            Throws<ServiceException>(() => p.Requests.CreateAndSend(c, job.Id, "1", new[] { "BANK" }, "Qeydiyyat"), "iştirak etmir");
            var r = p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat");
            Equal(RequestStatus.Sent, r[0].Status);
            True(r[0].GatewayReference!.StartsWith("SIM-DVX-"), "saxta gateway istinadı");
            Throws<ServiceException>(() => p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat"), "artıq mövcuddur");
        });

        Test("sorğu: qərar axını və bildirişlər (təsdiq → mərhələ tamamlanır)", () =>
        {
            var (p, _, _) = Create(demo: false);
            var (u, c, job) = Setup(p);
            foreach (var t in p.Catalog.Group("H-R-0").Stage("1")!.Tasks.Where(t => !t.Optional)) p.Jobs.SetTask(u, job.Id, "1", t.Key, true);
            p.Jobs.SetReady(u, job.Id, "1", true);
            var r = p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat")[0];
            var officer = DemoDataOfficer(p, "DVX");
            Equal(StageStatus.AtInstitution, p.Jobs.Build(job.Id).Stage("1")!.Status);
            Throws<ServiceException>(() => p.Requests.Decide(officer, r.Id, RequestStatus.Rejected, " "), "Səbəb");
            p.Requests.Open(officer, r.Id);
            Equal(RequestStatus.UnderReview, p.Store.Requests.Find(r.Id)!.Status);
            p.Requests.Decide(officer, r.Id, RequestStatus.Approved, null);
            Equal(StageStatus.Completed, p.Jobs.Build(job.Id).Stage("1")!.Status);
            True(p.Notifications.For(u.Id).Any(n => n.Event.StartsWith("request-decision")), "investora bildiriş");
            True(p.Notifications.For(c.Id).Any(n => n.Event.StartsWith("request-decision")), "koordinatora bildiriş");
            True(p.Notifications.For(u.Id).Any(n => n.Event.StartsWith("stage-done")), "mərhələ tamamlandı bildirişi");
            Throws<ServiceException>(() => p.Requests.Decide(officer, r.Id, RequestStatus.Rejected, "gec"), "keçid");
        });

        Test("sorğu: imtina sonrası koordinator yeni sorğu yaradır, köhnəsi əvəz olunur", () =>
        {
            var (p, _, _) = Create(demo: false);
            var (u, c, job) = Setup(p);
            foreach (var t in p.Catalog.Group("H-R-0").Stage("1")!.Tasks.Where(t => !t.Optional)) p.Jobs.SetTask(u, job.Id, "1", t.Key, true);
            p.Jobs.SetReady(u, job.Id, "1", true);
            var officer = DemoDataOfficer(p, "DVX");
            var first = p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat")[0];
            p.Requests.Decide(officer, first.Id, RequestStatus.Rejected, "Sənədlər natamamdır");
            Equal(StageStatus.NeedsAttention, p.Jobs.Build(job.Id).Stage("1")!.Status);
            var second = p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Qeydiyyat")[0];
            Equal(first.Id, second.Supersedes!.Value);
            Equal(StageStatus.AtInstitution, p.Jobs.Build(job.Id).Stage("1")!.Status);
        });

        Test("sorğu: «əlavə sənəd» → investor yeni sənəd yükləyir → yenidən göndərilir", () =>
        {
            var (p, clock, _) = Create();
            var agro = User(p, "agro@demo.az");
            var job = JobOf(p, "agro@demo.az");
            var req = p.Jobs.Build(job.Id).Stage("2")!.Requests.Single();
            Throws<ServiceException>(() => p.Requests.Resubmit(agro, req.Id), "yükləyin");
            clock.AddDays(1);
            using var ms = new MemoryStream(Pdf("apostil"));
            p.Documents.Upload(agro, job.Id, ms, "apostil.pdf", "Apostilli xarici sənəd", "Türkiyə", new[] { "2" }, null);
            p.Requests.Resubmit(agro, req.Id);
            var after = p.Store.Requests.Find(req.Id)!;
            Equal(RequestStatus.Sent, after.Status);
            Equal(1, after.ResubmissionCount);
            Equal(StageStatus.AtInstitution, p.Jobs.Build(job.Id).Stage("2")!.Status);
        });

        Test("sorğu: rəqabət razılığı alınmayıbsa notarial/reyestr mərhələsi bloklanır", () =>
        {
            var (p, _, _) = Create();
            var u = User(p, "tekstil@demo.az");
            var job = JobOf(p, "tekstil@demo.az");
            var v = p.Jobs.Build(job.Id);
            True(v.Stage("8")!.BlockReason!.Contains("Razılıq alınana qədər"), "mətn");
            Throws<ServiceException>(() => p.Jobs.SetReady(u, job.Id, "8", true));
            p.Jobs.Answer(u, job.Id, "5", false);
            True(p.Jobs.Build(job.Id).Stage("8")!.BlockReason is null, "razılıq lazım deyil → blok yoxdur");
        });

        Test("sorğu: etibarlılığı bitmiş və ya düzəliş tələb olunan sənədlə göndərmək olmaz", () =>
        {
            var (p, clock, _) = Create(demo: false);
            var (u, c, job) = Setup(p);
            foreach (var t in p.Catalog.Group("H-R-0").Stage("1")!.Tasks.Where(t => !t.Optional)) p.Jobs.SetTask(u, job.Id, "1", t.Key, true);
            using var ms = new MemoryStream(Pdf());
            var doc = p.Documents.Upload(u, job.Id, ms, "arayis.pdf", "Arayış", null, new[] { "1" }, clock.Today.AddDays(2));
            p.Jobs.SetReady(u, job.Id, "1", true);
            p.Documents.Review(c, doc.Id, false, "Oxunmur");
            Throws<ServiceException>(() => p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Q"), "düzəliş");
            p.Documents.Review(c, doc.Id, true, null);
            clock.AddDays(3);
            Throws<ServiceException>(() => p.Requests.CreateAndSend(c, job.Id, "1", new[] { "DVX" }, "Q"), "etibarlılıq");
        });

        Test("sorğu: xarici təsisçi ilə pay alınmasında reyestr dəyişikliyi kağız kanalla qeyd olunur", () =>
        {
            var (p, _, _) = Create(demo: false);
            var u = DemoData(p, "t6@demo.az", "Test Əcnəbi");
            var c = TestCoordinator(p);
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Natural, Residency = Residency.NonResident,
                Project = ProjectKind.Existing, Path = EntryPath.Share, ForeignWorker = false });
            p.Jobs.Answer(u, job.Id, "2", false);
            foreach (var t in p.Catalog.Group("F-Q-M").Stage("4")!.Tasks.Where(t => !t.Optional)) p.Jobs.SetTask(u, job.Id, "4", t.Key, true);
            p.Jobs.SetReady(u, job.Id, "4", true);
            var r = p.Requests.CreateAndSend(c, job.Id, "4", new[] { "DVX" }, "Reyestr dəyişikliyi")[0];
            Equal(RequestChannel.Paper, r.Channel);
        });

        // ------------------------------------------------ icazələr
        Test("icazə: qurum əməkdaşı başqa qurumun sorğusuna toxuna bilməz", () =>
        {
            var (p, _, _) = Create();
            var bank = User(p, "bank@demo.az");
            var dvx = User(p, "dvx@demo.az");
            var notReq = p.Store.Requests.All().First(r => r.InstitutionCode == "NOT");
            Throws<ServiceException>(() => p.Requests.Open(bank, notReq.Id), "aid deyil");
            Throws<ServiceException>(() => p.Requests.Decide(dvx, notReq.Id, RequestStatus.Approved, null), "aid deyil");
            Equal(0, p.Requests.InboxFor(User(p, "ain@demo.az")).Count, "AIN-in gələn sorğusu yoxdur");
            True(p.Requests.InboxFor(bank).All(r => r.InstitutionCode == "BANK"), "yalnız öz qurumu");
        });

        Test("icazə: qurum əməkdaşı yalnız öz sorğusuna əlavə olunmuş sənədi görür", () =>
        {
            var (p, _, _) = Create();
            var notDoc = p.Store.Documents.All().First(d => d.FileName == "terefler-qerari.pdf");
            True(p.Access.CanViewDocument(User(p, "not@demo.az"), notDoc), "notarius öz sorğusundakı sənədi görür");
            True(!p.Access.CanViewDocument(User(p, "bank@demo.az"), notDoc), "bank notariusun sənədini görməməlidir");
            True(!p.Access.CanViewDocument(User(p, "agro@demo.az"), notDoc), "başqa investor görməməlidir");
            True(p.Access.CanViewDocument(User(p, "nermin@demo.az"), notDoc), "sahibi görür");
        });

        Test("icazə: investor başqa investorun işinə yaza bilməz", () =>
        {
            var (p, _, _) = Create();
            var nermin = User(p, "nermin@demo.az");
            var agroJob = JobOf(p, "agro@demo.az");
            Throws<ServiceException>(() => p.Jobs.SetTask(nermin, agroJob.Id, "2", "1", true), "icazəniz yoxdur");
            using var ms = new MemoryStream(Pdf());
            Throws<ServiceException>(() => p.Documents.Upload(nermin, agroJob.Id, ms, "a.pdf", "Digər", null, null, null), "icazəniz yoxdur");
        });

        Test("icazə: nümayəndənin etibarnaməsi bitəndə yalnız baxış mümkündür", () =>
        {
            var (p, clock, _) = Create();
            var rep = User(p, "numayende@demo.az");
            var job = JobOf(p, "hans@demo.az");
            True(p.Access.CanEdit(rep, job));
            clock.AddDays(400);
            True(p.Access.CanView(rep, job), "baxış qalır");
            True(!p.Access.CanEdit(rep, job), "redaktə bağlanır");
            Throws<ServiceException>(() => p.Jobs.SetTask(rep, job.Id, "5", "1", true), "müddəti bitib");
        });

        Test("icazə: nümayəndənin hərəkəti «kimin adından» qeydi ilə audit jurnalına düşür", () =>
        {
            var (p, _, _) = Create();
            var rep = User(p, "numayende@demo.az");
            var hans = User(p, "hans@demo.az");
            var job = JobOf(p, "hans@demo.az");
            p.Jobs.SetTask(rep, job.Id, "5", "1", true);
            var entry = p.Store.Audit.All().Last(a => a.Action == "task.done");
            Equal(rep.Id, entry.ActorId);
            Equal(hans.Id, entry.OnBehalfOfId!.Value, "kimin adından");
        });

        Test("icazə: daxili qeyd investora və qurum əməkdaşına görünmür", () =>
        {
            var (p, _, _) = Create();
            var c = User(p, "koordinator@demo.az");
            var nermin = User(p, "nermin@demo.az");
            var job = JobOf(p, "nermin@demo.az");
            p.Messages.Post(c, job.Id, "3.1", null, "Daxili: diqqət!", true);
            p.Messages.Post(c, job.Id, "3.1", null, "Salam, sənədlər qəbul edildi.", false);
            Equal(2, p.Messages.Thread(c, job.Id).Count);
            var seen = p.Messages.Thread(nermin, job.Id);
            Equal(1, seen.Count, "investor yalnız açıq mesajı görür");
            True(!seen[0].Internal);
            var notReq = p.Store.Requests.All().First(r => r.InstitutionCode == "NOT");
            Throws<ServiceException>(() => p.Messages.Post(User(p, "bank@demo.az"), job.Id, null, notReq.Id, "salam", false), "yalnız öz sorğusu");
        });

        // ------------------------------------------------ sənədlər
        Test("sənəd: icazəsiz format, saxta məzmun və böyük ölçü rədd edilir", () =>
        {
            var (p, _, _) = Create(demo: false);
            var (u, _, job) = Setup(p);
            Throws<ServiceException>(() => Up(p, u, job, "virus.exe", Pdf()), "PDF, JPG və PNG");
            Throws<ServiceException>(() => Up(p, u, job, "x.pdf", new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }), "uyğun gəlmir");
            Throws<ServiceException>(() => Up(p, u, job, "x.png", Pdf()), "uyğun gəlmir");
            Throws<ServiceException>(() => Up(p, u, job, "bos.pdf", Array.Empty<byte>()), "boşdur");
            p.Settings.Set(SettingsService.MaxFileMb, "1");
            var big = new byte[2 * 1024 * 1024];
            Array.Copy(Pdf(), big, Pdf().Length);
            Throws<ServiceException>(() => Up(p, u, job, "big.pdf", big), "limiti aşıldı");
            var ok = Up(p, u, job, "yaxsi.pdf", Pdf());
            Equal("application/pdf", ok.ContentType);
        });

        Test("sənəd: fayl adı sanitarizasiya olunur, yol keçidi mümkün deyil", () =>
        {
            var (p, _, _) = Create(demo: false);
            var (u, _, job) = Setup(p);
            var d = Up(p, u, job, "../../etc/passwd<script>.pdf", Pdf());
            True(!d.FileName.Contains('/') && !d.FileName.Contains('<'), $"ad təmizlənməlidir: {d.FileName}");
            True(System.Text.RegularExpressions.Regex.IsMatch(d.StoredName, @"^[0-9a-f]{32}\.pdf$"), "diskdə təsadüfi ad");
            Throws<InvalidOperationException>(() => p.Files.Open("../secret.pdf"));
            Equal("sened", DocumentService.SanitizeName("///"));
        });

        Test("sənəd: xarici ölkə sənədi «Yükləndi → Apostil → Tərcümə» ardıcıllığı ilə irəliləyir", () =>
        {
            var (p, _, _) = Create();
            var c = User(p, "koordinator@demo.az");
            var d = p.Store.Documents.All().First(x => x.SourceCountry == "Almaniya");
            Equal(ForeignDocStatus.Uploaded, d.Foreign);
            p.Documents.AdvanceForeign(c, d.Id);
            p.Documents.AdvanceForeign(c, d.Id);
            Equal(ForeignDocStatus.TranslationConfirmed, p.Store.Documents.Find(d.Id)!.Foreign);
            Throws<ServiceException>(() => p.Documents.AdvanceForeign(c, d.Id), "növbəti status yoxdur");
        });

        Test("sənəd: koordinator düzəliş üçün səbəb göstərməlidir", () =>
        {
            var (p, _, _) = Create();
            var c = User(p, "koordinator@demo.az");
            var d = p.Store.Documents.All().First();
            Throws<ServiceException>(() => p.Documents.Review(c, d.Id, false, ""), "səbəb");
            p.Documents.Review(c, d.Id, false, "Səhifələr çatışmır");
            True(p.Notifications.For(p.Store.Jobs.Find(d.JobId)!.InvestorUserId).Any(n => n.Event.StartsWith("doc-changes")), "investora bildiriş");
        });

        // ------------------------------------------------ ssenari dəyişikliyi və admin
        Test("ssenari dəyişikliyi: tamamlanmış tapşırıqlar köçür, sorğular köhnə işdə qalır", () =>
        {
            var (p, _, _) = Create();
            var u = User(p, "agro@demo.az");
            var old = JobOf(p, "agro@demo.az");
            var fresh = p.Jobs.ChangeScenario(u, old.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.NonResident, Project = ProjectKind.New, Construction = false });
            Equal(old.Id, p.Store.Jobs.Find(old.Id)!.Id);
            True(p.Store.Jobs.Find(old.Id)!.Closed, "köhnə iş arxivləşir");
            var v = p.Jobs.Build(fresh.Id);
            Equal(StageStatus.Completed, v.Stage("0")!.Status, "0 köçürülüb");
            Equal(0, p.Store.Requests.All().Count(r => r.JobId == fresh.Id), "sorğular köçmür");
            True(p.Store.Requests.All().Count(r => r.JobId == old.Id) >= 2, "sorğular köhnə işdə qalır");
            Equal(fresh.Id, p.Jobs.ActiveJobOf(u)!.Id);
        });

        Test("admin: mərhələyə qurum əlavə etmək yalnız yeni işlərdə görünür", () =>
        {
            var (p, _, _) = Create();
            var oldJob = JobOf(p, "agro@demo.az");
            p.Store.Overrides.Upsert(new StageOverride { GroupCode = "H-R-0", StageNumber = "2", AddCodes = { "MB" } });
            var u = DemoData(p, "t7@demo.az", "Test 7");
            var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.Resident, Project = ProjectKind.New });
            True(p.Jobs.Build(job.Id).Stage("2")!.Run.InstitutionCodes.Contains("MB"), "yeni işdə çip var");
            True(!p.Jobs.Build(oldJob.Id).Stage("2")!.Run.InstitutionCodes.Contains("MB"), "köhnə işə təsir etmir");
        });

        // ------------------------------------------------ yaddaş
        Test("yaddaş: JSON faylları yenidən açılanda data qalır", () =>
        {
            var (p, clock, dir) = Create();
            var jobs = p.Store.Jobs.All().Count;
            var reqs = p.Store.Requests.All().Count;
            var p2 = AsanInvest.Infrastructure.Platform.Create(dir, Path.Combine(Fixtures.RepoRoot(), "seed"), clock, new NullOutbox());
            Equal(jobs, p2.Store.Jobs.All().Count, "işlər");
            Equal(reqs, p2.Store.Requests.All().Count, "sorğular");
            Equal(p.Jobs.Build(JobOf(p, "hans@demo.az").Id).Stage("4")!.Status, p2.Jobs.Build(JobOf(p2, "hans@demo.az").Id).Stage("4")!.Status);
            True(!AsanInvest.Infrastructure.DemoData.SeedIfEmpty(p2), "demo yenidən yüklənməməlidir");
        });

        Test("yaddaş: oxunan obyektdə dəyişiklik Upsert olmadan saxlanmır", () =>
        {
            var (p, _, _) = Create();
            var u = p.Store.Users.All().First();
            var name = u.Name;
            u.Name = "Dəyişdi";
            Equal(name, p.Store.Users.Find(u.Id)!.Name);
        });

        Test("bildiriş: «hamısını oxunmuş et»", () =>
        {
            var (p, _, _) = Create();
            var u = User(p, "hans@demo.az");
            True(p.Notifications.UnreadCount(u.Id) > 0, "oxunmamış var");
            p.Notifications.MarkAllRead(u.Id);
            Equal(0, p.Notifications.UnreadCount(u.Id));
        });
    }

    // ------------------------------------------------------------ köməkçilər
    private static User DemoData(AsanInvest.Infrastructure.Platform p, string email, string name)
    {
        TestCoordinator(p);
        var u = AsanInvest.Infrastructure.DemoData.EnsureUser(p, name, email, Role.Investor);
        return u;
    }

    private static User TestCoordinator(AsanInvest.Infrastructure.Platform p) =>
        AsanInvest.Infrastructure.DemoData.EnsureUser(p, "Test koordinator", "koordinator@demo.az", Role.Coordinator);

    private static User DemoDataOfficer(AsanInvest.Infrastructure.Platform p, string code) =>
        AsanInvest.Infrastructure.DemoData.EnsureOfficer(p, code);

    private static (User Investor, User Coordinator, Job Job) Setup(AsanInvest.Infrastructure.Platform p)
    {
        var c = TestCoordinator(p);
        var u = AsanInvest.Infrastructure.DemoData.EnsureUser(p, "Test investor", "inv@demo.az", Role.Investor);
        var job = p.Jobs.CreateJob(u, u.Id, new JobAnswers { Kind = InvestorKind.Legal, Residency = Residency.Resident, Project = ProjectKind.New });
        return (u, c, job);
    }

    private static Document Up(AsanInvest.Infrastructure.Platform p, User u, Job job, string name, byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        return p.Documents.Upload(u, job.Id, ms, name, "Digər", null, new[] { "1" }, null);
    }
}
