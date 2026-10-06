// Step 2: rebuild one Atom feed per sender from the last 30 days of mail.
// Stateless: every run regenerates the feeds; readers dedupe on the Message-ID.
import { mkdir, writeFile } from "node:fs/promises";
import { google } from "googleapis";
import { authorize } from "./auth.ts";
import { parseMessage, buildFeeds, type Entry } from "./feed.ts";

const OUT_DIR = "out";
// Skip Google's own account/forwarding notices that also land in this inbox.
const QUERY = "newer_than:30d -from:google.com";

const gmail = google.gmail({ version: "v1", auth: await authorize() });

const ids: string[] = [];
let pageToken: string | undefined;
do {
  const res = await gmail.users.messages.list({ userId: "me", q: QUERY, pageToken });
  ids.push(...(res.data.messages ?? []).map((m) => m.id!));
  pageToken = res.data.nextPageToken ?? undefined;
} while (pageToken);

const entries: Entry[] = [];
for (const id of ids) {
  const msg = await gmail.users.messages.get({ userId: "me", id, format: "raw" });
  entries.push(await parseMessage(Buffer.from(msg.data.raw!, "base64url")));
}

await mkdir(OUT_DIR, { recursive: true });
for (const [name, xml] of buildFeeds(entries)) {
  await writeFile(`${OUT_DIR}/${name}`, xml);
  console.log(`${OUT_DIR}/${name}`);
}
console.log(`${entries.length} messages`);
