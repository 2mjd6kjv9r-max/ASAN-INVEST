import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Paginated } from "../../lib/api";
import { useI18n } from "../../lib/i18n";

type KycRow = {
  firstName: string;
  lastName: string;
  kycStatus: string;
  user: { id: string; email: string; nationalityType: string };
};

export function AdminKycPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: () => api<Paginated<KycRow>>("/admin/kyc?status=pending"),
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api(`/admin/kyc/${id}/${action}`, {
        method: "POST",
        body: action === "reject" ? { reason: "Documents incomplete" } : {},
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-kyc"] }),
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">{t.admin.kyc}</h1>
      <ul className="mt-6 space-y-3">
        {query.data?.data.map((row) => (
          <li key={row.user.id} className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold">
              {row.firstName} {row.lastName} — {row.user.email}
            </p>
            <p className="text-sm text-gold-400">{row.user.nationalityType}</p>
            <div className="mt-2 space-x-2">
              <button onClick={() => decide.mutate({ id: row.user.id, action: "approve" })}>
                {t.admin.approve}
              </button>
              <button onClick={() => decide.mutate({ id: row.user.id, action: "reject" })}>
                {t.admin.reject}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
