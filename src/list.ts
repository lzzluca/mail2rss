// Step 1: authorize against the newsletters Gmail account and list the latest messages.
// First run opens a browser for consent and saves secrets/token.json; later runs reuse it.
import { readFile, writeFile } from "node:fs/promises";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = "secrets/credentials.json";
const TOKEN_PATH = "secrets/token.json";

async function authorize() {
  try {
    const token = JSON.parse(await readFile(TOKEN_PATH, "utf8"));
    return google.auth.fromJSON(token);
  } catch {
    // No saved token yet: run the browser consent flow.
  }

  const client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
  const keys = JSON.parse(await readFile(CREDENTIALS_PATH, "utf8"));
  const key = keys.installed ?? keys.web;
  const token = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  };
  // The token grants mailbox read access: owner-only permissions.
  await writeFile(TOKEN_PATH, JSON.stringify(token), { mode: 0o600 });
  return client;
}

const auth = await authorize();
const gmail = google.gmail({ version: "v1", auth: auth as any });

const profile = await gmail.users.getProfile({ userId: "me" });
console.log(`Mailbox: ${profile.data.emailAddress}\n`);

const list = await gmail.users.messages.list({ userId: "me", maxResults: 5 });
for (const { id } of list.data.messages ?? []) {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: id!,
    format: "metadata",
    metadataHeaders: ["From", "Subject"],
  });
  const header = (name: string) =>
    msg.data.payload?.headers?.find((h) => h.name === name)?.value ?? "";
  console.log(`${header("From")}\n  ${header("Subject")}`);
}
