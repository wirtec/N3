"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE } from "@/lib/lang";
import type { Lang } from "@/lib/i18n";

export async function setLanguage(lang: Lang) {
  const c = await cookies();
  c.set(LANG_COOKIE, lang === "fa" ? "fa" : "en", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
