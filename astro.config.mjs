// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://starlight-plugin-translations.netlify.app",
  // Astro 7 defaults to JSX whitespace rules, which drop line-broken spaces from the Prettier-formatted templates.
  compressHTML: true,
});
