import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { api, type Paginated } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Project } from "../lib/types";

export function HomePage() {
  const { t } = useI18n();
  const projects = useQuery({
    queryKey: ["projects", "home"],
    queryFn: () => api<Paginated<Project>>("/projects?limit=3&status=funding"),
  });

  return (
    <main className="buta-bg">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-600">{t.home.kicker}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-navy-900 md:text-6xl">
            {t.home.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-navy-700">{t.home.lead}</p>
          <div className="mt-8 flex gap-3">
            <Link to="/projects" className="rounded-full bg-navy-900 px-5 py-2.5 text-sand-50">
              {t.home.browse}
            </Link>
            <Link to="/about" className="rounded-full border border-navy-800 px-5 py-2.5">
              {t.nav.about}
            </Link>
          </div>
        </div>
        <aside className="rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-card">
          <p className="font-serif text-2xl text-navy-900">{t.home.how}</p>
          <ol className="mt-4 space-y-4">
            {t.home.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="font-serif text-gold-600">{index + 1}</span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-navy-700">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-3xl">{t.home.featured}</h2>
          <Link to="/projects" className="text-sm underline">
            {t.home.viewAll}
          </Link>
        </div>
        {projects.isLoading && <p>{t.common.loading}</p>}
        <div className="grid gap-5 md:grid-cols-3">
          {projects.data?.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </main>
  );
}
