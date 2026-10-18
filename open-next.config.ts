import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: every page reads KV at request time, so there is nothing for Next to cache.
export default defineCloudflareConfig({});
