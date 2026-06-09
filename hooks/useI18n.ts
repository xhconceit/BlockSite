import { useCallback } from "react";

type Substitutions = (string | number)[];

export function useI18n() {
  const t = useCallback((key: string, substitutions?: Substitutions): string => {
    if (typeof chrome === "undefined" || chrome.i18n?.getMessage === undefined) {
      return key;
    }
    return chrome.i18n.getMessage(key, substitutions as string[]) || key;
  }, []);

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

  const quoteText = useCallback(
    (category: string, index: number): string => {
      return t(`quote.${category}.${index}`) || "";
    },
    [t],
  );

  return { t, categoryLabel, ruleTypeLabel, quoteText };
}
