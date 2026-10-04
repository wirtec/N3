import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export const LANG_COOKIE = "nova_lang";

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get(LANG_COOKIE)?.value;
  return v === "fa" ? "fa" : "en";
}
