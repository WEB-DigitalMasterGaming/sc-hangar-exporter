# SC Hangar Exporter

Export your Star Citizen hangar — **ships AND paints** — to a single
`hangar.json` file, straight from your own account page on
robertsspaceindustries.com.

This is a fork of the excellent
**[HangarXPLOR](https://github.com/dolkensp/HangarXPLOR)** by Peter Dolkens
(/u/alluran), which has served the Star Citizen community for years. All of
the hangar-page parsing this tool is built on is his work — this fork adds
the combined export and paint support. Thank you, upstream. ❤️

## What it adds over stock HangarXPLOR

- **Download Hangar** — one `hangar.json` containing every ship *and* every
  paint you own, each row labelled with its `entity_type`. Tools that only
  understand ships can skip the paints; tools that know both get everything
  from one file.
- **Paint images** — each paint carries its store image URL.
- The stock **Download CSV** and ships-only **Download JSON** remain
  unchanged for the tools that already consume them.

Built for (but not limited to) the
**SC Ship Database** mobile app, which imports `hangar.json` directly —
ships go through matching, paints appear with full-size images.

## What this extension does and does not do

- It runs **only on robertsspaceindustries.com**, in **your** browser, with
  **your** existing login. It never sees or asks for your password.
- It reads the pledge list your own hangar page already shows you, and
  writes it to a **local file on your computer**. Nothing is uploaded,
  transmitted, or stored anywhere else. There is no server.
- The code is short and readable — you are encouraged to read it. The
  export logic lives in `src/web_resources/HangarXPLOR.Download.js`.

## `in-app-reader/`

The SC Ship Database app also offers "Connect to RSI" on the phone: an
in-app browser where you sign in on RSI's own pages and the app reads your
hangar the same way this extension does. The exact script the app injects
is published here as
[`in-app-reader/hangar_connect.js`](in-app-reader/hangar_connect.js) so
anyone can verify what it reads: pledge names, ship names, paint names and
images — nothing else, and only on the hangar page, only when you tap.

## Install (until the store listing exists)

1. Download this repository (Code → Download ZIP) and unzip it.
2. Build: `npm install && node build.js 1.9.9.4`, or use a prebuilt zip
   from Releases.
3. In Chrome: `chrome://extensions` → enable Developer mode →
   **Load unpacked** → select the built `dist/HangarXPLOR-chrome-v...`
   folder.
4. Open your Hangar on robertsspaceindustries.com and click
   **Download Hangar**.

## License

MIT, same as upstream — see [LICENSE](LICENSE). Original work
copyright Peter Dolkens; modifications copyright Digital Horizon Software
(admin@digitalhorizonsoftware.com).
