import { z } from "zod";

/**
 * A pre-mortem item — one way this work could go wrong, recorded before it
 * does. `fork_class` says what kind of decision fork it is, and it is optional
 * on purpose: items recorded before the class existed must keep parsing, so the
 * field is additive rather than a migration.
 *
 * The vocabulary is two-valued. 'criterion_setting' is a fork that sets a
 * criterion other behaviors will stack on top of — the only kind that earns a
 * user question. Everything else is 'other'. Notably, mechanical reversibility
 * (git, backup, outside help, days of discarded code) is NOT a class here: how
 * recoverable the damage is says nothing about whether the choice binds anyone.
 */

export const forkClass = z.enum(["criterion_setting", "other"]);
export type ForkClass = z.infer<typeof forkClass>;

export const premortemItemSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string()),
    fork_class: forkClass.optional(),
  })
  .strict();
export type PremortemItem = z.infer<typeof premortemItemSchema>;

/** Parse-or-refuse: an out-of-enum fork class is a refusal, not a fallback. */
export function parsePremortemItem(raw: unknown): PremortemItem {
  return premortemItemSchema.parse(raw);
}
