/**
 * The autonomous-decision log — the visible trace left whenever something was
 * decided without asking. Handling a fork autonomously is allowed; handling it
 * invisibly is not, so every autonomous route lands here where the user can
 * read what was decided on their behalf.
 *
 * Promotions leave nothing here: a fork taken to the user is not an autonomous
 * decision, and logging it would inflate the record of what went unasked.
 */

export type AutonomousLogEntry = {
  item_id: string;
  fork_class: string;
  route: string;
  description: string;
};

export type AutonomousLog = {
  entries: AutonomousLogEntry[];
};

export function createAutonomousLog(): AutonomousLog {
  return { entries: [] };
}

/** Append-only, in the order decisions were taken. */
export function appendAutonomousEntry(log: AutonomousLog, entry: AutonomousLogEntry): void {
  log.entries.push(entry);
}
