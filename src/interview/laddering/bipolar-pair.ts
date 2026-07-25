/**
 * The bipolar pair captured from "which two side together, and why". A
 * construct has two ends, and only one of them was named by the grouping: the
 * opposite pole is what the odd one out stands for, and without it the pair
 * says "the user likes this" rather than "the user distinguishes this from
 * that". The reason is the third necessity — it is the link the upward ladder
 * climbs.
 *
 * A pair missing any of the three is flagged incomplete rather than quietly
 * stored, so a half-captured construct cannot pass as an agreed one.
 */

export type BipolarPair = {
  dimension: string;
  grouped_pole?: string;
  opposite_pole?: string;
  reason?: string;
};

export type BipolarAssessment = {
  complete: boolean;
  incomplete: boolean;
  missing_fields: string[];
};

const REQUIRED_FIELDS = ["grouped_pole", "opposite_pole", "reason"] as const;

const isPresent = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;

export function assessBipolarPair(pair: BipolarPair): BipolarAssessment {
  const missing_fields = REQUIRED_FIELDS.filter((field) => !isPresent(pair[field]));
  const complete = missing_fields.length === 0;
  return { complete, incomplete: !complete, missing_fields };
}
