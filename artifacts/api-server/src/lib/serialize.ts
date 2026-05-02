/** Convert Date objects to ISO strings so Zod response schemas parse cleanly. */
export function toJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
