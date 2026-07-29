import { basename } from "node:path";
import { readTextIfExists } from "./files.ts";

export type JUnitSuite = {
  file: string;
  tests: number;
  failures: number;
  errors: number;
};

export const parseJUnitFile = async (path: string): Promise<Map<string, JUnitSuite>> => {
  const text = await readTextIfExists(path);

  if (text === null) {
    return new Map();
  }

  return parseJUnit(text);
};

export const parseJUnit = (text: string): Map<string, JUnitSuite> => {
  const suites = new Map<string, JUnitSuite>();
  const suitePattern = /<testsuite\b([^>]*)>/g;

  for (const match of text.matchAll(suitePattern)) {
    const attrsText = match[1];

    if (attrsText === undefined) {
      continue;
    }

    const attrs = parseAttributes(attrsText);
    const file = attrs.get("file");

    if (file === undefined) {
      continue;
    }

    const key = basename(file).replace(/\.test\.ts$/, "");
    const previous = suites.get(key);
    const suite = {
      file,
      tests: numberAttr(attrs, "tests"),
      failures: numberAttr(attrs, "failures"),
      errors: numberAttr(attrs, "errors"),
    };

    if (previous === undefined) {
      suites.set(key, suite);
    } else {
      suites.set(key, {
        file,
        tests: previous.tests + suite.tests,
        failures: previous.failures + suite.failures,
        errors: previous.errors + suite.errors,
      });
    }
  }

  return suites;
};

const parseAttributes = (text: string): Map<string, string> => {
  const attrs = new Map<string, string>();
  const attrPattern = /([:\w-]+)="([^"]*)"/g;

  for (const match of text.matchAll(attrPattern)) {
    const key = match[1];
    const value = match[2];

    if (key !== undefined && value !== undefined) {
      attrs.set(key, decodeXml(value));
    }
  }

  return attrs;
};

const numberAttr = (attrs: Map<string, string>, key: string): number => {
  const value = attrs.get(key);

  if (value === undefined) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const decodeXml = (value: string): string =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
