function isAdlabDeliveryValidatorCrashMessage(msg: string) {
  const m = (msg || "").toLowerCase();

  // the crash you showed
  if (m.includes('class "adlab\\checkout\\plugin\\model\\deliverydate\\inputexception" not found')) return true;
  if (m.includes("validatorplugin.php")) return true;
  if (m.includes("adlab\\checkout\\plugin\\model\\deliverydate")) return true;

  // also treat their “required” messages as retryable because their session write often fixes it on second run
  if (m.includes("delivery date is required")) return true;
  if (m.includes("delivery time is required")) return true;
  if (m.includes("delivery comment is required")) return true;

  return false;
}

function getErrorMessage(e: unknown): string {
  if (!e) return "";
  if (e instanceof Error) return e.message || "";
  return String(e);
}

async function tinyDelay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs an operation and if it fails with the known Adlab delivery-date validator crash,
 * retries it once (optionally after a "prime" operation).
 */
export async function withAdlabOneRetry<T>(
  op: () => Promise<T>,
  primeBeforeRetry?: () => Promise<void>
): Promise<T> {
  try {
    return await op();
  } catch (e) {
    const msg = getErrorMessage(e);
    if (!isAdlabDeliveryValidatorCrashMessage(msg)) throw e;

    // prime + retry once
    if (primeBeforeRetry) {
      await primeBeforeRetry();
    }

    await tinyDelay(50);
    return await op();
  }
}
