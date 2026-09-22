import { Link } from "react-router-dom";
import { pickLocalized, useI18n } from "../lib/i18n";
import type { Project } from "../lib/types";

function formatMoney(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("az-AZ", { minimumFractionDigits: 2 }) : value;
}

export function ProjectCard({ project }: { project: Project }) {
  const { locale, t } = useI18n();
  const progress = Math.min(100, (Number(project.fundedAmount) / Number(project.targetAmount)) * 100);
  return (
    <Link
      to={`/projects/${project.slug}`}
      className="group flex flex-col rounded-2xl border border-sand-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gold-600">
        <span>{pickLocalized(locale, project.sector.nameAz, project.sector.nameEn)}</span>
        <span>{t.status[project.status as keyof typeof t.status] ?? project.status}</span>
      </div>
      <h3 className="mt-3 font-serif text-2xl text-navy-900 group-hover:text-navy-700">
        {pickLocalized(locale, project.titleAz, project.titleEn)}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-navy-700">
        {pickLocalized(locale, project.summaryAz, project.summaryEn)}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-100">
        <div className="h-full bg-navy-800" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-navy-700">
        <span>
          {t.projects.funded}: {formatMoney(project.fundedAmount)} {t.common.azn}
        </span>
        <span>
          {t.projects.remaining}: {formatMoney(project.remainingAmount)} {t.common.azn}
        </span>
      </div>
    </Link>
  );
}

export function formatMoneyAz(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("az-AZ", { minimumFractionDigits: 2 }) : value;
}
