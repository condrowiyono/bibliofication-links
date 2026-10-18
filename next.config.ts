import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Gives `next dev` local KV and secrets from wrangler.jsonc and .dev.vars.
initOpenNextCloudflareForDev();
