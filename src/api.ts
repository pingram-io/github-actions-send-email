import type { SendEmailRequest, SendSmsRequest } from 'pingram';

export type Region = 'us' | 'eu' | 'ca';

const REGION_BASE_URLS: Record<Region, string> = {
  us: 'https://api.pingram.io',
  eu: 'https://api.eu.pingram.io',
  ca: 'https://api.ca.pingram.io'
};

// Replaced at build time by esbuild with the package.json version.
declare const ACTION_VERSION: string;

export interface SendOptions {
  apiKey: string;
  region: Region;
  baseUrl?: string;
}

export interface SendResult {
  trackingId?: string;
  messages?: string[];
  error?: {
    code?: string;
    message?: string;
    fix?: string;
  };
}

export function resolveBaseUrl(options: SendOptions): string {
  const baseUrl = options.baseUrl ?? REGION_BASE_URLS[options.region];
  return baseUrl.replace(/\/+$/, '');
}

export async function sendEmail(
  request: SendEmailRequest,
  options: SendOptions
): Promise<SendResult> {
  return post('/email', request, options);
}

export async function sendSms(
  request: SendSmsRequest,
  options: SendOptions
): Promise<SendResult> {
  return post('/sms', request, options);
}

async function post(
  path: string,
  request: SendEmailRequest | SendSmsRequest,
  options: SendOptions
): Promise<SendResult> {
  const url = `${resolveBaseUrl(options)}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `pingram-github-action/${ACTION_VERSION}`
      },
      body: JSON.stringify(request)
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not reach the Pingram API at ${url}: ${reason}`);
  }

  const body = await response.text();
  let result: SendResult = {};

  if (body !== '') {
    try {
      result = JSON.parse(body) as SendResult;
    } catch {
      throw new Error(
        `Pingram API returned ${String(response.status)} with a non-JSON body: ${truncate(body)}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(describeFailure(response.status, result, body));
  }

  return result;
}

function describeFailure(
  status: number,
  result: SendResult,
  rawBody: string
): string {
  const detail = result.error?.message ?? truncate(rawBody);
  const parts = [`Pingram API request failed (HTTP ${String(status)})`];

  if (detail !== '') {
    parts.push(detail);
  }
  if (result.error?.fix !== undefined) {
    parts.push(result.error.fix);
  }
  if (status === 401 || status === 403) {
    parts.push(
      'Check that the api-key input is a valid pingram_sk_ key for the selected region.'
    );
  }

  return parts.join(' — ');
}

function truncate(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}
