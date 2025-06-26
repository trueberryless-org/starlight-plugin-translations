import { z } from "astro/zod";

const StatusSchema = z.enum(["done", "missing"]);

const PluginSchema = z.object({
  name: z
    .string()
    .describe("The name of the plugin that will be displayed on the website"),
  packageName: z
    .string()
    .describe(
      "The package name of the plugin as it is published on npm and named on GitHub which will be used for URL slugs"
    ),
  translationFileLink: z
    .string()
    .describe(
      "A link to the translations.ts file of the plugin (preferably GitHub)"
    ),
  translationFileLinkRaw: z
    .string()
    .describe(
      "A link to the raw content of the translations.ts file of the plugin (preferably GitHub)"
    ),
});

const LocaleSchema = z.object({
  label: z
    .string()
    .describe(
      'The label of the locale to show in the status dashboard, e.g. `"English"`, `"Português"`, or `"Español"`'
    ),
  lang: z
    .string()
    .describe(
      'The BCP-47 tag of the locale, both to use in smaller widths and to differentiate regional variants, e.g. `"en-US"` (American English) or `"en-GB"` (British English)'
    ),
});

const DashboardSchema = z.object({
  plugins: z.array(PluginSchema),
  locales: z.array(LocaleSchema),
});

const ProgressSchema = z.object({
  total: z.number(),
  missing: z.number(),
  size: z.number().default(20).optional(),
});

const KeySchema = z.object({
  name: z.string(),
  link: z.string(),
  lineNumber: z.number(),
});

const LocaleKeysSchema = z.object({
  locale: LocaleSchema,
  keys: z.array(
    KeySchema.extend({
      status: StatusSchema,
    })
  ),
});

const KeyStatusesSchema = z.object({
  key: KeySchema,
  statuses: z.array(
    z.object({
      locale: LocaleSchema,
      status: StatusSchema,
    })
  ),
});

export type Status = z.infer<typeof StatusSchema>;
export type Plugin = z.infer<typeof PluginSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Key = z.infer<typeof KeySchema>;
export type LocaleKeys = z.infer<typeof LocaleKeysSchema>;
export type KeyStatus = z.infer<typeof KeyStatusesSchema>;
