// First run opens a browser for consent and saves secrets/token.json; later runs reuse it.
import { readFile, writeFile } from "node:fs/promises";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = "secrets/credentials.json";
const TOKEN_PATH = "secrets/token.json";

type Token = { client_id: string; client_secret: string; refresh_token?: string | null };

// local-auth returns a client from an older google-auth-library that googleapis
// doesn't recognize (it silently sends no credentials), so always build our own.
function clientFromToken(token: Token) {
  const client = new google.auth.OAuth2(token.client_id, token.client_secret);
  client.setCredentials({ refresh_token: token.refresh_token });
  return client;
}

// interactive: allowed to open a browser for consent (only on a machine with one).
export async function authorize(interactive = false) {
  try {
    return clientFromToken(JSON.parse(await readFile(TOKEN_PATH, "utf8")));
  } catch (err) {
    if (!interactive) {
      throw new Error(
        `Cannot read ${TOKEN_PATH} (${(err as Error).message}). ` +
          "Run `npm run list` on a machine with a browser and copy secrets/ here.",
      );
    }
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
  return clientFromToken(token);
}
