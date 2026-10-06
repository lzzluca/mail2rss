import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Parser from "rss-parser";
import { parseMessage, buildFeeds } from "../src/feed.ts";

const raw = await readFile(new URL("./fixtures/sample.eml", import.meta.url));

test("parseMessage decodes headers and keeps the HTML body", async () => {
  const entry = await parseMessage(raw);
  assert.equal(entry.id, "<abc123@mail.example.com>");
  assert.equal(entry.title, "Crisi test: L’Italia è pronta?");
  assert.equal(entry.fromAddress, "news@example.com");
  assert.equal(entry.fromName, "Example News");
  assert.equal(entry.date.toISOString(), "2026-10-04T06:37:03.000Z");
  assert.match(entry.html, /<h1>Hello<\/h1>/);
});

test("buildFeeds writes one parseable Atom feed per sender", async () => {
  const entry = await parseMessage(raw);
  const other = { ...entry, id: "<x@y>", fromAddress: "other@example.net", fromName: "Other" };
  const feeds = buildFeeds([entry, other]);

  assert.deepEqual([...feeds.keys()].sort(), ["news-example-com.xml", "other-example-net.xml"]);

  const parsed = await new Parser().parseString(feeds.get("news-example-com.xml")!);
  assert.equal(parsed.title, "Example News");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, "Crisi test: L’Italia è pronta?");
  assert.equal(parsed.items[0].id, "mid:abc123@mail.example.com");
  assert.match(parsed.items[0].content ?? "", /<h1>Hello<\/h1>/);
});
