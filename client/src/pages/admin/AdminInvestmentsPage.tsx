import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Paginated } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import type { Investment } from "../../lib/types";

export function AdminInvestmentsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-investments"],
    queryFn: () => api<Paginated<Investment>>("/admin/investments"),
  });
  const confirm = useMutation({
    mutationFn: (id: string) => api(`/admin/investments/${id}/confirm`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-investments"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/investments/${id}/reject`, { method: "POST", body: { reason: "Does not meet review criteria" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-investments"] }),
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">{t.admin.investments}</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-gold-400">
          <tr>
            <th className="py-2">Ref</th>
            <th>User</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {query.data?.data.map((item) => (
            <tr key={item.id} className="border-t border-white/10">
              <td className="py-2">{item.publicRef}</td>
              <td>{item.user?.email}</td>
              <td>
                {item.amount} {item.currency}
              </td>
              <td>{item.status}</td>
              <td className="space-x-2 text-right">
                <button onClick={() => confirm.mutate(item.id)}>{t.admin.confirm}</button>
                <button onClick={() => reject.mutate(item.id)}>{t.admin.reject}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
