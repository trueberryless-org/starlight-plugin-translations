import {
  type Expression,
  type ObjectExpression,
  type PropertyKey,
  parseSync,
} from "oxc-parser";

const TRANSLATIONS_EXPORT_RE = /^translations$/i;
// i18next plural suffixes, e.g. `count_one` and `count_other` are the same key.
// https://www.i18next.com/translation-function/plurals
const PLURAL_SUFFIX_RE = /_(?:zero|one|two|few|many|other)$/;

/**
 * Statically parses a translations file without evaluating it and returns, for each locale, the translated keys
 * (without plural suffixes) mapped to the line where they are first defined.
 */
export function parseTranslations(
  source: string,
  filename: string
): Map<string, Map<string, number>> {
  const { errors, program } = parseSync(filename, source);
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse \`${filename}\`: ${errors.map((error) => error.message).join(", ")}.`
    );
  }

  const translations = findTranslationsObject(program.body);
  if (!translations) {
    throw new Error(
      `Could not find an exported \`Translations\` or \`translations\` object in \`${filename}\`.`
    );
  }

  const lineStarts = getLineStarts(source);
  const locales = new Map<string, Map<string, number>>();

  for (const localeProperty of translations.properties) {
    if (localeProperty.type !== "Property") continue;

    const lang = getPropertyKeyName(localeProperty.key);
    const value = unwrapTypeExpression(localeProperty.value);
    if (!lang || value.type !== "ObjectExpression") continue;

    const keys = new Map<string, number>();

    for (const keyProperty of value.properties) {
      if (keyProperty.type !== "Property") continue;

      const rawKey = getPropertyKeyName(keyProperty.key);
      if (!rawKey) continue;

      const key = rawKey.replace(PLURAL_SUFFIX_RE, "");
      if (!keys.has(key))
        keys.set(key, getLineNumber(lineStarts, keyProperty.start));
    }

    locales.set(lang, keys);
  }

  return locales;
}

function findTranslationsObject(
  body: ReturnType<typeof parseSync>["program"]["body"]
): ObjectExpression | undefined {
  for (const statement of body) {
    if (
      statement.type !== "ExportNamedDeclaration" ||
      statement.declaration?.type !== "VariableDeclaration"
    ) {
      continue;
    }

    for (const declarator of statement.declaration.declarations) {
      if (
        declarator.id.type !== "Identifier" ||
        !TRANSLATIONS_EXPORT_RE.test(declarator.id.name) ||
        !declarator.init
      ) {
        continue;
      }

      const init = unwrapTypeExpression(declarator.init);
      if (init.type === "ObjectExpression") return init;
    }
  }

  return undefined;
}

// Strips TypeScript-only wrappers like `{ … } as const` or `{ … } satisfies Translations`.
function unwrapTypeExpression(expression: Expression): Expression {
  let current = expression;

  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "ParenthesizedExpression"
  ) {
    current = current.expression;
  }

  return current;
}

function getPropertyKeyName(key: PropertyKey): string | undefined {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;

  return undefined;
}

function getLineStarts(source: string): number[] {
  const lineStarts = [0];

  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\n") lineStarts.push(index + 1);
  }

  return lineStarts;
}

// Returns the 1-based line number of a character offset.
function getLineNumber(lineStarts: number[], offset: number): number {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if ((lineStarts[middle] ?? 0) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low + 1;
}
