import type { SendEmailRequest, SendSmsRequest } from 'pingram';
import * as core from './core';
import type { Region } from './api';

const REGIONS: readonly Region[] = ['us', 'eu', 'ca'];

// A `to` value made only of digits and phone punctuation is a phone number.
const PHONE_PATTERN = /^\+?[0-9][0-9\s\-().]*$/;

export function optionalInput(name: string): string | undefined {
  const value = core.getInput(name).trim();
  return value === '' ? undefined : value;
}

export function requiredInput(name: string): string {
  const value = optionalInput(name);
  if (value === undefined) {
    throw new Error(`The "${name}" input is required.`);
  }
  return value;
}

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function listInput(name: string): string[] | undefined {
  const value = optionalInput(name);
  if (value === undefined) {
    return undefined;
  }
  const items = splitCommaList(value);
  return items.length > 0 ? items : undefined;
}

/** One or more recipients from a comma-separated `to` input. */
export function parseRecipients(to: string): string[] {
  const recipients = splitCommaList(to);
  if (recipients.length === 0) {
    throw new Error('The "to" input is required.');
  }
  return recipients;
}

export function readRegion(): Region {
  const value = (optionalInput('region') ?? 'us').toLowerCase();
  const region = REGIONS.find((candidate) => candidate === value);
  if (region === undefined) {
    throw new Error(
      `Unsupported region "${value}". Use one of: ${REGIONS.join(', ')}.`
    );
  }
  return region;
}

export function readFailOnError(): boolean {
  return (optionalInput('fail-on-error') ?? 'true').toLowerCase() !== 'false';
}

export function buildEmailRequest(type: string, to: string): SendEmailRequest {
  // Each channel ships as its own action, so a phone number here means the
  // wrong action was used. The API would reject it too, less legibly.
  if (PHONE_PATTERN.test(to)) {
    throw new Error(
      `The "to" input looks like a phone number. This action sends email — use pingram-io/github-actions-send-sms to send an SMS.`
    );
  }

  const subject = optionalInput('subject');
  const html = optionalInput('html');

  const missing = [
    subject === undefined ? 'subject' : undefined,
    html === undefined ? 'html' : undefined
  ].filter((name): name is string => name !== undefined);

  if (missing.length > 0) {
    throw new Error(
      `Sending email requires the ${missing.join(' and ')} input${missing.length > 1 ? 's' : ''}.`
    );
  }

  return {
    type,
    to,
    subject: subject as string,
    html: html as string,
    fromName: optionalInput('from-name'),
    fromAddress: optionalInput('from-address'),
    previewText: optionalInput('preview-text'),
    replyToAddresses: listInput('reply-to'),
    ccAddresses: listInput('cc'),
    bccAddresses: listInput('bcc'),
    schedule: optionalInput('schedule')
  };
}

export function buildSmsRequest(type: string, to: string): SendSmsRequest {
  if (to.includes('@')) {
    throw new Error(
      `The "to" input looks like an email address. This action sends SMS — use pingram-io/github-actions-send-email to send an email.`
    );
  }

  const message = optionalInput('message');
  const mediaUrls = listInput('media-urls');

  if (message === undefined && mediaUrls === undefined) {
    throw new Error(
      'Sending SMS requires the message input, or media-urls for an MMS.'
    );
  }

  return {
    type,
    to,
    message,
    mediaUrls,
    from: optionalInput('from'),
    schedule: optionalInput('schedule')
  };
}
