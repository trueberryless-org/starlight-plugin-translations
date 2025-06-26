import { DashboardData } from "./data.ts";
import type { KeyStatus, Locale, LocaleKeys, Status } from "./schemas.ts";

type TranslationMap = Record<string, Record<string, string>>; // lang -> key -> value
export type DataPerKey = {
  key: string;
  locales: Record<string, Status>;
  line: number;
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

async function fetchTranslationFileRaw(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.text();
}

async function fetchTranslationFile(url: string): Promise<TranslationMap> {
  const text = await fetchTranslationFileRaw(url);

  // Extract the JSON-ish Translations object code
  const match = text.match(/export const Translations\s*=\s*(\{[\s\S]*\});?/);
  if (!match) throw new Error("Could not find Translations object in the file");

  const translationObject = new Function(
    `return ${match[1]}`
  )() as TranslationMap;
  return translationObject;
}

export async function processPlugins(): Promise<DataPerPlugin[]> {
  const results: DataPerPlugin[] = [];

  for (const plugin of DashboardData.plugins) {
    // Fetch raw file text to extract line numbers for English keys
    const rawText = await fetchTranslationFileRaw(
      plugin.translationFileLinkRaw
    );
    const lines = rawText.split(/\r?\n/);

    // Map base normalized key -> first line number (1-based)
    const baseKeyToLine = new Map<string, number>();

    let insideEnBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (/^en:\s*\{/.test(line)) {
        insideEnBlock = true;
        continue;
      }
      if (insideEnBlock && line === "},") {
        insideEnBlock = false;
      }
      if (insideEnBlock) {
        const keyMatch = line.match(/^['"]([^'"]+)['"]\s*:/);
        if (keyMatch) {
          const rawKey = keyMatch[1];
          const baseKey = normalizeKey(rawKey);
          if (!baseKeyToLine.has(baseKey)) {
            baseKeyToLine.set(baseKey, i + 1);
          }
        }
      }
    }

    const data = await fetchTranslationFile(plugin.translationFileLinkRaw);

    const defaultLang = "en";
    const defaultKeys = new Set(Object.keys(data[defaultLang] || {}));
    const normalizedDefaultKeys = new Set([...defaultKeys].map(normalizeKey));
    const allLocales = DashboardData.locales.map((l) => l.lang);

    const keysStatus: DataPerKey[] = [];

    for (const key of normalizedDefaultKeys) {
      const localesStatus: Record<string, "done" | "missing"> = {};

      for (const lang of allLocales) {
        if (lang === defaultLang) continue;

        const hasTranslation = Object.keys(data[lang] || {}).some(
          (k) => normalizeKey(k) === key
        );
        localesStatus[lang] = hasTranslation ? "done" : "missing";
      }

      const line = baseKeyToLine.get(key)!;

      keysStatus.push({ key, locales: localesStatus, line });
    }

    results.push({
      name: plugin.name,
      packageName: plugin.packageName,
      translationFileLink: plugin.translationFileLink,
      translationFileLinkRaw: plugin.translationFileLinkRaw,
      keys: keysStatus,
    });
  }

  // Now filter out languages with no 'done' status anywhere in any plugin
  // Collect all languages that have 'done' status in any plugin's keys
  const languagesWithTranslations = new Set<string>();

  for (const plugin of results) {
    for (const keyData of plugin.keys) {
      for (const [lang, status] of Object.entries(keyData.locales)) {
        if (status === "done") {
          languagesWithTranslations.add(lang);
        }
      }
    }
  }

  // Filter out locales in plugins keys for languages that never have any translation
  for (const plugin of results) {
    for (const keyData of plugin.keys) {
      for (const lang of Object.keys(keyData.locales)) {
        if (!languagesWithTranslations.has(lang)) {
          delete keyData.locales[lang];
        }
      }
    }
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
            lineNumber: entry.line,
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
    {
      locale: Locale;
      keys: {
        name: string;
        link: string;
        lineNumber: number;
        status: Status;
      }[];
    }
  >();

  for (const { key, statuses } of keyStatuses) {
    for (const { locale, status } of statuses) {
      const entry = localeMap.get(locale.lang);

      const keyEntry = {
        name: key.name,
        link: key.link,
        lineNumber: key.lineNumber,
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
