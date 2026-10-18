import type { Metadata } from "next";
import { loadSite } from "../_lib";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const site = await loadSite();
  return site && <ProfileForm data={{ profile: site.profile, socials: site.socials, medium: site.medium, footer: site.footer }} />;
}
