import { isAdmin } from "@/lib/auth";
import { getSite, type Site } from "@/lib/site";

/** The stored page for an admin page, or null when not logged in (the layout shows the login form then). */
export async function loadSite(): Promise<Site | null> {
  if (!(await isAdmin())) return null;
  return getSite();
}
