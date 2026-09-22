import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Envelope } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { User } from "../lib/types";
import { Field } from "./LoginPage";

export function RegisterPage() {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    nationalityType: "azerbaijani_citizen",
  });
  const [error, setError] = useState("");

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">{t.auth.registerTitle}</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            const res = await api<Envelope<{ user: User; accessToken: string }>>("/auth/register", {
              method: "POST",
              body: form,
            });
            setSession(res.data.user, res.data.accessToken);
            navigate("/app/profile");
          } catch (err) {
            setError((err as { message?: string }).message ?? t.common.error);
          }
        }}
      >
        <Field label={t.auth.firstName} value={form.firstName} onChange={(firstName) => setForm({ ...form, firstName })} />
        <Field label={t.auth.lastName} value={form.lastName} onChange={(lastName) => setForm({ ...form, lastName })} />
        <Field label={t.auth.email} value={form.email} onChange={(email) => setForm({ ...form, email })} type="email" />
        <Field
          label={t.auth.password}
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
          type="password"
        />
        <label className="block text-sm">
          <span className="mb-1 block">{t.auth.nationality}</span>
          <select
            className="w-full rounded-xl border border-sand-200 px-3 py-2"
            value={form.nationalityType}
            onChange={(event) => setForm({ ...form, nationalityType: event.target.value })}
          >
            <option value="azerbaijani_citizen">{t.auth.citizen}</option>
            <option value="foreign_citizen">{t.auth.foreign}</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="w-full rounded-full bg-navy-900 py-2.5 text-sand-50">{t.auth.submitRegister}</button>
      </form>
      <p className="mt-4 text-sm">
        {t.auth.hasAccount}{" "}
        <Link className="underline" to="/login">
          {t.nav.login}
        </Link>
      </p>
    </main>
  );
}
