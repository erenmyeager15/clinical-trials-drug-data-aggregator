export function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

export function redactPersonalText(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted]');
}

export function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const text = redactPersonalText(value);
    if (text) seen.add(text);
  }
  return [...seen];
}

export function firstText(values: unknown): string | null {
  if (Array.isArray(values)) return redactPersonalText(values[0]);
  return redactPersonalText(values);
}

export function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = normalizeText(value)?.replace(/,/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options: RequestInit = {}, retries = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          accept: 'application/json',
          ...(options.headers ?? {}),
        },
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) await delay(650 * attempt);
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

export function quoteOpenFdaTerm(term: string): string {
  return `"${term.replace(/(["\\])/g, '\\$1')}"`;
}
