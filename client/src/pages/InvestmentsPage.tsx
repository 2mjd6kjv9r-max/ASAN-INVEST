import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatMoneyAz } from "../components/ProjectCard";
import { api, type Paginated } from "../lib/api";
import { pickLocalized, useI18n } from "../lib/i18n";
import type { Investment } from "../lib/types";

export function InvestmentsPage() {
  const { t, locale } = useI18n();
  const query = useQuery({
    queryKey: ["my-investments"],
    queryFn: () => api<Paginated<Investment>>("/me/investments"),
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-4xl">{t.investments.title}</h1>
      {query.data?.data.length === 0 && <p className="mt-6">{t.investments.empty}</p>}
      <ul className="mt-6 space-y-3">
        {query.data?.data.map((item) => (
          <li key={item.id} className="rounded-2xl border border-sand-200 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-gold-600">{item.publicRef}</p>
                <p className="font-serif text-xl">
                  {item.project
                    ? pickLocalized(locale, item.project.titleAz, item.project.titleEn)
                    : item.id}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatMoneyAz(item.amount)} {item.currency}
                </p>
                <p className="text-sm">{t.status[item.status as keyof typeof t.status] ?? item.status}</p>
              </div>
            </div>
            {item.project && (
              <Link className="mt-2 inline-block text-sm underline" to={`/projects/${item.project.slug}`}>
                {item.project.slug}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
