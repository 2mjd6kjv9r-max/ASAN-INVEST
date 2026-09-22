import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Envelope } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { User } from "../lib/types";

export function LoginPage() {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">{t.auth.loginTitle}</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            const res = await api<Envelope<{ user: User; accessToken: string }>>("/auth/login", {
              method: "POST",
              body: { email, password },
            });
            setSession(res.data.user, res.data.accessToken);
            navigate(res.data.user.role === "investor" ? "/projects" : "/admin");
          } catch (err) {
            setError((err as { message?: string }).message ?? t.common.error);
          }
        }}
      >
        <Field label={t.auth.email} value={email} onChange={setEmail} type="email" />
        <Field label={t.auth.password} value={password} onChange={setPassword} type="password" />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="w-full rounded-full bg-navy-900 py-2.5 text-sand-50">{t.auth.submitLogin}</button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="underline" to="/forgot-password">
          {t.auth.forgot}
        </Link>
      </p>
      <p className="mt-2 text-sm">
        {t.auth.noAccount}{" "}
        <Link className="underline" to="/register">
          {t.nav.register}
        </Link>
      </p>
    </main>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-navy-700">{label}</span>
      <input
        className="w-full rounded-xl border border-sand-200 px-3 py-2"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
