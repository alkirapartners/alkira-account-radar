type ClassValue = string | false | null | undefined;

/** Join class names, skipping falsy ones. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
