import { DEFAULT_BRANCH, type PluginConfig } from "../plugins";

export function getRepositoryUrl(plugin: PluginConfig): string {
  return `https://github.com/${plugin.repository}`;
}

export function getTranslationsFileUrl(
  plugin: PluginConfig,
  line?: number
): string {
  const { branch = DEFAULT_BRANCH, repository, translationsPath } = plugin;
  const url = `https://github.com/${repository}/blob/${branch}/${translationsPath}`;

  return line === undefined ? url : `${url}#L${line}`;
}

export function getRawTranslationsFileUrl(plugin: PluginConfig): string {
  const { branch = DEFAULT_BRANCH, repository, translationsPath } = plugin;

  return `https://raw.githubusercontent.com/${repository}/refs/heads/${branch}/${translationsPath}`;
}
