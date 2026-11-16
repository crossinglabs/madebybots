# madebybots

Software products built with AI agents and orchestrated by Jose Alvarado. The homepage is one blueprint: a central Made by Bots core wired to one chip per product.

Apps come only from `apps.json`. Adding an entry adds a chip and its traces. Empty fields stay hidden. Placeholder chips are labeled “App 0N” and do not open a datasheet.

## Run locally

`apps.json` is loaded with `fetch`, so open the site over HTTP:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. A datasheet deep link looks like http://localhost:8080/#/apps/pickthemenu.

## Check the data file

```bash
npx ajv-cli@5 validate --spec=draft2020 --validate-formats=false -s apps.schema.json -d apps.json
```

## Deploy

Static files live at the repo root. There is no build step.

- Vercel: framework Other, no build command, output directory `/`. Headers and clean URLs are in `vercel.json`.
- Cloudflare Workers static assets: `npx wrangler deploy` using `wrangler.jsonc`. Cache and security headers are in `_headers`.

`Contact` in the nav stays hidden until `site.contactUrl` is set in `apps.json`.
