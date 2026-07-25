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

export type StaticCopyKind = "banner" | "prompt" | "label";

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
} as const satisfies Record<string, StaticCopyEntry>;

export type StaticCopyCatalog = Record<string, { kind: string; ko: string }>;
