/**
 * U6 re-confrontation with the original request. Before judging scope and
 * before declaring completion, the interview SUPPLIES the stored original text
 * verbatim rather than reminding anyone that it exists. The distinction is the
 * whole point: by those moments the working summary has usually shed the
 * exclusions and failure handling the user actually asked for, and a reminder
 * lets the drifted summary keep standing in for the request.
 *
 * The original is stored once at intake, keyed per session, and never passed in
 * at re-anchor time — so a caller cannot hand in a paraphrase and have it
 * recorded as the original. With nothing stored the re-anchor fails closed
 * instead of fabricating a stand-in.
 */

export type ReanchorThreshold = "scope" | "completion";
export type ThresholdTag = ReanchorThreshold | "none";

export interface ReanchorRecord {
  threshold: ReanchorThreshold;
  turn_id?: string;
  /** The stored original, byte-for-byte — never a summary. */
  supplied_original: string;
}

export interface AnchorTurn {
  turn_id: string;
  threshold_tag: ThresholdTag;
  content: string;
}

export class MissingOriginalError extends Error {
  constructor(sessionId: string) {
    super(`세션 ${sessionId}에 저장된 원문이 없다 — 원문 없이 재대면할 수 없다(fail-closed)`);
    this.name = "MissingOriginalError";
  }
}

export interface AnchorStore {
  storeOriginal(input: { session_id: string; original_request: string }): void;
  getOriginal(sessionId: string): string;
  appendReanchor(sessionId: string, record: ReanchorRecord): void;
  reanchorLog(sessionId: string): ReanchorRecord[];
}

export function createAnchorStore(): AnchorStore {
  const originals = new Map<string, string>();
  const logs = new Map<string, ReanchorRecord[]>();

  return {
    storeOriginal({ session_id, original_request }) {
      originals.set(session_id, original_request);
    },
    getOriginal(sessionId) {
      const original = originals.get(sessionId);
      if (original === undefined) throw new MissingOriginalError(sessionId);
      return original;
    },
    appendReanchor(sessionId, record) {
      const log = logs.get(sessionId) ?? [];
      log.push(record);
      logs.set(sessionId, log);
    },
    reanchorLog(sessionId) {
      return [...(logs.get(sessionId) ?? [])];
    },
  };
}

export interface PerformReanchorInput {
  store: AnchorStore;
  session_id: string;
  threshold: ReanchorThreshold;
  turn_id?: string;
}

/** Supplies the stored original for this session. Throws when none is stored. */
export function performOriginalReanchor(input: PerformReanchorInput): ReanchorRecord {
  const supplied_original = input.store.getOriginal(input.session_id);
  return input.turn_id === undefined
    ? { threshold: input.threshold, supplied_original }
    : { threshold: input.threshold, turn_id: input.turn_id, supplied_original };
}

export interface ReanchoredTurn {
  turn_id: string;
  threshold_tag: ThresholdTag;
  reanchor_fired: boolean;
  reanchor?: ReanchorRecord;
}

export interface RecordReanchoredTurnInput {
  store: AnchorStore;
  session_id: string;
  turn: AnchorTurn;
}

/** Fires the re-anchor at the two cue-named thresholds only, and logs it. */
export function recordReanchoredTurn(input: RecordReanchoredTurnInput): ReanchoredTurn {
  const { turn } = input;
  if (turn.threshold_tag === "none") {
    return { turn_id: turn.turn_id, threshold_tag: turn.threshold_tag, reanchor_fired: false };
  }

  const record = performOriginalReanchor({
    store: input.store,
    session_id: input.session_id,
    threshold: turn.threshold_tag,
    turn_id: turn.turn_id,
  });
  input.store.appendReanchor(input.session_id, record);

  return {
    turn_id: turn.turn_id,
    threshold_tag: turn.threshold_tag,
    reanchor_fired: true,
    reanchor: record,
  };
}
