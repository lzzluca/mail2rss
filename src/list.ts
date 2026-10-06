// Step 1: authorize against the newsletters Gmail account and list the latest messages.
import { google } from "googleapis";
import { authorize } from "./auth.ts";

const auth = await authorize(true);
const gmail = google.gmail({ version: "v1", auth });

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
