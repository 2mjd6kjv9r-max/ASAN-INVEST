import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Envelope } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import type { Named, Project } from "../../lib/types";

const empty = {
  slug: "",
  titleAz: "",
  titleEn: "",
  summaryAz: "",
  summaryEn: "",
  descriptionAz: "",
  descriptionEn: "",
  agencyId: "",
  sectorId: "",
  region: "Bakı",
  targetAmount: "100000.00",
  minInvestment: "100.00",
  maxInvestment: "10000.00",
  fundingStartsAt: new Date().toISOString(),
  fundingEndsAt: new Date(Date.now() + 60 * 86400000).toISOString(),
  expectedReturnNote: "",
};

export function AdminProjectFormPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const agencies = useQuery({ queryKey: ["agencies"], queryFn: () => api<Envelope<Named[]>>("/agencies") });
  const sectors = useQuery({ queryKey: ["sectors"], queryFn: () => api<Envelope<Named[]>>("/sectors") });
  const existing = useQuery({
    queryKey: ["admin-project", id],
    enabled: Boolean(id),
    queryFn: () => api<Envelope<Project>>(`/admin/projects/${id}`),
  });

  useEffect(() => {
    const project = existing.data?.data;
    if (!project) return;
    setForm({
      slug: project.slug,
      titleAz: project.titleAz,
      titleEn: project.titleEn,
      summaryAz: project.summaryAz,
      summaryEn: project.summaryEn,
      descriptionAz: project.descriptionAz,
      descriptionEn: project.descriptionEn,
      agencyId: project.agency.id,
      sectorId: project.sector.id,
      region: project.region,
      targetAmount: project.targetAmount,
      minInvestment: project.minInvestment,
      maxInvestment: project.maxInvestment ?? "",
      fundingStartsAt: project.fundingStartsAt,
      fundingEndsAt: project.fundingEndsAt,
      expectedReturnNote: project.expectedReturnNote ?? "",
    });
  }, [existing.data]);

  useEffect(() => {
    if (!form.agencyId && agencies.data?.data[0]) {
      setForm((current) => ({ ...current, agencyId: agencies.data!.data[0].id }));
    }
    if (!form.sectorId && sectors.data?.data[0]) {
      setForm((current) => ({ ...current, sectorId: sectors.data!.data[0].id }));
    }
  }, [agencies.data, sectors.data, form.agencyId, form.sectorId]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        maxInvestment: form.maxInvestment || null,
        expectedReturnNote: form.expectedReturnNote || null,
      };
      if (id) return api(`/admin/projects/${id}`, { method: "PATCH", body });
      return api("/admin/projects", { method: "POST", body });
    },
    onSuccess: () => navigate("/admin/projects"),
  });

  const set = (key: keyof typeof empty, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid max-w-3xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="font-serif text-3xl">{id ? "Edit project" : t.admin.create}</h1>
      {Object.entries({
        slug: "slug",
        titleAz: "titleAz",
        titleEn: "titleEn",
        summaryAz: "summaryAz",
        summaryEn: "summaryEn",
        descriptionAz: "descriptionAz",
        descriptionEn: "descriptionEn",
        region: "region",
        targetAmount: "targetAmount",
        minInvestment: "minInvestment",
        maxInvestment: "maxInvestment",
        fundingStartsAt: "fundingStartsAt",
        fundingEndsAt: "fundingEndsAt",
        expectedReturnNote: "expectedReturnNote",
      }).map(([key, label]) => (
        <label key={key} className="text-sm">
          {label}
          <textarea
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2"
            rows={key.startsWith("description") || key.startsWith("summary") ? 3 : 1}
            value={form[key as keyof typeof empty]}
            onChange={(event) => set(key as keyof typeof empty, event.target.value)}
          />
        </label>
      ))}
      <label className="text-sm">
        Agency
        <select
          className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2"
          value={form.agencyId}
          onChange={(event) => set("agencyId", event.target.value)}
        >
          {agencies.data?.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nameEn}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Sector
        <select
          className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2"
          value={form.sectorId}
          onChange={(event) => set("sectorId", event.target.value)}
        >
          {sectors.data?.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nameEn}
            </option>
          ))}
        </select>
      </label>
      <button className="mt-2 w-fit rounded-full bg-gold-500 px-5 py-2 text-navy-950">{t.admin.save}</button>
    </form>
  );
}
