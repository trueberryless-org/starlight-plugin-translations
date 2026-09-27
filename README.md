# Starlight Plugin Translations

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![Netlify Status](https://api.netlify.com/api/v1/badges/7fd855b3-3f38-42a1-9df5-e7e7eca9d7c8/deploy-status)](https://app.netlify.com/projects/starlight-plugin-translations/deploys)

A website tracking the current state of UI translations in Starlight plugins which use [custom UI translations](https://hideoo.dev/notes/starlight-plugin-use-custom-translation-strings).

**Tracking, not a to-do list.** The goal is not to translate every plugin into as many languages as possible: every language is maintenance burden for plugin authors. A plugin is only tracked in the languages it already ships, and "missing" keys are the ones added after a translation was contributed.

## How it works

At build time, the translations file of each plugin listed in [`src/plugins.ts`](./src/plugins.ts) is fetched from GitHub and statically parsed (never executed). The site is rebuilt daily.

To track another plugin, add an entry to [`src/plugins.ts`](./src/plugins.ts) and open a pull request.

## Development

```sh
pnpm install
pnpm dev
```

## License

Licensed under the MIT license, Copyright © trueberryless.

See [LICENSE](https://github.com/trueberryless-org/starlight-plugin-translations/blob/main/LICENSE) for more information.
