# -*- coding: utf-8 -*-
# Pack the extension for the Chrome Web Store: manifest + src + icons into
# dist/sc-hangar-exporter-v<version>.zip. No build system - the shipped
# files ARE the source files.
import json, os, zipfile

root = os.path.dirname(os.path.abspath(__file__))
manifest = json.load(open(os.path.join(root, "manifest.json")))
version = manifest["version"]
os.makedirs(os.path.join(root, "dist"), exist_ok=True)

def pack(suffix, manifest_text):
    out = os.path.join(root, "dist",
                       "sc-hangar-exporter-%sv%s.zip" % (suffix, version))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", manifest_text)
        for sub in ("src", "icons"):
            for name in sorted(os.listdir(os.path.join(root, sub))):
                z.write(os.path.join(root, sub, name), sub + "/" + name)
    print("built", out)

# Chrome / Edge / every Chromium: the manifest as-is.
pack("", json.dumps(manifest, indent=2))

# Firefox: same code byte for byte - the reader touches no extension
# APIs - plus the gecko block AMO requires (stable add-on id and the
# declaration that no data is collected, which is the truth).
ff = dict(manifest)
ff["browser_specific_settings"] = {
    "gecko": {
        "id": "sc-hangar-exporter@digitalhorizonsoftware.com",
        "strict_min_version": "115.0",
        "data_collection_permissions": {"required": ["none"]},
    }
}
pack("firefox-", json.dumps(ff, indent=2))
