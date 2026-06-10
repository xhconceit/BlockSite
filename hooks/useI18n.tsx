import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Substitutions = (string | number)[];
type Locale = "auto" | "en" | "zh_CN";

interface I18nContextValue {
  t: (key: string, substitutions?: Substitutions) => string;
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  categoryLabel: (category: string) => string;
  ruleTypeLabel: (type: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  t: (key: string) => key,
  locale: "auto",
  setLocale: async () => {},
  categoryLabel: (c: string) => c,
  ruleTypeLabel: (t: string) => t,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

let cachedMessages: Record<string, { message: string }> | null = null;
let cachedLocale = "";

async function loadMessages(locale: string): Promise<Record<string, { message: string }>> {
  if (cachedMessages !== null && cachedLocale === locale) {
    return cachedMessages;
  }
  const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
  const res = await fetch(url);
  cachedMessages = (await res.json()) as Record<string, { message: string }>;
  cachedLocale = locale;
  return cachedMessages;
}

async function getStoredLocale(): Promise<Locale> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getConfig" }, (response) => {
      const config = (response as Record<string, unknown>)?.["config"] as
        | Record<string, unknown>
        | undefined;
      resolve((config?.["locale"] as Locale) ?? "auto");
    });
  });
}

async function saveLocale(locale: Locale): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "setLocale", locale }, () => resolve());
  });
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("auto");
  const [manualMessages, setManualMessages] = useState<Record<string, { message: string }> | null>(
    null,
  );

  useEffect(() => {
    getStoredLocale().then((stored) => {
      setLocaleState(stored);
      if (stored !== "auto") {
        loadMessages(stored).then(setManualMessages).catch(console.error);
      }
    });
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    await saveLocale(newLocale);
    setLocaleState(newLocale);
    cachedMessages = null;
    cachedLocale = "";
    setManualMessages(null);
    if (newLocale !== "auto") {
      try {
        const msgs = await loadMessages(newLocale);
        setManualMessages(msgs);
      } catch (err) {
        console.error("[I18n] Failed to load messages for", newLocale, err);
      }
    }
  }, []);

  const t = useCallback(
    (key: string, substitutions?: Substitutions): string => {
      if (locale !== "auto" && manualMessages !== null) {
        const entry = manualMessages[key];
        if (entry === undefined) return key;
        let msg = entry.message;
        if (substitutions !== undefined) {
          for (let i = 0; i < substitutions.length; i++) {
            msg = msg.replace(`$${i + 1}$`, String(substitutions[i]));
          }
        }
        return msg;
      }
      if (typeof chrome === "undefined" || chrome.i18n?.getMessage === undefined) {
        return key;
      }
      return chrome.i18n.getMessage(key, substitutions as string[]) || key;
    },
    [locale, manualMessages],
  );

  const categoryLabel = useCallback(
    (category: string): string => {
      return t(`category.${category}`) || category;
    },
    [t],
  );

  const ruleTypeLabel = useCallback(
    (type: string): string => {
      return t(`ruleType.${type}`) || type;
    },
    [t],
  );

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, categoryLabel, ruleTypeLabel }}>
      {children}
    </I18nContext.Provider>
  );
}
