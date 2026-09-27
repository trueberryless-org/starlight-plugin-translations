export function getLocaleNames(lang: string): LocaleNames {
  const englishName = getLanguageDisplayName(lang, "en");
  const nativeName = getLanguageDisplayName(lang, lang);

  return { englishName, nativeName };
}

function getLanguageDisplayName(lang: string, displayLang: string): string {
  try {
    const name = new Intl.DisplayNames([displayLang], { type: "language" }).of(
      lang
    );
    if (!name) return lang;

    return `${name.charAt(0).toLocaleUpperCase(displayLang)}${name.slice(1)}`;
  } catch {
    // Invalid BCP-47 tags throw a `RangeError`, in which case the tag itself is the best label.
    return lang;
  }
}

export interface LocaleNames {
  englishName: string;
  nativeName: string;
}
