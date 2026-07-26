/**
 * The U-directives — per-situation operative cues injected onto the interview
 * surface alongside the charter. Each block is addressable on its own so a gate
 * can assert that ITS cue is present rather than settling for a whole-file
 * substring hit: several blocks legitimately share vocabulary (U1 and U5 both
 * forbid echoing), and a file-wide grep would let one block's wording cover for
 * another block's absence.
 *
 * The cue strings are the contract. They are greppable by design and their
 * wording is load-bearing — rewording one changes what the interview enforces.
 */

export type DirectiveId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6" | "U7" | "U8" | "U9" | "U10";

const BLOCKS: Record<DirectiveId, string> = {
  U1: `[U1] 원 요청 재구성 — 비단순 요청만 발동
- 요청이 답하는 상황/문제를 한 줄로 재구성해 되비춘다
- 재구성은 사용자의 말을 다시 읽는 것이지 대신 정하는 것이 아니다
- 에코 금지 — 원문을 그대로 되풀이한 재구성은 재구성이 아니다`,

  U2: `[U2] 출처 구분 — 계획·요약 문턱만 발동
- 말한것/추론/가정 세 갈래로 표기한다
- 추론과 가정을 사용자가 말한 것으로 승격하지 않는다`,

  U3: `[U3] 발화력 보존
- 선호·혼잣말을 요구로 승격 금지
- 지나가는 말과 구속력 있는 요구를 같은 무게로 기록하지 않는다`,

  U4: `[U4] 질문 경제 — 중대성 기준 라우팅
- 비중대 기록 — 되돌리기 쉬운 것은 묻지 않고 기록만 남긴다
- 저위험 가정+가시로그 — 낮은 위험은 가정으로 진행하되 드러낸다
- 고위험·비가역 질문 — 되돌릴 수 없는 갈림길만 사용자에게 묻는다
- 가정은 반드시 보이게 로그로 남긴다`,

  U5: `[U5] 되말하기 계약
- 다른 말+구체 사례 ≥1 로 되말한다
- 에코 금지 — 토큰을 그대로 재사용한 되말하기는 확정 근거가 아니다`,

  U6: `[U6] 원문 재대면 — 범위·완료 전 발동
- 범위·완료 전 원문 verbatim 재대면을 수행한다
- 요약 신뢰 금지 — 중간 요약이 원문을 대신하지 못한다`,

  U7: `[U7] 오복창 교정 — 발생 시만 발동
- 사용자 오복창 즉시 교정 — 잘못 되읽은 것을 사용자가 바로잡으면 그 자리에서 반영한다
- 침묵=위반 — 교정을 받고도 아무 말 없이 넘어가는 것은 위반이다`,

  U8: `[U8] 모호 용어 구체화
- 정의 묻지 말고 사례 분류로 용어의 경계를 잡는다
- 사례에 대한 사용자의 판정이 정의를 대신한다
- 합의된 용어는 제품 glossary(docs/glossary.md)에 착지한다 — 개인 메모리 아님`,

  U9: `[U9] 가정 장부와 회고 정산
- 모든 로그된 가정에 신뢰도 필드를 붙인다
- 회고 정산은 인터뷰에 한정되지 않는다 — 인터뷰-비한정으로 실행 중 가정까지 정산한다`,

  U10: `[U10] 언어 축
- 사용자에게 보이는 문구는 한국어로 쓰고 내부-영어/사용자-한국어 분리를 지킨다
- 자연 등가 없는 하중 용어는 영어 유지 > 억지 번역`,
};

const ORDER: DirectiveId[] = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10"];

/** The single injected directive surface. Every U-gate greps this same text. */
export const directivesText: string = ORDER.map((id) => BLOCKS[id]).join("\n\n");

/**
 * Aliases. The U-gates import this surface under three names; they must denote
 * one and the same text so a cue can never be parked on an alias that no
 * interview turn actually sees.
 */
export const CHARTER_DIRECTIVES: string = directivesText;
export const CHARTER_DIRECTIVES_TEXT: string = directivesText;

export class UnknownDirectiveError extends Error {
  constructor(id: string) {
    super(`알 수 없는 디렉티브 id: ${id}`);
    this.name = "UnknownDirectiveError";
  }
}

/**
 * Returns one addressable block. Fail-closed on an unknown id: refusing is what
 * keeps the lookup keyed — silently handing back a default would let a gate
 * grep a block that is not the one it asked about.
 */
export function getDirectiveBlock(id: string): string {
  if (!Object.hasOwn(BLOCKS, id)) throw new UnknownDirectiveError(id);
  return BLOCKS[id as DirectiveId];
}

/**
 * Where a block may BEGIN: a marker that opens its own line, indentation
 * allowed. This end has to be precise, because being too generous here is
 * fail-OPEN — it would let prose (`서문에서 [U1] 언급`) shadow the real block,
 * or let a decoy be picked over it.
 */
function markerLineStarts(text: string, id: string): number[] {
  const marker = `[${id}]`;
  const starts: number[] = [];
  for (let at = text.indexOf(marker); at >= 0; at = text.indexOf(marker, at + 1)) {
    let lineHead = at;
    while (lineHead > 0 && (text[lineHead - 1] === " " || text[lineHead - 1] === "\t")) lineHead--;
    if (lineHead === 0 || text[lineHead - 1] === "\n") starts.push(at);
  }
  return starts;
}

/**
 * Where a block must END: the next line carrying ANY directive marker,
 * wherever on that line it sits. This end is deliberately the opposite of
 * precise, because the two errors are not symmetric:
 *
 *  - Ending too LATE is fail-open. The block swallows its neighbours and their
 *    wording covers for a cue this block has lost — exactly the masking the
 *    ac-11 oracle names. Every attempt to spell out which prefixes may sit in
 *    front of a marker (`[ \t]*`, `\s*`, …) leaves the complement as a channel:
 *    one ZWSP, NBSP, `>` or bullet in front of `[U5]` reopens it.
 *  - Ending too EARLY is fail-closed. The extracted block is a prefix of the
 *    real one, so a cue grep over it can only get stricter, never laxer, and
 *    checkDirectiveBlockIsolation reports the truncation as `not_canonical`.
 *
 * So the terminator takes the whole complement away: no prefix is enumerated,
 * therefore none can be evaded. The cost is that a block whose BODY mentions
 * another directive gets truncated — visible, and fail-closed. No shipped
 * block does (see BLOCKS: every body line opens with `- `).
 */
const MARKER_LINE = /\n[^\n]*\[U\d+\]/;

/**
 * Extracts one directive's block out of ARBITRARY surface text by its marker,
 * rather than looking the canonical block up. That is what lets a gate judge a
 * candidate surface: whole-file grep can be satisfied by another block's
 * wording, so the check has to read the block the cue is supposed to live in.
 * Anchoring to the canonical block instead would defeat the purpose — the gates
 * must be able to judge a surface whose block has been gutted.
 *
 * Two properties make the extraction hard to walk around:
 *  - The boundary does not depend on how the blocks were joined, nor on what
 *    decoration precedes the next marker. Collapsing the separator, or hiding
 *    an invisible character in front of the next marker, can no longer make one
 *    block swallow the next.
 *  - A surface carrying the marker on two different lines is AMBIGUOUS and is
 *    refused (null) rather than resolved by first-occurrence, which a decoy
 *    block prepended to the surface would otherwise win.
 *
 * Returns null when the surface carries no unambiguous such block.
 */
export function extractCueBlock(text: string, id: string): string | null {
  const starts = markerLineStarts(text, id);
  const [start] = starts;
  if (start === undefined || starts.length !== 1) return null;
  const rest = text.slice(start);
  const nextBlock = rest.search(MARKER_LINE);
  return (nextBlock < 0 ? rest : rest.slice(0, nextBlock)).trimEnd();
}

export type IsolationViolationKind = "not_extractable" | "not_canonical";

export type DirectiveIsolationResult = {
  ok: boolean;
  violations: Array<{ id: DirectiveId; kind: IsolationViolationKind }>;
};

/**
 * States block isolation as a product predicate rather than leaving it to a
 * gate's incidental arithmetic: every id must read back out of the surface as
 * exactly its own canonical block. A block that swallowed its neighbours, a
 * block masked by a decoy, or a surface that lost a block all show up here —
 * whereas a length comparison only notices when the FIRST block is the victim.
 *
 * Not thrown at module load on purpose: an import side effect buys nothing
 * today (no src consumer reads this surface) and would make every importer pay
 * for it. Promote to a one-line load-time invariant if a consumer appears.
 */
export function checkDirectiveBlockIsolation(
  text: string = directivesText,
): DirectiveIsolationResult {
  const violations: DirectiveIsolationResult["violations"] = [];
  for (const id of ORDER) {
    const extracted = extractCueBlock(text, id);
    if (extracted === null) violations.push({ id, kind: "not_extractable" });
    else if (extracted !== BLOCKS[id]) violations.push({ id, kind: "not_canonical" });
  }
  return { ok: violations.length === 0, violations };
}
