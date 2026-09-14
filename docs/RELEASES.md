# Release workflow

## Chromium

1. Update `version` and `version_name` in `manifest.json`.
2. Run `node tools/validate-manifest.mjs`.
3. Load the repository root as an unpacked extension and perform real-browser testing.
4. Run `tools/package-chromium.ps1`.
5. Inspect the resulting ZIP and verify that `manifest.json` is at the archive root.
6. Publish the ZIP through the website and/or GitHub Releases.

The release script excludes repository-only files such as README documents, GitHub templates, and tools.

## Firefox

Treat Firefox as a separate packaging target. Start from the same source tree, make only the compatibility/manifest changes required by Firefox, test the unpacked/temporary extension, and then build an AMO-ready ZIP with `manifest.json` at archive root.

Do not overwrite the Chromium manifest/package until the Firefox differences have been reviewed.
