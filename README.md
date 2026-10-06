# mail2rss

Turn email newsletters into Atom feeds for a self-hosted RSS reader (e.g. FreshRSS), without handing your inbox to a third-party service.

mail2rss reads a Gmail inbox through the Gmail API with a **read-only** OAuth scope and writes **one Atom feed per sender**, one entry per email.

## How it works

```
newsletters → main Gmail ──(auto-forward filter)──> dedicated Gmail
                                                         │ Gmail API, gmail.readonly
                                                         ▼
                                   mail2rss container ──(Atom)──> FreshRSS
```

- Subscriptions stay on your main account; a Gmail filter forwards them to a second account used only for this. If the token leaks, it exposes newsletters, not your personal mail.
- Every hour mail2rss rebuilds the feeds from the last 30 days of mail. It keeps no state: each entry's id comes from the email's `Message-ID`, so the reader recognises entries it has already seen.
- Feeds are served on port 8080 **only inside a Docker network** (no published ports), at `http://mail2rss:8080/<sender>.xml`, e.g. `newsletter-example-com.xml` for `newsletter@example.com`.

## Setup

### 1. Google Cloud

1. Create a project and enable the **Gmail API**.
2. Configure the OAuth consent screen: audience **External**, scope `https://www.googleapis.com/auth/gmail.readonly`, and add the inbox account as a **test user**.
3. Create an OAuth client of type **Desktop app** and download its JSON.

### 2. First consent (on a machine with a browser)

```sh
npm install
mkdir secrets && mv ~/Downloads/client_secret_*.json secrets/credentials.json
npm run list
```

Sign in with the **inbox account**. This saves `secrets/token.json` (mode 600) and prints the latest messages. `secrets/` is git-ignored.

### 3. Run on the server

Copy `secrets/` next to `compose.yaml`, then:

```sh
docker compose up -d --build
docker compose logs -f                      # "build ok" every hour
docker compose exec mail2rss ls /app/out    # generated feeds
```

Subscribe in your reader to `http://mail2rss:8080/<file>.xml`. A feed exists only after its sender's first email has arrived.

`compose.yaml` contains two values specific to my server; adapt them to yours:

- `user: "1001:1001"`: the uid/gid that owns `secrets/` on the host (`id -u`, `id -g`).
- `name: freshrss_default`: the Docker network your reader runs on (`docker network ls`).

## Limitations

- While the OAuth app is in **Testing**, Google expires the refresh token after 7 days: delete `secrets/token.json` and rerun `npm run list`. Publishing the app to Production removes the limit, but Google then requires a home page and a privacy policy.
- Only the last 30 days of mail are included; older entries stay in your reader.
- Newsletter HTML is passed through as is, tracking pixels included.

## Development

```sh
npm test          # parsing and feed generation, against a synthetic email
npm run typecheck
```

## License

[MIT](LICENSE)
