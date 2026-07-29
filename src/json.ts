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

export const booleanField = (object: JsonObject, key: string): boolean => {
  const value = object[key];

  if (typeof value !== "boolean") {
    throw new Error(`${key} 값이 불리언이 아닙니다.`);
  }

  return value;
};

export const objectField = (object: JsonObject, key: string): JsonObject => {
  const value = object[key];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${key} 값이 객체가 아닙니다.`);
  }

  return value as JsonObject;
};
