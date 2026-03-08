export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "job";
}

export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}
