import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMoneyAz } from "../components/ProjectCard";
import { api, type Envelope } from "../lib/api";
import { useAuth } from "../lib/auth";
import { pickLocalized, useI18n } from "../lib/i18n";
import type { Investment, Project } from "../lib/types";

export function InvestPage() {
  const { slug = "" } = useParams();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Investment | null>(null);
  const [error, setError] = useState("");
  const projectQuery = useQuery({
    queryKey: ["project", slug],
    queryFn: () => api<Envelope<Project>>(`/projects/${slug}`),
  });
  const project = projectQuery.data?.data;

  const create = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("missing project");
      return api<Envelope<Investment>>(`/projects/${project.id}/investments`, {
        method: "POST",
        body: { amount },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
    },
    onSuccess: (res) => {
      setResult(res.data);
      setError("");
    },
    onError: (err: { message?: string }) => setError(err.message ?? t.common.error),
  });

  if (!project) return <p className="p-8">{t.common.loading}</p>;
  const kyc = user?.profile?.kycStatus;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm">
        <Link to={`/projects/${slug}`} className="underline">
          {pickLocalized(locale, project.titleAz, project.titleEn)}
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl">{t.invest.title}</h1>
      <p className="mt-2 text-sm text-navy-700">
        {t.projects.min} {formatMoneyAz(project.minInvestment)} {t.common.azn} · {t.projects.remaining}{" "}
        {formatMoneyAz(project.remainingAmount)} {t.common.azn}
      </p>
      {kyc !== "approved" && (
        <p className="mt-4 rounded-xl bg-sand-100 p-3 text-sm">
          {t.profile.kyc}: {t.status[kyc as keyof typeof t.status] ?? kyc}.{" "}
          <Link className="underline" to="/app/profile">
            {t.nav.profile}
          </Link>
        </p>
      )}
      {!result ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <label className="block text-sm">
            {t.invest.amount}
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={project.minInvestment}
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="rounded-full bg-navy-900 px-5 py-2 text-sand-50" disabled={kyc !== "approved"}>
            {t.invest.submit}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-3 rounded-2xl border border-sand-200 p-4">
          <p>{t.invest.success}</p>
          <p className="font-semibold">
            {result.publicRef} · {formatMoneyAz(result.amount)} {result.currency}
          </p>
          <p className="text-sm">{t.status[result.status as keyof typeof t.status]}</p>
          {result.status === "pending_payment" && (
            <div className="flex gap-2">
              <button
                className="rounded-full bg-navy-900 px-4 py-2 text-sand-50"
                onClick={async () => {
                  const res = await api<Envelope<Investment>>(`/investments/${result.id}/pay-stub`, {
                    method: "POST",
                    body: { succeed: true },
                  });
                  setResult(res.data);
                }}
              >
                {t.invest.pay}
              </button>
              <button
                className="rounded-full border px-4 py-2"
                onClick={async () => {
                  const res = await api<Envelope<Investment>>(`/investments/${result.id}/pay-stub`, {
                    method: "POST",
                    body: { succeed: false },
                  });
                  setResult(res.data);
                }}
              >
                {t.invest.payFail}
              </button>
            </div>
          )}
          <Link className="block underline" to="/app/investments">
            {t.nav.investments}
          </Link>
        </div>
      )}
    </main>
  );
}
