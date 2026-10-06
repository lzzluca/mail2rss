import { simpleParser } from "mailparser";
import { Feed } from "feed";

export type Entry = {
  id: string; // Message-ID header, e.g. <abc@host>
  title: string;
  fromAddress: string;
  fromName: string;
  date: Date;
  html: string;
};

export async function parseMessage(raw: Buffer): Promise<Entry> {
  const mail = await simpleParser(raw);
  const from = mail.from?.value[0];
  return {
    id: mail.messageId ?? "",
    title: mail.subject ?? "(no subject)",
    fromAddress: from?.address ?? "unknown",
    fromName: from?.name || from?.address || "unknown",
    date: mail.date ?? new Date(0),
    html: mail.html || `<pre>${escapeHtml(mail.text ?? "")}</pre>`,
  };
}

// One Atom feed per sender address, keyed by file name.
export function buildFeeds(entries: Entry[]): Map<string, string> {
  const bySender = Map.groupBy(entries, (e) => e.fromAddress);
  const feeds = new Map<string, string>();
  for (const [address, items] of bySender) {
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const feed = new Feed({
      id: `urn:mail2rss:${address}`,
      title: items[0].fromName,
      updated: items[0].date,
    });
    for (const e of items) {
      feed.addItem({
        // mid: is the URL scheme for Message-IDs (RFC 2392); stable, so readers dedupe on it.
        id: `mid:${e.id.replace(/^<|>$/g, "")}`,
        title: e.title,
        link: `mailto:${address}`,
        date: e.date,
        content: e.html,
      });
    }
    feeds.set(`${address.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xml`, feed.atom1());
  }
  return feeds;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
