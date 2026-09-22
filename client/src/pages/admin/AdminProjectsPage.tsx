import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type Paginated } from "../../lib/api";
import { pickLocalized, useI18n } from "../../lib/i18n";
import type { Project } from "../../lib/types";

export function AdminProjectsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-projects"],
    queryFn: () => api<Paginated<Project>>("/admin/projects"),
  });
  const publish = useMutation({
    mutationFn: (id: string) => api(`/admin/projects/${id}/publish`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">{t.admin.projects}</h1>
        <Link className="rounded-full bg-gold-500 px-4 py-2 text-navy-950" to="/admin/projects/new">
          {t.admin.create}
        </Link>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-gold-400">
          <tr>
            <th className="py-2">Slug</th>
            <th>Title</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {query.data?.data.map((project) => (
            <tr key={project.id} className="border-t border-white/10">
              <td className="py-2">{project.slug}</td>
              <td>{pickLocalized(locale, project.titleAz, project.titleEn)}</td>
              <td>{project.status}</td>
              <td className="space-x-2 text-right">
                <Link className="underline" to={`/admin/projects/${project.id}`}>
                  Edit
                </Link>
                <button className="underline" onClick={() => publish.mutate(project.id)}>
                  {t.admin.publish}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
