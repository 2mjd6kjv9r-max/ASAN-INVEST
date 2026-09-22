import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Paginated } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import type { User } from "../../lib/types";

export function AdminUsersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<Paginated<User>>("/admin/users"),
  });
  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      api(`/admin/users/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">{t.admin.users}</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-gold-400">
          <tr>
            <th className="py-2">Email</th>
            <th>Role</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {query.data?.data.map((user) => (
            <tr key={user.id} className="border-t border-white/10">
              <td className="py-2">{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td className="text-right">
                <button
                  onClick={() =>
                    patch.mutate({
                      id: user.id,
                      status: user.status === "suspended" ? "active" : "suspended",
                    })
                  }
                >
                  {user.status === "suspended" ? t.admin.activate : t.admin.suspend}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
