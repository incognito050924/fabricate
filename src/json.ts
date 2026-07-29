import type { JsonObject } from "./files.ts";

export const parseJsonObject = (text: string): JsonObject => {
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON 객체가 필요합니다.");
  }

  return parsed as JsonObject;
};

export const stringField = (object: JsonObject, key: string): string => {
  const value = object[key];

  if (typeof value !== "string") {
    throw new Error(`${key} 값이 문자열이 아닙니다.`);
  }

  return value;
};

// Optional readers exist because the host's payload keys are not stable: the official
// docs promise `command_text`, which never arrives, and `effort` arrived on 2.1.220
// where it was measured absent before. An observation-only hook must never lose its
// record because a key it merely reports moved.
export const optionalString = (object: JsonObject, key: string): string | null => {
  const value = object[key];
  return typeof value === "string" ? value : null;
};

export const optionalBoolean = (object: JsonObject, key: string): boolean | null => {
  const value = object[key];
  return typeof value === "boolean" ? value : null;
};

export const objectField = (object: JsonObject, key: string): JsonObject => {
  const value = object[key];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${key} 값이 객체가 아닙니다.`);
  }

  return value as JsonObject;
};
