export type CliResult = {
  code: number;
  stdout?: string;
  stderr?: string;
};

export const ok = (stdout = ""): CliResult => ({ code: 0, stdout });

export const fail = (stderr: string): CliResult => ({ code: 1, stderr });

export const writeResult = (result: CliResult): void => {
  if (result.stdout !== undefined && result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr !== undefined && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
};
