"use strict";

// src/api.ts
var REGION_BASE_URLS = {
  us: "https://api.pingram.io",
  eu: "https://api.eu.pingram.io",
  ca: "https://api.ca.pingram.io"
};
function resolveBaseUrl(options) {
  const baseUrl = options.baseUrl ?? REGION_BASE_URLS[options.region];
  return baseUrl.replace(/\/+$/, "");
}
async function sendEmail(request, options) {
  return post("/email", request, options);
}
async function post(path, request, options) {
  const url = `${resolveBaseUrl(options)}${path}`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `pingram-github-action/${"1.0.0"}`
      },
      body: JSON.stringify(request)
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not reach the Pingram API at ${url}: ${reason}`);
  }
  const body = await response.text();
  let result = {};
  if (body !== "") {
    try {
      result = JSON.parse(body);
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
function describeFailure(status, result, rawBody) {
  const detail = result.error?.message ?? truncate(rawBody);
  const parts = [`Pingram API request failed (HTTP ${String(status)})`];
  if (detail !== "") {
    parts.push(detail);
  }
  if (result.error?.fix !== void 0) {
    parts.push(result.error.fix);
  }
  if (status === 401 || status === 403) {
    parts.push(
      "Check that the api-key input is a valid pingram_sk_ key for the selected region."
    );
  }
  return parts.join(" \u2014 ");
}
function truncate(value) {
  const trimmed = value.trim();
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}\u2026` : trimmed;
}

// src/core.ts
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
function escapeData(value) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function issueCommand(command, message) {
  process.stdout.write(`::${command}::${escapeData(message)}${"\n"}`);
}
function getInput(name) {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return process.env[key] ?? "";
}
function setSecret(secret) {
  issueCommand("add-mask", secret);
}
function setOutput(name, value) {
  const file = process.env["GITHUB_OUTPUT"];
  if (file === void 0 || file === "") {
    warning(
      `GITHUB_OUTPUT is not set, so the "${name}" output was not written.`
    );
    return;
  }
  const delimiter = `ghadelimiter_${(0, import_node_crypto.randomUUID)()}`;
  (0, import_node_fs.appendFileSync)(file, `${name}<<${delimiter}
${value}
${delimiter}
`, {
    encoding: "utf8"
  });
}
function info(message) {
  process.stdout.write(`${message}
`);
}
function warning(message) {
  issueCommand("warning", message);
}
function setFailed(message) {
  issueCommand("error", message);
  process.exitCode = 1;
}

// src/inputs.ts
var REGIONS = ["us", "eu", "ca"];
var PHONE_PATTERN = /^\+?[0-9][0-9\s\-().]*$/;
function optionalInput(name) {
  const value = getInput(name).trim();
  return value === "" ? void 0 : value;
}
function requiredInput(name) {
  const value = optionalInput(name);
  if (value === void 0) {
    throw new Error(`The "${name}" input is required.`);
  }
  return value;
}
function splitCommaList(value) {
  return value.split(",").map((item) => item.trim()).filter((item) => item !== "");
}
function listInput(name) {
  const value = optionalInput(name);
  if (value === void 0) {
    return void 0;
  }
  const items = splitCommaList(value);
  return items.length > 0 ? items : void 0;
}
function parseRecipients(to) {
  const recipients = splitCommaList(to);
  if (recipients.length === 0) {
    throw new Error('The "to" input is required.');
  }
  return recipients;
}
function readRegion() {
  const value = (optionalInput("region") ?? "us").toLowerCase();
  const region = REGIONS.find((candidate) => candidate === value);
  if (region === void 0) {
    throw new Error(
      `Unsupported region "${value}". Use one of: ${REGIONS.join(", ")}.`
    );
  }
  return region;
}
function readFailOnError() {
  return (optionalInput("fail-on-error") ?? "true").toLowerCase() !== "false";
}
function buildEmailRequest(type, to) {
  if (PHONE_PATTERN.test(to)) {
    throw new Error(
      `The "to" input looks like a phone number. This action sends email \u2014 use pingram-io/github-actions-send-sms to send an SMS.`
    );
  }
  const subject = optionalInput("subject");
  const html = optionalInput("html");
  const missing = [
    subject === void 0 ? "subject" : void 0,
    html === void 0 ? "html" : void 0
  ].filter((name) => name !== void 0);
  if (missing.length > 0) {
    throw new Error(
      `Sending email requires the ${missing.join(" and ")} input${missing.length > 1 ? "s" : ""}.`
    );
  }
  return {
    type,
    to,
    subject,
    html,
    fromName: optionalInput("from-name"),
    fromAddress: optionalInput("from-address"),
    previewText: optionalInput("preview-text"),
    replyToAddresses: listInput("reply-to"),
    ccAddresses: listInput("cc"),
    bccAddresses: listInput("bcc"),
    schedule: optionalInput("schedule")
  };
}

// src/index.ts
async function run() {
  const failOnError = readFailOnError();
  try {
    const apiKey = requiredInput("api-key");
    setSecret(apiKey);
    const type = requiredInput("type");
    const recipients = parseRecipients(requiredInput("to"));
    const options = {
      apiKey,
      region: readRegion(),
      baseUrl: optionalInput("base-url")
    };
    const sends = false ? recipients.map((to) => {
      const request = buildSmsRequest(type, to);
      return { to, send: () => sendSms(request, options) };
    }) : recipients.map((to) => {
      const request = buildEmailRequest(type, to);
      return { to, send: () => sendEmail(request, options) };
    });
    const trackingIds = [];
    const failures = [];
    for (const { to, send } of sends) {
      try {
        const result = await send();
        if (result.trackingId !== void 0) {
          trackingIds.push(result.trackingId);
        }
        info(
          `Pingram accepted the ${"email"} for ${to}${result.trackingId === void 0 ? "" : ` (tracking id ${result.trackingId})`}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${to}: ${message}`);
        warning(`Failed to send ${"email"} to ${to}: ${message}`);
      }
    }
    if (trackingIds.length > 0) {
      setOutput("tracking-id", trackingIds.join(","));
    }
    if (failures.length > 0) {
      const summary = failures.length === 1 ? failures[0] : `Failed to send to ${String(failures.length)} of ${String(recipients.length)} recipients \u2014 ${failures.join("; ")}`;
      if (failOnError) {
        setFailed(summary);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (failOnError) {
      setFailed(message);
    } else {
      warning(message);
    }
  }
}
void run();
