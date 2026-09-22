import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export function Shell() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="bg-navy-900 text-gold-400 px-4 py-2 text-center text-xs tracking-wide">
        {t.demoBanner}
      </div>
      <header className="sticky top-0 z-20 border-b border-sand-200/80 bg-sand-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-semibold text-navy-900">{t.brand}</span>
            <span className="hidden text-xs uppercase tracking-[0.2em] text-navy-700 sm:inline">
              {t.tagline}
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-navy-800">
            <NavLink to="/projects" className={({ isActive }) => (isActive ? "text-gold-600" : "")}>
              {t.nav.projects}
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? "text-gold-600" : "")}>
              {t.nav.about}
            </NavLink>
            {user ? (
              <>
                <NavLink to="/app/investments">{t.nav.investments}</NavLink>
                <NavLink to="/app/profile">{t.nav.profile}</NavLink>
                {(user.role === "admin" || user.role === "operator") && (
                  <NavLink to="/admin">{t.nav.admin}</NavLink>
                )}
                <button
                  className="rounded-full border border-navy-800 px-3 py-1"
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">{t.nav.login}</NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-navy-900 px-3 py-1 text-sand-50"
                >
                  {t.nav.register}
                </NavLink>
              </>
            )}
            <button
              className="rounded-full border border-sand-200 px-2 py-1 text-xs uppercase"
              onClick={() => setLocale(locale === "az" ? "en" : "az")}
            >
              {locale === "az" ? "EN" : "AZ"}
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-16 border-t border-sand-200 px-4 py-8 text-center text-xs text-navy-700">
        {t.demoBanner}
      </footer>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <p className="p-8">{t.common.loading}</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="mb-4">{t.nav.login}</p>
        <Link className="underline" to="/login">
          {t.nav.login}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (user.role !== "admin" && user.role !== "operator")) {
    return <p className="p-8">Forbidden</p>;
  }
  return <>{children}</>;
}
