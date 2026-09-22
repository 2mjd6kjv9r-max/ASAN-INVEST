import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { formatMoneyAz } from "../components/ProjectCard";
import { api, type Envelope } from "../lib/api";
import { pickLocalized, useI18n } from "../lib/i18n";
import type { Project } from "../lib/types";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const { t, locale } = useI18n();
  const query = useQuery({
    queryKey: ["project", slug],
    queryFn: () => api<Envelope<Project>>(`/projects/${slug}`),
  });
  const project = query.data?.data;
  if (query.isLoading) return <p className="p-8">{t.common.loading}</p>;
  if (!project) return <p className="p-8">{t.common.error}</p>;
  const progress = Math.min(100, (Number(project.fundedAmount) / Number(project.targetAmount)) * 100);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
        {pickLocalized(locale, project.sector.nameAz, project.sector.nameEn)} · {project.region}
      </p>
      <h1 className="mt-3 font-serif text-4xl text-navy-900">
        {pickLocalized(locale, project.titleAz, project.titleEn)}
      </h1>
      <p className="mt-4 text-navy-700">{pickLocalized(locale, project.summaryAz, project.summaryEn)}</p>
      <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <Stat label={t.projects.target} value={`${formatMoneyAz(project.targetAmount)} ${t.common.azn}`} />
          <Stat label={t.projects.funded} value={`${formatMoneyAz(project.fundedAmount)} ${t.common.azn}`} />
          <Stat label={t.projects.remaining} value={`${formatMoneyAz(project.remainingAmount)} ${t.common.azn}`} />
          <Stat label={t.projects.min} value={`${formatMoneyAz(project.minInvestment)} ${t.common.azn}`} />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sand-100">
          <div className="h-full bg-navy-800" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-navy-700">
          {t.projects.window}: {new Date(project.fundingStartsAt).toLocaleDateString()} —{" "}
          {new Date(project.fundingEndsAt).toLocaleDateString()}
        </p>
        <p className="text-sm text-navy-700">
          {t.projects.agency}: {pickLocalized(locale, project.agency.nameAz, project.agency.nameEn)}
        </p>
      </div>
      <article className="prose mt-8 max-w-none text-navy-800">
        <p className="whitespace-pre-wrap">{pickLocalized(locale, project.descriptionAz, project.descriptionEn)}</p>
      </article>
      {project.expectedReturnNote && (
        <p className="mt-6 rounded-xl bg-sand-100 p-4 text-sm">
          <strong>{t.projects.returnNote}:</strong> {project.expectedReturnNote}
        </p>
      )}
      {project.updates && project.updates.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">{t.projects.updates}</h2>
          <ul className="mt-4 space-y-3">
            {project.updates.map((update) => (
              <li key={update.id} className="rounded-xl border border-sand-200 p-4">
                <p className="font-semibold">{pickLocalized(locale, update.titleAz, update.titleEn)}</p>
                <p className="text-sm text-navy-700">{pickLocalized(locale, update.bodyAz, update.bodyEn)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link
        to={`/projects/${project.slug}/invest`}
        className="mt-8 inline-block rounded-full bg-navy-900 px-6 py-3 text-sand-50"
      >
        {t.projects.invest}
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gold-600">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
