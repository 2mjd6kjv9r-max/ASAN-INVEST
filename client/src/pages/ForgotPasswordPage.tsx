import { useState } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Field } from "./LoginPage";

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">{t.auth.forgot}</h1>
      <p className="mt-3 text-sm text-navy-700">{t.auth.forgotLead}</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await api("/auth/forgot-password", { method: "POST", body: { email } });
          setDone(true);
        }}
      >
        <Field label={t.auth.email} value={email} onChange={setEmail} type="email" />
        <button className="w-full rounded-full bg-navy-900 py-2.5 text-sand-50">{t.auth.sendReset}</button>
      </form>
      {done && <p className="mt-4 text-sm">OK</p>}
    </main>
  );
}
