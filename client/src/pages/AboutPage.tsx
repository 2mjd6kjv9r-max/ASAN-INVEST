import { useI18n } from "../lib/i18n";

export function AboutPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl">{t.about.title}</h1>
      <p className="mt-6 text-lg text-navy-800">{t.about.body}</p>
      <p className="mt-4 rounded-xl bg-sand-100 p-4 text-sm">{t.about.legal}</p>
    </main>
  );
}
