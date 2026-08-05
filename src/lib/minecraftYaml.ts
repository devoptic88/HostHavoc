/**
 * Minimal, path-aware YAML editing for Bukkit/Spigot config files.
 *
 * These configs are heavily commented and the comments are genuinely useful to
 * server owners, so we patch values line-by-line rather than parsing to an
 * object and dumping it back — a round-trip through a YAML library would
 * discard every comment and reorder keys.
 *
 * Only scalar `key: value` lines are addressed, which is all the settings UI
 * touches. Lists and block scalars are left strictly alone.
 */

const KEY_LINE = /^(\s*)([A-Za-z0-9_.-]+):(.*)$/;

/** Split a value from any trailing `# comment`, respecting quotes. */
function splitComment(rest: string) {
  let quote: string | null = null;
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(rest[i - 1]))) {
      return { value: rest.slice(0, i), comment: rest.slice(i) };
    }
  }
  return { value: rest, comment: "" };
}

function unquote(raw: string) {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return value;
}

/** Every scalar setting in the document, keyed by dotted path. */
export function parseYamlPaths(text: string): Map<string, string> {
  const values = new Map<string, string>();
  const stack: { key: string; indent: number }[] = [];

  for (const line of (text ?? "").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(KEY_LINE);
    if (!match) continue;

    const [, indent, key, rest] = match;
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent.length) stack.pop();
    stack.push({ key, indent: indent.length });

    const { value } = splitComment(rest);
    if (value.trim()) {
      values.set(stack.map((entry) => entry.key).join("."), unquote(value));
    }
  }

  return values;
}

/** Quote only when YAML would otherwise misread the value. */
function formatValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return "''";
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  return `'${trimmed.replace(/'/g, "''")}'`;
}

/**
 * Replace the values at the given dotted paths, preserving indentation,
 * comments, ordering, and every untouched line. Paths absent from the document
 * are ignored rather than appended — a key Bukkit doesn't know is just noise.
 */
export function applyYamlUpdates(text: string, updates: Record<string, string>) {
  const pending = new Map(Object.entries(updates));
  if (pending.size === 0) return text;

  const stack: { key: string; indent: number }[] = [];
  const lines = (text ?? "").split(/\r?\n/);

  const patched = lines.map((line) => {
    if (!line.trim() || line.trim().startsWith("#")) return line;
    const match = line.match(KEY_LINE);
    if (!match) return line;

    const [, indent, key, rest] = match;
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent.length) stack.pop();
    stack.push({ key, indent: indent.length });

    const path = stack.map((entry) => entry.key).join(".");
    if (!pending.has(path)) return line;

    const { value, comment } = splitComment(rest);
    // Only scalars are addressable; a parent key has no inline value.
    if (!value.trim()) return line;

    const next = pending.get(path)!;
    pending.delete(path);
    return `${indent}${key}: ${formatValue(next)}${comment ? ` ${comment.trim()}` : ""}`;
  });

  return patched.join("\n");
}

/** Paths in `updates` that the document does not actually contain. */
export function unknownYamlPaths(text: string, updates: Record<string, string>) {
  const present = parseYamlPaths(text);
  return Object.keys(updates).filter((path) => !present.has(path));
}
