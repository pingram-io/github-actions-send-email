import { sendEmail, sendSms, type SendOptions, type SendResult } from './api';
import * as core from './core';
import {
  buildEmailRequest,
  buildSmsRequest,
  optionalInput,
  parseRecipients,
  readFailOnError,
  readRegion,
  requiredInput
} from './inputs';

// Replaced at build time by esbuild. Email and SMS are published as separate
// actions so each one's action.yml lists only the inputs it uses, so this is a
// constant per bundle and the other channel's branch is dropped entirely.
declare const ACTION_CHANNEL: 'email' | 'sms';

async function run(): Promise<void> {
  const failOnError = readFailOnError();

  try {
    const apiKey = requiredInput('api-key');
    core.setSecret(apiKey);

    const type = requiredInput('type');
    const recipients = parseRecipients(requiredInput('to'));

    const options: SendOptions = {
      apiKey,
      region: readRegion(),
      baseUrl: optionalInput('base-url')
    };

    // Build every request up front so a bad recipient fails before any send.
    const sends: Array<{ to: string; send: () => Promise<SendResult> }> =
      ACTION_CHANNEL === 'sms'
        ? recipients.map((to) => {
            const request = buildSmsRequest(type, to);
            return { to, send: () => sendSms(request, options) };
          })
        : recipients.map((to) => {
            const request = buildEmailRequest(type, to);
            return { to, send: () => sendEmail(request, options) };
          });

    const trackingIds: string[] = [];
    const failures: string[] = [];

    for (const { to, send } of sends) {
      try {
        const result = await send();

        if (result.trackingId !== undefined) {
          trackingIds.push(result.trackingId);
        }

        core.info(
          `Pingram accepted the ${ACTION_CHANNEL} for ${to}${
            result.trackingId === undefined
              ? ''
              : ` (tracking id ${result.trackingId})`
          }`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${to}: ${message}`);
        core.warning(`Failed to send ${ACTION_CHANNEL} to ${to}: ${message}`);
      }
    }

    if (trackingIds.length > 0) {
      core.setOutput('tracking-id', trackingIds.join(','));
    }

    if (failures.length > 0) {
      const summary =
        failures.length === 1
          ? failures[0]!
          : `Failed to send to ${String(failures.length)} of ${String(recipients.length)} recipients — ${failures.join('; ')}`;
      if (failOnError) {
        core.setFailed(summary);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (failOnError) {
      core.setFailed(message);
    } else {
      core.warning(message);
    }
  }
}

void run();
