/**
 * The handful of GitHub Actions toolkit primitives these actions need.
 *
 * `@actions/core` pulls in `@actions/http-client` and therefore undici, which
 * adds ~640 KB to the committed bundle for an HTTP stack Node 24 already has
 * built in. The workflow-command protocol implemented here is small and stable,
 * so the trade is worth it for a bundle customers can actually audit.
 *
 * @see https://docs.github.com/actions/reference/workflow-commands-for-github-actions
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';

function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function issueCommand(command: string, message: string): void {
  process.stdout.write(`::${command}::${escapeData(message)}${'\n'}`);
}

export function getInput(name: string): string {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  return process.env[key] ?? '';
}

export function setSecret(secret: string): void {
  issueCommand('add-mask', secret);
}

export function setOutput(name: string, value: string): void {
  const file = process.env['GITHUB_OUTPUT'];
  if (file === undefined || file === '') {
    warning(
      `GITHUB_OUTPUT is not set, so the "${name}" output was not written.`
    );
    return;
  }
  const delimiter = `ghadelimiter_${randomUUID()}`;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path comes from the runner's own GITHUB_OUTPUT variable
  appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, {
    encoding: 'utf8'
  });
}

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function warning(message: string): void {
  issueCommand('warning', message);
}

export function setFailed(message: string): void {
  issueCommand('error', message);
  process.exitCode = 1;
}
