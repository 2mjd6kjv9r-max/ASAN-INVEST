import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, type Envelope } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { User } from "../lib/types";

export function ProfilePage() {
  const { t } = useI18n();
  const { reload } = useAuth();
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Envelope<User>>("/auth/me"),
  });
  const user = me.data?.data;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    patronymic: "",
    dateOfBirth: "",
    fin: "",
    passportNumber: "",
    phone: "",
    city: "",
    country: "",
    addressLine: "",
    countryOfCitizenship: "",
  });
  const [type, setType] = useState("id_card");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.profile) return;
    setForm({
      firstName: user.profile.firstName ?? "",
      lastName: user.profile.lastName ?? "",
      patronymic: user.profile.patronymic ?? "",
      dateOfBirth: user.profile.dateOfBirth ?? "",
      fin: user.profile.fin ?? "",
      passportNumber: user.profile.passportNumber ?? "",
      phone: user.profile.phone ?? "",
      city: user.profile.city ?? "",
      country: user.profile.country ?? "",
      addressLine: user.profile.addressLine ?? "",
      countryOfCitizenship: user.profile.countryOfCitizenship ?? "",
    });
  }, [user]);

  const save = useMutation({
    mutationFn: () => api("/me/profile", { method: "PUT", body: form }),
    onSuccess: async () => {
      setMessage("OK");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await reload();
    },
  });

  if (!user) return <p className="p-8">{t.common.loading}</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl">{t.profile.title}</h1>
      <p className="mt-2 text-sm">
        {t.profile.kyc}:{" "}
        <strong>{t.status[user.profile?.kycStatus as keyof typeof t.status] ?? user.profile?.kycStatus}</strong>
      </p>
      {user.profile?.kycRejectReason && (
        <p className="mt-2 text-sm text-red-700">{user.profile.kycRejectReason}</p>
      )}
      <form
        className="mt-6 grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {Object.entries({
          firstName: t.auth.firstName,
          lastName: t.auth.lastName,
          patronymic: t.profile.patronymic,
          dateOfBirth: t.profile.dob,
          fin: t.profile.fin,
          passportNumber: t.profile.passportNumber,
          phone: t.profile.phone,
          city: t.profile.city,
          country: t.profile.country,
          addressLine: t.profile.address,
          countryOfCitizenship: t.profile.citizenship,
        }).map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block">{label}</span>
            <input
              className="w-full rounded-xl border border-sand-200 px-3 py-2"
              type={key === "dateOfBirth" ? "date" : "text"}
              value={form[key as keyof typeof form]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </label>
        ))}
        <div className="md:col-span-2">
          <button className="rounded-full bg-navy-900 px-5 py-2 text-sand-50">{t.profile.save}</button>
          {message && <span className="ml-3 text-sm">{message}</span>}
        </div>
      </form>
      <form
        className="mt-10 space-y-3 rounded-2xl border border-sand-200 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return;
          const data = new FormData();
          data.append("file", file);
          data.append("type", type);
          await api("/me/kyc-documents", { method: "POST", body: data });
          await queryClient.invalidateQueries({ queryKey: ["me"] });
          setFile(null);
        }}
      >
        <h2 className="font-serif text-2xl">{t.profile.upload}</h2>
        <label className="block text-sm">
          {t.profile.type}
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="id_card">{t.profile.idCard}</option>
            <option value="passport">{t.profile.passport}</option>
            <option value="residence_permit">{t.profile.residence}</option>
            <option value="other">{t.profile.other}</option>
          </select>
        </label>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="rounded-full border border-navy-800 px-4 py-2">{t.profile.upload}</button>
      </form>
    </main>
  );
}
