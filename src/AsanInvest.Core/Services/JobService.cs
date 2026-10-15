using AsanInvest.Core.Abstractions;
using AsanInvest.Core.Catalog;
using AsanInvest.Core.Domain;
using AsanInvest.Core.Engine;

namespace AsanInvest.Core.Services;

public sealed class StageView
{
    public required StageTemplate Template { get; init; }
    public required StageRun Run { get; init; }
    public StageStatus Status { get; set; }
    public HashSet<string> DoneKeys { get; init; } = new();
    public int TasksDone { get; set; }
    public int TasksTotal { get; set; }
    /// <summary>Əvəz olunmamış (cari) sorğular.</summary>
    public List<InstitutionRequest> Requests { get; set; } = new();
    public List<InstitutionRequest> AllRequests { get; set; } = new();
    public DeadlineInfo? Deadline { get; set; }
    public string? BlockReason { get; set; }
    public bool Applicable { get; set; }
    public string Number => Template.Number;
}

public sealed class JobView
{
    public required Job Job { get; init; }
    public required ScenarioInfo Scenario { get; init; }
    public required GroupTemplate Group { get; init; }
    public List<StageView> Stages { get; init; } = new();
    public int CompletedCount => Stages.Count(s => s.Status == StageStatus.Completed);
    /// <summary>Fəal (boz olmayan) mərhələ sayı.</summary>
    public int ActiveCount => Stages.Count(s => s.Applicable);
    public int Percent => ActiveCount == 0 ? 0 : (int)Math.Round(100.0 * CompletedCount / ActiveCount);
    /// <summary>Cari mərhələ: diqqət tələb edən, sonra qurumda, sonra icra olunan, sonra ilk tamamlanmamış.</summary>
    public StageView? Current =>
        Stages.FirstOrDefault(s => s.Status == StageStatus.NeedsAttention)
        ?? Stages.FirstOrDefault(s => s.Status == StageStatus.AtInstitution)
        ?? Stages.FirstOrDefault(s => s.Status == StageStatus.InProgress)
        ?? Stages.FirstOrDefault(s => s.Applicable && s.Status != StageStatus.Completed);
    public IEnumerable<DeadlineInfo> Deadlines =>
        Stages.Where(s => s.Deadline is not null).Select(s => s.Deadline!).OrderBy(d => d.DaysLeft);
    public StageView? Stage(string number) =>
        Stages.FirstOrDefault(s => s.Number.Equals(number, StringComparison.OrdinalIgnoreCase));
}

public sealed class ServiceException(string message) : Exception(message);

public sealed class JobService(
    IDataStore store, CatalogData catalog, IClock clock,
    AuditService audit, NotificationService notes, AccessService access)
{
    // ------------------------------------------------------------ oxuma

    public JobView Build(Guid jobId)
    {
        var job = store.Jobs.Find(jobId) ?? throw new ServiceException("İş tapılmadı.");
        var scenario = ScenarioResolver.Resolve(job.Answers);
        var group = catalog.Group(job.GroupCode);

        var runs = store.StageRuns.All().Where(r => r.JobId == jobId)
            .ToDictionary(r => r.Number, StringComparer.OrdinalIgnoreCase);
        var tasks = store.TaskRuns.All().Where(t => t.JobId == jobId)
            .GroupBy(t => t.StageNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Key).ToHashSet(), StringComparer.OrdinalIgnoreCase);
        var reqs = store.Requests.All().Where(r => r.JobId == jobId)
            .GroupBy(r => r.StageNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.CreatedAt).ToList(), StringComparer.OrdinalIgnoreCase);
        var today = clock.Today;

        var view = new JobView { Job = job, Scenario = scenario, Group = group };
        foreach (var t in group.Stages)
        {
            if (!runs.TryGetValue(t.Number, out var run)) continue;
            var done = tasks.GetValueOrDefault(t.Number) ?? new HashSet<string>();
            var all = reqs.GetValueOrDefault(t.Number) ?? new List<InstitutionRequest>();
            var current = StageEngine.CurrentRequests(all).ToList();

            var status = StageEngine.Status(t, run, done, current, false);
            DeadlineInfo? deadline = null;
            if (StageEngine.IsApplicable(t, run) && status != StageStatus.Completed)
            {
                var paper = t.HasTag(StageEngine.TagRegistryChange)
                            && job.Answers.Residency == Residency.NonResident && job.Answers.Path == EntryPath.Share;
                deadline = DeadlineCalculator.Compute(t, run, n => runs.GetValueOrDefault(n), paper, today);
                if (deadline?.Severity == DeadlineSeverity.Overdue)
                    status = StageEngine.Status(t, run, done, current, true);
            }

            var (d, total) = StageEngine.TaskProgress(t, done);
            view.Stages.Add(new StageView
            {
                Template = t, Run = run, Status = status, DoneKeys = done,
                TasksDone = d, TasksTotal = total, Requests = current, AllRequests = all,
                Deadline = deadline, Applicable = StageEngine.IsApplicable(t, run)
            });
        }

        var snapshot = view.Stages.Select(s => (s.Template, s.Run, s.Status)).ToList();
        foreach (var s in view.Stages)
            s.BlockReason = StageEngine.BlockReason(s.Template, snapshot);
        return view;
    }

    public IReadOnlyList<Job> JobsOf(User user) => user.Role switch
    {
        Role.Investor => store.Jobs.All().Where(j => j.InvestorUserId == user.Id).OrderByDescending(j => j.CreatedAt).ToList(),
        Role.Representative => store.Jobs.All().Where(j => access.CanView(user, j)).OrderByDescending(j => j.CreatedAt).ToList(),
        Role.Coordinator => store.Jobs.All().Where(j => j.CoordinatorId == user.Id).OrderByDescending(j => j.CreatedAt).ToList(),
        Role.Admin => store.Jobs.All().OrderByDescending(j => j.CreatedAt).ToList(),
        _ => new List<Job>()
    };

    /// <summary>İnvestorun cari (arxivləşməmiş) işi.</summary>
    public Job? ActiveJobOf(User user) => JobsOf(user).FirstOrDefault(j => !j.Closed);

    // ------------------------------------------------------------ yaratma

    public Job CreateJob(User actor, Guid investorUserId, JobAnswers answers)
    {
        lock (store.Gate)
        {
            if (actor.Role is not (Role.Investor or Role.Representative))
                throw new ServiceException("İşi yalnız investor və ya nümayəndə yarada bilər.");
            var investor = store.Users.Find(investorUserId) ?? throw new ServiceException("İnvestor tapılmadı.");
            if (actor.Role == Role.Investor && actor.Id != investorUserId) throw new ServiceException("İcazə yoxdur.");
            if (actor.Role == Role.Representative
                && !store.Representations.All().Any(r => r.RepresentativeUserId == actor.Id && r.InvestorUserId == investorUserId
                                                          && r.ValidUntil.Date >= clock.Today))
                throw new ServiceException("Nümayəndəlik qüvvədə deyil.");

            ScenarioInfo scenario;
            try { scenario = ScenarioResolver.Resolve(answers); }
            catch (ArgumentException e) { throw new ServiceException(e.Message); }
            if (scenario.Project == ProjectKind.New) answers.Path = EntryPath.None;

            var profile = store.Profiles.All().FirstOrDefault(p => p.UserId == investorUserId);
            var job = new Job
            {
                InvestorUserId = investorUserId,
                Title = $"{profile?.DisplayName ?? investor.Name} · {scenario.Code}",
                ScenarioCode = scenario.Code,
                GroupCode = scenario.GroupCode,
                Answers = answers,
                CoordinatorId = PickCoordinator(),
                CreatedAt = clock.UtcNow
            };
            store.Jobs.Upsert(job);

            foreach (var run in JobFactory.CreateStageRuns(catalog, scenario.GroupCode, answers, job.Id, store.Overrides.All()))
                store.StageRuns.Upsert(run);

            audit.Record(actor, "job.create", "Job", job.Id.ToString(), job.Id,
                $"Ssenari {scenario.Code}", access.OnBehalfOf(actor, job));
            if (job.CoordinatorId is { } c)
                notes.Notify(c, $"job-new:{job.Id}", $"Yeni iş təyin olundu: {job.Title}", $"/Coordinator/Job/{job.Id}", email: true);
            Refresh(job.Id, actor);
            return job;
        }
    }

    /// <summary>İşlərin sayına görə ən az yüklü koordinator (növbə ilə təyin etmə qaydası).</summary>
    private Guid? PickCoordinator()
    {
        var coordinators = store.Users.All().Where(u => u.Role == Role.Coordinator && !u.Blocked).ToList();
        if (coordinators.Count == 0) return null;
        var jobs = store.Jobs.All().Where(j => !j.Closed).ToList();
        return coordinators.OrderBy(c => jobs.Count(j => j.CoordinatorId == c.Id)).ThenBy(c => c.Name).First().Id;
    }

    /// <summary>Ssenarini dəyişir: yeni yol xəritəsi yaranır, eyni nömrəli və eyni adlı mərhələlərdəki tamamlanmış tapşırıqlar köçürülür; göndərilmiş sorğular köhnə işdə qalır (TZ 12.4).</summary>
    public Job ChangeScenario(User actor, Guid oldJobId, JobAnswers answers)
    {
        lock (store.Gate)
        {
            var old = store.Jobs.Find(oldJobId) ?? throw new ServiceException("İş tapılmadı.");
            RequireEdit(actor, old);
            var fresh = CreateJob(actor, old.InvestorUserId, answers);

            var oldGroup = catalog.Group(old.GroupCode);
            var newGroup = catalog.Group(fresh.GroupCode);
            var oldRuns = store.StageRuns.All().Where(r => r.JobId == old.Id).ToList();
            var oldTasks = store.TaskRuns.All().Where(t => t.JobId == old.Id).ToList();

            foreach (var nt in newGroup.Stages)
            {
                var ot = oldGroup.Stage(nt.Number);
                if (ot is null || !ot.Name.Equals(nt.Name, StringComparison.OrdinalIgnoreCase)) continue;
                foreach (var task in oldTasks.Where(t => t.StageNumber == nt.Number))
                {
                    var oldTemplate = Find(ot, task.Key);
                    var newTemplate = Find(nt, task.Key);
                    if (oldTemplate is null || newTemplate is null || oldTemplate.Text != newTemplate.Text) continue;
                    store.TaskRuns.Upsert(new TaskRun
                    {
                        JobId = fresh.Id, StageNumber = nt.Number, Key = task.Key,
                        DoneBy = task.DoneBy, OnBehalfOf = task.OnBehalfOf, DoneAt = task.DoneAt
                    });
                }
                var oldRun = oldRuns.FirstOrDefault(r => r.Number == nt.Number);
                var newRun = store.StageRuns.All().First(r => r.JobId == fresh.Id && r.Number == nt.Number);
                if (oldRun?.Answer is not null && newRun.Answer is null) { newRun.Answer = oldRun.Answer; }
                if (oldRun?.AnchorDate is not null) newRun.AnchorDate = oldRun.AnchorDate;
                store.StageRuns.Upsert(newRun);
            }

            foreach (var d in store.Documents.All().Where(d => d.JobId == old.Id && d.ResultOfRequestId is null))
            {
                store.Documents.Upsert(new Document
                {
                    JobId = fresh.Id, Type = d.Type, FileName = d.FileName, StoredName = d.StoredName,
                    ContentType = d.ContentType, Size = d.Size, SourceCountry = d.SourceCountry,
                    Foreign = d.Foreign, Review = d.Review, ReviewReason = d.ReviewReason,
                    ValidUntil = d.ValidUntil, UploadedBy = d.UploadedBy, UploadedAt = d.UploadedAt,
                    StageNumbers = d.StageNumbers.Where(n => newGroup.Stage(n) is not null).ToList()
                });
            }

            fresh.CoordinatorId = old.CoordinatorId ?? fresh.CoordinatorId;
            store.Jobs.Upsert(fresh);
            old.Closed = true;
            old.ReplacedByJobId = fresh.Id;
            store.Jobs.Upsert(old);
            audit.Record(actor, "job.change-scenario", "Job", fresh.Id.ToString(), fresh.Id,
                $"{old.ScenarioCode} → {fresh.ScenarioCode}", access.OnBehalfOf(actor, fresh));
            Refresh(fresh.Id, actor);
            return fresh;
        }
    }

    // ------------------------------------------------------------ mərhələ əməliyyatları

    public static TaskTemplate? Find(StageTemplate t, string key)
    {
        foreach (var top in t.Tasks)
        {
            if (top.Key == key) return top;
            var child = top.Children.FirstOrDefault(c => c.Key == key);
            if (child is not null) return child;
        }
        return null;
    }

    public void SetTask(User actor, Guid jobId, string stageNumber, string key, bool done)
    {
        lock (store.Gate)
        {
            var (job, t, run) = Load(jobId, stageNumber);
            RequireEdit(actor, job);
            if (!StageEngine.IsApplicable(t, run)) throw new ServiceException("Bu mərhələ hazırda fəal deyil.");
            var tpl = Find(t, key) ?? throw new ServiceException("Tapşırıq tapılmadı.");

            var existing = store.TaskRuns.All().Where(x => x.JobId == jobId && x.StageNumber == stageNumber).ToList();
            var keys = existing.Select(x => x.Key).ToHashSet();

            void Set(string k, bool on)
            {
                var row = existing.FirstOrDefault(x => x.Key == k);
                if (on && row is null)
                {
                    var created = new TaskRun
                    {
                        JobId = jobId, StageNumber = stageNumber, Key = k, DoneBy = actor.Id,
                        OnBehalfOf = access.OnBehalfOf(actor, job), DoneAt = clock.UtcNow
                    };
                    store.TaskRuns.Upsert(created); existing.Add(created); keys.Add(k);
                }
                else if (!on && row is not null)
                {
                    store.TaskRuns.Delete(row.Id); existing.Remove(row); keys.Remove(k);
                }
            }

            var parent = t.Tasks.FirstOrDefault(p => p.Children.Any(c => c.Key == key));
            if (parent is not null)
            {
                Set(key, done);
                Set(parent.Key, parent.Children.All(c => keys.Contains(c.Key)));
            }
            else
            {
                Set(key, done);
                foreach (var c in tpl.Children) Set(c.Key, done);
            }

            if (!StageEngine.AllMandatoryTasksDone(t, keys) && run.ReadyToSend)
            {
                run.ReadyToSend = false;
                store.StageRuns.Upsert(run);
            }
            audit.Record(actor, done ? "task.done" : "task.undone", "Task", $"{stageNumber}/{key}", jobId,
                tpl.Text.Length > 80 ? tpl.Text[..80] + "…" : tpl.Text, access.OnBehalfOf(actor, job));
            Refresh(jobId, actor);
        }
    }

    /// <summary>Şərti sual (bəli/xeyr), könüllü mərhələnin əlavə edilməsi və ya 2.1/2.2 alternativi.</summary>
    public void Answer(User actor, Guid jobId, string stageNumber, bool answer)
    {
        lock (store.Gate)
        {
            var (job, t, run) = Load(jobId, stageNumber);
            RequireEdit(actor, job);
            if (!run.OnPath) throw new ServiceException("Bu mərhələ seçilmiş yolda keçilmir.");

            if (t.HasTag(StageEngine.TagAltChannel))
            {
                run.Answer = answer;
                store.StageRuns.Upsert(run);
                var other = catalog.Group(job.GroupCode).Stages
                    .FirstOrDefault(s => s.Number != t.Number && s.HasTag(StageEngine.TagAltChannel));
                if (other is not null)
                {
                    var otherRun = store.StageRuns.All().First(r => r.JobId == jobId && r.Number == other.Number);
                    otherRun.Answer = !answer;
                    store.StageRuns.Upsert(otherRun);
                }
            }
            else if (t.Kind is StageKind.Conditional or StageKind.Voluntary)
            {
                if (t.Kind == StageKind.Voluntary && !answer)
                {
                    var hasWork = store.TaskRuns.All().Any(x => x.JobId == jobId && x.StageNumber == stageNumber)
                                  || store.Requests.All().Any(x => x.JobId == jobId && x.StageNumber == stageNumber);
                    if (hasWork) throw new ServiceException("Başlanmış mərhələ ləğv edilə bilməz.");
                }
                run.Answer = answer;
                store.StageRuns.Upsert(run);
            }
            else throw new ServiceException("Bu mərhələ məcburidir.");

            audit.Record(actor, "stage.answer", "Stage", stageNumber, jobId, answer ? "Bəli" : "Xeyr", access.OnBehalfOf(actor, job));
            Refresh(jobId, actor);
        }
    }

    public void SetAnchorDate(User actor, Guid jobId, string stageNumber, DateTime date)
    {
        lock (store.Gate)
        {
            var (job, t, run) = Load(jobId, stageNumber);
            RequireEdit(actor, job);
            if (t.Deadline is null || t.Deadline.AnchorStage is not null) throw new ServiceException("Bu mərhələ üçün tarix qeyd edilmir.");
            run.AnchorDate = date.Date;
            store.StageRuns.Upsert(run);
            audit.Record(actor, "stage.anchor", "Stage", stageNumber, jobId, date.ToString("yyyy-MM-dd"), access.OnBehalfOf(actor, job));
            Refresh(jobId, actor);
        }
    }

    /// <summary>İnvestor «göndərməyə hazıram» işarəsi qoyur; sorğunu koordinator yaradır və göndərir (açıq məsələ №1-in qəbul edilmiş həlli).</summary>
    public void SetReady(User actor, Guid jobId, string stageNumber, bool ready)
    {
        lock (store.Gate)
        {
            var (job, t, run) = Load(jobId, stageNumber);
            RequireEdit(actor, job);
            if (actor.Role == Role.Coordinator) throw new ServiceException("Hazırlıq işarəsini investor qoyur.");
            var view = Build(jobId).Stage(stageNumber)!;
            if (ready)
            {
                if (!view.Applicable) throw new ServiceException("Mərhələ fəal deyil.");
                if (!StageEngine.AllMandatoryTasksDone(t, view.DoneKeys))
                    throw new ServiceException("Bütün məcburi tapşırıqlar işarələnməyib.");
                if (view.BlockReason is not null) throw new ServiceException(view.BlockReason);
            }
            run.ReadyToSend = ready;
            store.StageRuns.Upsert(run);
            audit.Record(actor, ready ? "stage.ready" : "stage.unready", "Stage", stageNumber, jobId, "", access.OnBehalfOf(actor, job));
            if (ready && job.CoordinatorId is { } c)
                notes.Notify(c, $"ready:{jobId}:{stageNumber}:{clock.UtcNow.Ticks}",
                    $"{job.Title}: Mərhələ {stageNumber} qurumlara göndərməyə hazırdır.", $"/Coordinator/Job/{jobId}");
        }
    }

    // ------------------------------------------------------------ status yeniləmə

    /// <summary>Mərhələlərin başlama/tamamlanma tarixlərini saxlayır, tamamlananda bildiriş göndərir.</summary>
    public void Refresh(Guid jobId, User? actor = null)
    {
        lock (store.Gate)
        {
            var view = Build(jobId);
            foreach (var s in view.Stages)
            {
                var run = s.Run;
                var changed = false;
                if (run.StartedAt is null && s.Status is not (StageStatus.NotStarted or StageStatus.NotOnPath
                        or StageStatus.NotApplicable or StageStatus.NotAdded))
                { run.StartedAt = clock.UtcNow; changed = true; }

                if (s.Status == StageStatus.Completed && run.CompletedAt is null)
                {
                    run.CompletedAt = clock.UtcNow; changed = true;
                    notes.Notify(view.Job.InvestorUserId, $"stage-done:{jobId}:{s.Number}",
                        $"Mərhələ {s.Number} tamamlandı: {s.Template.Name}", $"/Investor/Stage/{s.Number}");
                }
                else if (s.Status != StageStatus.Completed && run.CompletedAt is not null)
                { run.CompletedAt = null; changed = true; }

                if (changed) store.StageRuns.Upsert(run);
            }
        }
    }

    // ------------------------------------------------------------ son tarix bildirişləri

    /// <summary>Qanuni son tarixə 7 gün qalanda və keçəndə bildiriş (TZ 12.3). Təkrar göndərilmir.</summary>
    public int ScanDeadlines()
    {
        lock (store.Gate)
        {
            var sent = 0;
            foreach (var job in store.Jobs.All().Where(j => !j.Closed))
            {
                foreach (var d in Build(job.Id).Deadlines)
                {
                    string? kind = d.Severity switch
                    {
                        DeadlineSeverity.Overdue => "deadline-over",
                        DeadlineSeverity.Warning => "deadline-7",
                        _ => null
                    };
                    if (kind is null) continue;
                    var text = d.Severity == DeadlineSeverity.Overdue
                        ? $"{job.Title}: son tarix keçdi — {d.Label}."
                        : $"{job.Title}: son tarixə {d.DaysLeft} gün qalıb — {d.Label}.";
                    foreach (var uid in new[] { (Guid?)job.InvestorUserId, job.CoordinatorId }.Where(x => x.HasValue).Select(x => x!.Value))
                    {
                        var ev = $"{kind}:{job.Id}:{d.StageNumber}";
                        if (notes.AlreadySent(uid, ev)) continue;
                        notes.Notify(uid, ev, text, $"/Investor/Stage/{d.StageNumber}", email: true, sms: true);
                        sent++;
                    }
                }
            }
            return sent;
        }
    }

    // ------------------------------------------------------------ köməkçilər

    private (Job Job, StageTemplate T, StageRun Run) Load(Guid jobId, string stageNumber)
    {
        var job = store.Jobs.Find(jobId) ?? throw new ServiceException("İş tapılmadı.");
        var t = catalog.Group(job.GroupCode).Stage(stageNumber) ?? throw new ServiceException("Mərhələ tapılmadı.");
        var run = store.StageRuns.All().FirstOrDefault(r => r.JobId == jobId && r.Number == t.Number)
                  ?? throw new ServiceException("Mərhələ icrası tapılmadı.");
        return (job, t, run);
    }

    private void RequireEdit(User actor, Job job)
    {
        if (!access.CanEdit(actor, job))
            throw new ServiceException(actor.Role == Role.Representative
                ? "Etibarnamənin müddəti bitib: yalnız baxış mümkündür."
                : "Bu işi dəyişmək üçün icazəniz yoxdur.");
    }
}
