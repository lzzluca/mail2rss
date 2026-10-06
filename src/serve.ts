// Step 3: long-running container entrypoint.
// Rebuilds the feeds every hour in a child process (a failed build, e.g. an expired
// token, is logged and the last good feeds keep being served) and serves out/ over HTTP.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";

const PORT = 8080;
const INTERVAL_MS = 60 * 60 * 1000;

function build() {
  execFile("node", ["--import", "tsx", "src/build.ts"], (err, stdout, stderr) => {
    const time = new Date().toISOString();
    if (err) console.error(`${time} build failed:\n${stderr || err.message}`);
    else console.log(`${time} build ok:\n${stdout}`);
  });
}

createServer(async (req, res) => {
  // Only plain feed file names: no paths, so no traversal outside out/.
  const name = req.url?.slice(1) ?? "";
  if (!/^[a-z0-9-]+\.xml$/.test(name)) return res.writeHead(404).end();
  try {
    const xml = await readFile(`out/${name}`);
    res.writeHead(200, { "content-type": "application/atom+xml; charset=utf-8" }).end(xml);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, () => console.log(`serving feeds on :${PORT}`));

build();
setInterval(build, INTERVAL_MS);
