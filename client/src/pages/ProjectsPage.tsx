import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { api, type Paginated } from "../lib/api";
import { pickLocalized, useI18n } from "../lib/i18n";
import type { Named, Project } from "../lib/types";

export function ProjectsPage() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState("");
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sector) params.set("sector", sector);
    if (status) params.set("status", status);
    params.set("limit", "12");
    return `/projects?${params.toString()}`;
  }, [q, sector, status]);

  const projects = useQuery({
    queryKey: ["projects", query],
    queryFn: () => api<Paginated<Project>>(query),
  });
  const sectors = useQuery({
    queryKey: ["sectors"],
    queryFn: () => api<{ data: Named[] }>("/sectors"),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">{t.projects.title}</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <input
          className="rounded-xl border border-sand-200 bg-white px-3 py-2"
          placeholder={t.projects.search}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          className="rounded-xl border border-sand-200 bg-white px-3 py-2"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
        >
          <option value="">{t.projects.all}</option>
          {sectors.data?.data.map((item) => (
            <option key={item.id} value={item.slug}>
              {pickLocalized(locale, item.nameAz, item.nameEn)}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-sand-200 bg-white px-3 py-2"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t.projects.all}</option>
          {["funding", "published", "funded", "closed"].map((value) => (
            <option key={value} value={value}>
              {t.status[value as keyof typeof t.status]}
            </option>
          ))}
        </select>
      </div>
      {projects.isLoading && <p className="mt-8">{t.common.loading}</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {projects.data?.data.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {projects.data?.data.length === 0 && <p className="mt-8">{t.projects.empty}</p>}
    </main>
  );
}
