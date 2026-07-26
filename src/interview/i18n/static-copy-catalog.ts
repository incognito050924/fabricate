/**
 * The single catalog of user-facing static copy on the interview surface —
 * banners, prompts, labels. This is the dependency seam on the i18n work item
 * (wi_2607130ld): the review layer below consumes these keys and never keeps a
 * second copy of the strings. A parallel table is worse than no table, because
 * the two drift and the surface shows whichever one the code happened to read.
 *
 * Keys are internal English; the copy itself is Korean, written as Korean
 * rather than translated from an English original — that is what the fidelity
 * gate exists to keep honest.
 */

export const STATIC_COPY_KINDS = ["banner", "prompt", "label"] as const;
export type StaticCopyKind = (typeof STATIC_COPY_KINDS)[number];

/** One string per kind cannot make "전수 검수" mean anything. */
export const MIN_ENTRIES_PER_KIND = 2;

export type StaticCopyEntry = {
  kind: StaticCopyKind;
  ko: string;
};

export const STATIC_COPY_CATALOG = {
  "interview.banner.start": { kind: "banner", ko: "인터뷰를 시작합니다" },
  "interview.banner.resume": { kind: "banner", ko: "이전 인터뷰를 이어서 진행합니다" },
  "interview.prompt.goal": {
    kind: "prompt",
    ko: "무엇이 되어 있으면 끝난 것인지 한 문장으로 알려주세요",
  },
  "interview.prompt.example": { kind: "prompt", ko: "판단이 갈리는 사례를 하나 들어 주세요" },
  "interview.label.done": { kind: "label", ko: "완료" },
  "interview.label.unverified": { kind: "label", ko: "미검증" },
  "interview.label.assumption": { kind: "label", ko: "가정" },
  // Absorbed from src/interview/render.ts — the delegation reflection.
  "interview.label.echoed_utterance": { kind: "label", ko: "말씀하신 것:" },
  "interview.label.echoed_reading": { kind: "label", ko: "이렇게 이해했습니다:" },
  "interview.prompt.correct_reading": {
    kind: "prompt",
    ko: "다르게 이해했다면 지금 바로잡아 주세요.",
  },
  // Absorbed from src/cli/interview-finalize.ts — the finalize arm.
  "interview.banner.finalize_rejected": { kind: "banner", ko: "확정 거부" },
  "interview.banner.intent_recorded": { kind: "banner", ko: "의도를 확정해 기록했다." },
  "interview.label.next_route": { kind: "label", ko: "다음 경로" },
  "interview.label.resynthesize": { kind: "label", ko: "원 요청에서 다시 합성한다" },
} as const satisfies Record<string, StaticCopyEntry>;

export type StaticCopyKey = keyof typeof STATIC_COPY_CATALOG;

/**
 * The one lookup the render paths use. A module that inlines the string instead
 * holds a second copy of it, and the review layer only ever sees this one.
 */
export function staticCopy(key: StaticCopyKey): string {
  return STATIC_COPY_CATALOG[key].ko;
}

export type StaticCopyCatalog = Record<string, { kind: string; ko: string }>;
