"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, logIn, logOut } from "@/lib/auth";
import { putSite, validateSite, type Site } from "@/lib/site";

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const ok = await logIn(String(form.get("password") ?? ""));
  if (!ok) return { error: "That password didn't work. Try again." };
  revalidatePath("/admin");
  return null;
}

export async function logoutAction() {
  await logOut();
  revalidatePath("/admin");
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; errors: string[] };

export async function saveSiteAction(site: Site): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, errors: ["Your session ended. Reload the page and log in again."] };
  const errors = validateSite(site);
  if (errors.length) return { ok: false, errors };
  try {
    await putSite(site);
  } catch {
    return { ok: false, errors: ["Couldn't write to storage. Nothing was saved, try again in a moment."] };
  }
  revalidatePath("/");
  return { ok: true, savedAt: new Date().toISOString() };
}
