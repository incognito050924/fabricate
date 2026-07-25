import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Binds a user confirmation to the exact bytes that were confirmed. Without the
 * binding, "the user agreed" survives any later edit of the statement — the
 * agreement would silently transfer to text the user never saw. The digest
 * makes that transfer detectable: a one-byte change breaks the match.
 */

/** SHA-256 over the UTF-8 bytes, lowercase hex. Total over every input. */
export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export const SHA256_HEX = /^[0-9a-f]{64}$/;

export const confirmationRecordSchema = z
  .object({
    /** Digest of the statement the user actually confirmed. */
    statement_digest: z.string().regex(SHA256_HEX),
  })
  .strict();
export type ConfirmationRecord = z.infer<typeof confirmationRecordSchema>;
