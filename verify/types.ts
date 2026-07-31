export type CheckOutcome = {
  ok: boolean;
  targets: string[];
  detail: string;
};

export type Check = {
  id: string;
  title: string;
  run: (ctx: CheckContext) => Promise<CheckOutcome>;
};

export type CheckContext = {
  repoRoot: string;
  tmpRoot: string;
  obsPath: string;
};

export type StructureStatus = "PASS" | "FAIL" | "n/a";

export type ProcessResult = {
  command: string;
  args: string[];
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};
