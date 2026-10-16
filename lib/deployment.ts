export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Public files need the repository prefix; next/link adds it automatically. */
export function publicPath(path: string) { return `${basePath}${path}`; }

export function detailHref(section: "my" | "quotes" | "orders", id: string) {
  return STATIC_SITE ? `/${section}/detail?id=${encodeURIComponent(id)}` : `/${section}/${encodeURIComponent(id)}`;
}
