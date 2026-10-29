import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Pages are generated at build time; lead/booking handlers stay dynamic.
// No R2, remote cache, or paid Images binding is provisioned implicitly.
export default defineCloudflareConfig();
