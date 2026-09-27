export const DEFAULT_BRANCH = "main";

/**
 * The Starlight plugins tracked by this website, sorted alphabetically by name.
 *
 * To track a new plugin, add an entry pointing to the file exporting its UI translations object.
 * @see https://hideoo.dev/notes/starlight-plugin-use-custom-translation-strings
 */
export const PLUGINS: PluginConfig[] = [
  {
    name: "Starlight Announcement",
    packageName: "starlight-announcement",
    repository: "frostybee/starlight-announcement",
    translationsPath: "packages/starlight-announcement/src/translations.ts",
  },
  {
    name: "Starlight Blog",
    packageName: "starlight-blog",
    repository: "HiDeoo/starlight-blog",
    translationsPath: "packages/starlight-blog/translations.ts",
  },
  {
    name: "Starlight Cooler Credit",
    packageName: "starlight-cooler-credit",
    repository: "trueberryless-org/starlight-cooler-credit",
    translationsPath: "packages/starlight-cooler-credit/translations.ts",
  },
  {
    name: "Starlight Group Pages",
    packageName: "starlight-group-pages",
    repository: "trueberryless-org/starlight-group-pages",
    translationsPath: "packages/starlight-group-pages/translations.ts",
  },
  {
    name: "Starlight Kbd",
    packageName: "starlight-kbd",
    repository: "HiDeoo/starlight-kbd",
    translationsPath: "packages/starlight-kbd/translations.ts",
  },
  {
    name: "Starlight Tags",
    packageName: "starlight-tags",
    repository: "frostybee/starlight-tags",
    translationsPath: "packages/starlight-tags/src/translations.ts",
  },
  {
    name: "Starlight Videos",
    packageName: "starlight-videos",
    repository: "HiDeoo/starlight-videos",
    translationsPath: "packages/starlight-videos/translations.ts",
  },
  {
    name: "Starlight View Modes",
    packageName: "starlight-view-modes",
    repository: "trueberryless-org/starlight-view-modes",
    translationsPath: "packages/starlight-view-modes/translations.ts",
  },
];

export interface PluginConfig {
  /** The branch to read the translations from. @default "main" */
  branch?: string;
  /** The display name of the plugin. */
  name: string;
  /** The npm package name of the plugin, also used as URL slug. */
  packageName: string;
  /** The GitHub repository of the plugin, e.g. `"HiDeoo/starlight-blog"`. */
  repository: string;
  /** The path of the file exporting the translations object, relative to the repository root. */
  translationsPath: string;
}
