import { AstroError } from "astro/errors";

import { PLUGINS, type PluginConfig } from "../plugins";
import { getRawTranslationsFileUrl, getTranslationsFileUrl } from "./github";
import { type LocaleNames, getLocaleNames } from "./locale";
import { parseTranslations } from "./translations";

const DEFAULT_LOCALE = "en";
const FETCH_TIMEOUT_MS = 30_000;

let trackerDataPromise: Promise<TrackedPlugin[]> | undefined;

/**
 * Fetches and parses the translations of all tracked plugins. The result is shared between all pages of a build so
 * that each translations file is only fetched once.
 */
export function getTrackedPlugins(): Promise<TrackedPlugin[]> {
  trackerDataPromise ??= Promise.all(PLUGINS.map(trackPlugin));

  return trackerDataPromise;
}

/**
 * Returns all languages translated by at least one plugin, with the translation status of each plugin supporting it.
 */
export function getTrackedLanguages(
  plugins: TrackedPlugin[]
): TrackedLanguage[] {
  const languages = new Map<string, TrackedLanguage>();

  for (const plugin of plugins) {
    for (const locale of plugin.locales) {
      let language = languages.get(locale.lang);

      if (!language) {
        language = { ...locale.names, lang: locale.lang, plugins: [] };
        languages.set(locale.lang, language);
      }

      language.plugins.push({ locale, plugin });
    }
  }

  return [...languages.values()].sort((a, b) => a.lang.localeCompare(b.lang));
}

export function getProgress(keys: LocaleKey[]): Progress {
  const done = keys.filter((key) => key.isTranslated).length;

  return { done, missing: keys.length - done, total: keys.length };
}

export function getPluginProgress(plugin: TrackedPlugin): Progress {
  return mergeProgress(
    plugin.locales.map((locale) => getProgress(locale.keys))
  );
}

export function getLanguageProgress(language: TrackedLanguage): Progress {
  return mergeProgress(
    language.plugins.map(({ locale }) => getProgress(locale.keys))
  );
}

function mergeProgress(progresses: Progress[]): Progress {
  const progress: Progress = { done: 0, missing: 0, total: 0 };

  for (const { done, missing, total } of progresses) {
    progress.done += done;
    progress.missing += missing;
    progress.total += total;
  }

  return progress;
}

async function trackPlugin(config: PluginConfig): Promise<TrackedPlugin> {
  const source = await fetchTranslationsFile(config);
  const translations = parseTranslations(source, config.translationsPath);

  const defaultKeys = translations.get(DEFAULT_LOCALE);
  if (!defaultKeys) {
    throw new AstroError(
      `The translations of the \`${config.packageName}\` plugin do not include the default \`${DEFAULT_LOCALE}\` locale.`,
      `Check the translations file at ${getTranslationsFileUrl(config)}.`
    );
  }

  const keys: TrackedKey[] = [...defaultKeys].map(([name, line]) => ({
    name,
    url: getTranslationsFileUrl(config, line),
  }));

  const locales: TrackedLocale[] = [...translations]
    .filter(([lang]) => lang !== DEFAULT_LOCALE)
    .map(([lang, localeKeys]) => ({
      keys: keys.map((key) => ({
        ...key,
        isTranslated: localeKeys.has(key.name),
      })),
      lang,
      names: getLocaleNames(lang),
    }))
    .sort((a, b) => a.lang.localeCompare(b.lang));

  return { config, keys, locales, url: getTranslationsFileUrl(config) };
}

async function fetchTranslationsFile(config: PluginConfig): Promise<string> {
  const url = getRawTranslationsFileUrl(config);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);

    return await response.text();
  } catch (error) {
    throw new AstroError(
      `Failed to fetch the translations of the \`${config.packageName}\` plugin from ${url}: ${error instanceof Error ? error.message : String(error)}.`,
      `Check that the \`repository\`, \`translationsPath\` and \`branch\` options in \`src/plugins.ts\` still point to an existing file.`
    );
  }
}

export interface TrackedPlugin {
  config: PluginConfig;
  /** The keys of the default locale. */
  keys: TrackedKey[];
  /** The non-default locales translated by the plugin. */
  locales: TrackedLocale[];
  url: string;
}

export interface TrackedKey {
  name: string;
  /** Links to the definition of the key in the default locale. */
  url: string;
}

export interface LocaleKey extends TrackedKey {
  isTranslated: boolean;
}

export interface TrackedLocale {
  /** All keys of the default locale, in the same order as `TrackedPlugin.keys`. */
  keys: LocaleKey[];
  lang: string;
  names: LocaleNames;
}

export interface TrackedLanguage extends LocaleNames {
  lang: string;
  plugins: { locale: TrackedLocale; plugin: TrackedPlugin }[];
}

export interface Progress {
  done: number;
  missing: number;
  total: number;
}
