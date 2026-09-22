import { Link, NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../lib/i18n";

export function AdminLayout() {
  const { t } = useI18n();
  const item = "block rounded-lg px-3 py-2 text-sm hover:bg-navy-800";
  return (
    <div className="min-h-screen bg-navy-950 text-sand-100">
      <div className="bg-gold-500/20 px-4 py-2 text-center text-xs text-gold-400">{t.demoBanner}</div>
      <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
        <aside className="border-r border-white/10 p-4">
          <Link to="/" className="font-serif text-xl">
            {t.brand}
          </Link>
          <p className="mt-1 text-xs uppercase tracking-widest text-gold-400">{t.admin.title}</p>
          <nav className="mt-6 space-y-1">
            <NavLink className={item} to="/admin/projects">
              {t.admin.projects}
            </NavLink>
            <NavLink className={item} to="/admin/investments">
              {t.admin.investments}
            </NavLink>
            <NavLink className={item} to="/admin/kyc">
              {t.admin.kyc}
            </NavLink>
            <NavLink className={item} to="/admin/users">
              {t.admin.users}
            </NavLink>
          </nav>
        </aside>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
