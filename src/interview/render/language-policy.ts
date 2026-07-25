/**
 * Rendering language policy. Two audiences share one system: the code and its
 * internals are English, what the user reads is Korean. The one deliberate
 * exception is load-bearing terminology with no natural Korean equivalent —
 * forcing a translation there loses the term's meaning, which is exactly the
 * loss this harness exists to prevent, so the English term is kept.
 *
 * The policy text is greppable by design; it is the surface ac-22's coherence
 * check reads, and the U10 directive states the same priority in the same
 * direction.
 */

export const LANGUAGE_POLICY_TEXT: string = `# 렌더링 언어 정책

## 결정
- 내부-영어/사용자-한국어 분리를 기본으로 둔다
- 코드·식별자·주석·로그 키는 영어로 쓴다
- 사용자에게 보이는 문구, 거부 사유, 진행 표시는 한국어로 쓴다

## 예외
- 사용자-한국어 표면 규범의 예외로서 하중 용어는 영어 유지를 허용한다
- 자연 등가 없는 하중 용어는 영어 유지 > 억지 번역 — 뜻을 잃느니 원어를 남긴다
- 예외를 쓸 때는 처음 등장하는 자리에서 한 번 풀어 설명한다

## 금지
- translationese 금지 — 영어 구문을 그대로 옮긴 어색한 한국어를 쓰지 않는다
- 사용자 발화의 인용은 번역하지 않고 verbatim 보존한다
`;
