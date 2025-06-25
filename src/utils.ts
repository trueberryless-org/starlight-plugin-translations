import { DashboardData } from "./data.ts";
import type { KeyStatus, Locale, LocaleKeys, Status } from "./schemas.ts";

type TranslationMap = Record<string, Record<string, string>>; // lang -> key -> value
export type DataPerKey = {
  key: string;
  locales: Record<string, Status>;
};

export type DataPerPlugin = {
  name: string;
  packageName: string;
  translationFileLink: string;
  translationFileLinkRaw: string;
  keys: DataPerKey[];
};

export type DataPerLanguage = {
  lang: string;
  statuses: Record<Status, string[]>;
};

const pluralSuffixes = ["_zero", "_one", "_two", "_few", "_many", "_other"];

// Normalize default keys by stripping i18next plural suffixes
function normalizeKey(key: string): string {
  for (const suffix of pluralSuffixes) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return key;
}

// Utility to fetch the remote .ts file and parse it
async function fetchTranslationFile(url: string): Promise<TranslationMap> {
  const res = await fetch(url);
  const text = await res.text();

  // Extract the JSON-ish object from the file
  const match = text.match(/export const Translations\s*=\s*(\{[\s\S]*\});?/);
  if (!match) throw new Error("Could not find Translations object in the file");

  // Safely eval or use Function constructor (sandboxing highly recommended in real prod code)
  const translationObject = new Function(
    `return ${match[1]}`
  )() as TranslationMap;
  return translationObject;
}

export async function processPlugins(): Promise<DataPerPlugin[]> {
  const results: DataPerPlugin[] = [];

  for (const plugin of DashboardData.plugins) {
    const data = await fetchTranslationFile(plugin.translationFileLinkRaw);

    const defaultLang = "en";
    const defaultKeys = new Set(Object.keys(data[defaultLang] || {}));
    const normalizedDefaultKeys = new Set([...defaultKeys].map(normalizeKey));
    const allLocales = DashboardData.locales.map((l) => l.lang);

    const keysStatus: DataPerKey[] = [];

    for (const key of normalizedDefaultKeys) {
      const localesStatus: Record<string, Status> = {};

      for (const lang of allLocales) {
        if (lang === defaultLang) continue;

        const hasTranslation = Object.keys(data[lang] || {}).some(
          (k) => normalizeKey(k) === key
        );
        localesStatus[lang] = hasTranslation ? "done" : "missing";
      }

      keysStatus.push({ key, locales: localesStatus });
    }

    results.push({
      name: plugin.name,
      packageName: plugin.packageName,
      translationFileLink: plugin.translationFileLink,
      translationFileLinkRaw: plugin.translationFileLinkRaw,
      keys: keysStatus,
    });
  }

  return results;
}

export function pluginToLanguageTransformer(
  plugins: DataPerPlugin[]
): DataPerLanguage[] {
  const languageMap = new Map<string, Record<Status, string[]>>();

  for (const plugin of plugins) {
    for (const { key, locales } of plugin.keys) {
      for (const [lang, status] of Object.entries(locales)) {
        if (!languageMap.has(lang)) {
          languageMap.set(lang, { done: [], missing: [] });
        }

        languageMap.get(lang)![status].push(key);
      }
    }
  }

  const result: DataPerLanguage[] = [];

  for (const [lang, statuses] of languageMap.entries()) {
    result.push({ lang, statuses });
  }

  return result;
}

export function convertToKeyStatuses(data: DataPerPlugin[]): KeyStatus[] {
  const keyMap = new Map<string, KeyStatus>();

  for (const plugin of data) {
    for (const entry of plugin.keys) {
      if (!keyMap.has(entry.key)) {
        keyMap.set(entry.key, {
          key: {
            name: entry.key,
            link: plugin.translationFileLink,
          },
          statuses: [],
        });
      }

      const keyEntry = keyMap.get(entry.key)!;

      for (const [lang, status] of Object.entries(entry.locales)) {
        const locale = getLocaleByLang(lang);
        keyEntry.statuses.push({ locale, status });
      }
    }
  }

  return Array.from(keyMap.values());
}

export function getLocaleByLang(lang: string): Locale {
  const locale = DashboardData.locales.find((l) => l.lang === lang);
  if (!locale) throw new Error(`Locale not found for lang: ${lang}`);
  return locale;
}

export function keyStatusesToLocaleKeys(
  keyStatuses: KeyStatus[],
  targetLocale: Locale
): LocaleKeys {
  return {
    locale: targetLocale,
    keys: keyStatuses.map((ks) => {
      const statusEntry = ks.statuses.find(
        (s) => s.locale.lang === targetLocale.lang
      );
      return {
        ...ks.key,
        status: statusEntry?.status ?? "missing", // fallback to 'missing' if not found
      };
    }),
  };
}

export function convertKeyStatusesToLocaleKeys(
  keyStatuses: KeyStatus[]
): LocaleKeys[] {
  const localeMap = new Map<
    string,
    { locale: Locale; keys: { name: string; link: string; status: Status }[] }
  >();

  for (const { key, statuses } of keyStatuses) {
    for (const { locale, status } of statuses) {
      const entry = localeMap.get(locale.lang);

      const keyEntry = {
        name: key.name,
        link: key.link,
        status,
      };

      if (entry) {
        entry.keys.push(keyEntry);
      } else {
        localeMap.set(locale.lang, {
          locale,
          keys: [keyEntry],
        });
      }
    }
  }

  return Array.from(localeMap.values());
}
