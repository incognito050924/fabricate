/**
 * The '비어있지 않게' floor on the U1 reconstruction line.
 *
 * The frozen acceptance test only ever feeds `undefined` and `""`, so the
 * whitespace case is invisible to it: a line of spaces used to be recorded as
 * a fired reconstruction. The floor is whitespace-blind here, matching the
 * teachback restatement floor (turn/teachback.ts) — the same batch should not
 * disagree with itself about what "non-empty" means.
 */

import { describe, expect, test } from "bun:test";
import { recordTurnReconstruction } from "./reconstruction";

const REQUEST = "배포 실패를 수동으로 되돌리고 있는데 롤백 스크립트를 정리해줘";
const LINE = "반복되는 배포 실패를 수동 복구로 버티는 비용이 이 요청이 답하는 문제다";

describe("the non-empty floor is whitespace-blind", () => {
  // Named, because " " and "\u00a0" render identically in a test name.
  const blanks: Array<[string, string]> = [
    ["empty", ""],
    ["one space", " "],
    ["several spaces", "   "],
    ["tab", "\t"],
    ["newline", "\n"],
    ["mixed spaces and newline", "   \n "],
    ["non-breaking space U+00A0", "\u00a0"],
  ];

  for (const [name, blank] of blanks) {
    test(`a non-simple turn whose line is ${name} is refused fail-closed`, () => {
      const result = recordTurnReconstruction({
        request_text: REQUEST,
        complexity_tag: "non_simple",
        situation_problem_line: blank,
      });

      expect(result.accepted).toBe(false);
      if (result.accepted) throw new Error("unreachable");
      // One reason code for the whole floor: the frozen test requires this
      // same string for both `undefined` and `""`.
      expect(result.reason).toBe("missing_reconstruction_line");
    });
  }

  test("an omitted line is refused with the same reason", () => {
    const result = recordTurnReconstruction({
      request_text: REQUEST,
      complexity_tag: "non_simple",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("unreachable");
    expect(result.reason).toBe("missing_reconstruction_line");
  });
});

describe("the floor decides admission, it does not rewrite the line", () => {
  test("a padded but non-blank line is accepted and recorded verbatim", () => {
    const padded = `  ${LINE}  `;
    const result = recordTurnReconstruction({
      request_text: REQUEST,
      complexity_tag: "non_simple",
      situation_problem_line: padded,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(true);
    expect(result.record.situation_problem_line).toBe(padded);
  });
});

describe("firing stays tag-driven", () => {
  test("a simple turn is accepted with no line and does not fire", () => {
    const result = recordTurnReconstruction({ request_text: REQUEST, complexity_tag: "simple" });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(false);
    expect(result.record.situation_problem_line).toBeUndefined();
  });

  test("a blank line on a simple turn is not refused — the floor is gated by the tag", () => {
    const result = recordTurnReconstruction({
      request_text: REQUEST,
      complexity_tag: "simple",
      situation_problem_line: "   ",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("unreachable");
    expect(result.record.u1_fired).toBe(false);
  });
});
