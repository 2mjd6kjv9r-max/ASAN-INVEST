import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react";
import { az } from "../i18n/az";
import { en, type Messages } from "../i18n/en";

export type Locale = "az" | "en";

const STORAGE_KEY = "asan-invest-locale";
const dict: Record<Locale, Messages> = { az, en };

type I18nValue = {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

function readLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "az" ? stored : "az";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "az" : readLocale(),
  );
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: dict[locale],
      setLocale: (next) => {
        localStorage.setItem(STORAGE_KEY, next);
        setLocaleState(next);
        document.documentElement.lang = next;
      },
    }),
    [locale],
  );
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider missing");
  return ctx;
}

export function pickLocalized(locale: Locale, azValue: string, enValue: string) {
  return locale === "az" ? azValue : enValue;
}
