import { sendEmail, sendSms, type SendOptions } from './api';
import * as core from './core';
import {
  buildEmailRequest,
  buildSmsRequest,
  optionalInput,
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
    const to = requiredInput('to');

    const options: SendOptions = {
      apiKey,
      region: readRegion(),
      baseUrl: optionalInput('base-url')
    };

    const result =
      ACTION_CHANNEL === 'sms'
        ? await sendSms(buildSmsRequest(type, to), options)
        : await sendEmail(buildEmailRequest(type, to), options);

    if (result.trackingId !== undefined) {
      core.setOutput('tracking-id', result.trackingId);
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
    if (failOnError) {
      core.setFailed(message);
    } else {
      core.warning(message);
    }
  }
}

void run();
