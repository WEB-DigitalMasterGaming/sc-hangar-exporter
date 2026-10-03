# SC Ship Database Hangar Exporter

Export your Star Citizen hangar — **ships, paints and items** — to a
single `hangar.json` file, straight from your own My Hangar page on
robertsspaceindustries.com.

Built for (but not limited to) the **SC Ship Database** mobile app, which
imports `hangar.json` directly: ships go through matching, paints and
items appear with full-size images. The app's own "Connect to RSI" import
uses this very same reader, so the two stay in lockstep.

## What it does — and everything it does not

- It runs **only on your My Hangar page** (`/account/pledges`), in **your**
  browser, with **your** existing login. It never sees or asks for your
  password.
- It reads the pledge list that page already shows you and saves it as a
  **local file on your computer**. Nothing is uploaded, transmitted, or
  stored anywhere else. There is no server, no analytics, no tracking.
- It requests **no browser permissions** beyond running on that one page.
- The code is short and readable — you are encouraged to read it. The
  whole reader lives in `src/reader.js`.

## Install

- **Chrome Web Store:** (listing pending)
- **Manual (load unpacked):** download this repository or a release zip,
  unzip it, open `chrome://extensions`, enable Developer mode, choose
  **Load unpacked**, and select the folder. Then open My Hangar on
  robertsspaceindustries.com and click **Download Hangar**.

## What the file contains

One JSON array. Every row carries its pledge facts (`pledge_id`,
`pledge_name`, `pledge_date`, `pledge_cost`, `lti`, `warbond`) and
self-identifies via `entity_type`:

| entity_type | what it is |
|---|---|
| `ship` | a ship, with `name` and manufacturer |
| `skin` | a paint, with `title` and store image |
| `equipment` / `component` / `decoration` | hangar items, with `title`, label and store image |
| `item` | any item kind the store invents later — kept, with its `kind_label` |

Insurance and store-credit rows are deliberately not exported.

## Credits

The idea of exporting straight from the hangar page was pioneered by
[HangarXPLOR](https://github.com/dolkensp/HangarXPLOR). This project is an
independent implementation, but the approach owes that lineage a nod.

## License

MIT — see [LICENSE](LICENSE).

Unofficial fan project. Not affiliated with Cloud Imperium Games.
Star Citizen® is a trademark of Cloud Imperium Rights LLC.
