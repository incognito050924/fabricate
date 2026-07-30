import { expect, test } from "bun:test";
import { staleVerifyMarketplaces } from "../lib/stale-marketplaces.ts";

const registry = {
  "fabricate-local": {
    source: { source: "directory", path: "/Users/someone/dev/fabricate" },
    installLocation: "/Users/someone/dev/fabricate",
  },
  "fabricate-verify-1-dead": {
    source: { source: "directory", path: "/tmp/fabricate-host-gone/marketplace" },
    installLocation: "/tmp/fabricate-host-gone/marketplace",
  },
  "fabricate-verify-2-live": {
    source: { source: "directory", path: "/tmp/fabricate-host-running/marketplace" },
    installLocation: "/tmp/fabricate-host-running/marketplace",
  },
  "claude-plugins-official": {
    source: { source: "github", repo: "anthropics/claude-plugins-official" },
    installLocation: "/Users/someone/.claude/plugins/marketplaces/claude-plugins-official",
  },
};

const exists = (path: string): boolean => path === "/tmp/fabricate-host-running/marketplace";

test("죽은 임시 소스를 가진 verify 항목만 골라낸다", () => {
  expect(staleVerifyMarketplaces(JSON.stringify(registry), exists)).toEqual([
    "fabricate-verify-1-dead",
  ]);
});

test("아직 돌고 있는 verify 항목은 건드리지 않는다 — 동시 실행을 죽이면 안 된다", () => {
  const stale = staleVerifyMarketplaces(JSON.stringify(registry), exists);

  expect(stale).not.toContain("fabricate-verify-2-live");
});

test("사용자의 실제 설치와 남의 마켓플레이스는 후보에 들어오지 않는다", () => {
  const stale = staleVerifyMarketplaces(JSON.stringify(registry), exists);

  expect(stale).not.toContain("fabricate-local");
  expect(stale).not.toContain("claude-plugins-official");
});

test("등록부를 못 읽으면 아무것도 지우지 않는다", () => {
  expect(staleVerifyMarketplaces("", exists)).toEqual([]);
  expect(staleVerifyMarketplaces("{ 망가진 JSON", exists)).toEqual([]);
  expect(staleVerifyMarketplaces("[]", exists)).toEqual([]);
});

test("경로를 못 읽는 항목은 살아 있는 쪽으로 본다 — 확실할 때만 지운다", () => {
  const noPath = { "fabricate-verify-3": { source: { source: "directory" } } };

  expect(staleVerifyMarketplaces(JSON.stringify(noPath), exists)).toEqual([]);
});
