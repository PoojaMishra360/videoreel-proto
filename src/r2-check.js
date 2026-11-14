import { checkR2Connection } from "./storage.js";

try {
  const { bucket } = await checkR2Connection();
  console.log(`Cloudflare R2 connection successful. Bucket "${bucket}" is reachable.`);
} catch (error) {
  if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
    console.error("The configured R2 bucket was not found. Check R2_BUCKET and create the bucket in Cloudflare if needed.");
  } else if (error?.name === "Forbidden" || error?.$metadata?.httpStatusCode === 403) {
    console.error("Cloudflare R2 rejected access. Check the bucket-scoped R2 token and its permissions.");
  } else if (error instanceof Error && error.message.startsWith("R2 is not configured")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.startsWith("R2_ACCOUNT_ID")) {
    console.error(error.message);
  } else {
    console.error("Could not reach Cloudflare R2. Check local configuration, token permissions, and network access.");
  }
  process.exitCode = 1;
}
