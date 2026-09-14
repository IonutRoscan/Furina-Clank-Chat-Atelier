<p align="center">
  <img src="icons/icon128.png" width="96" alt="Furina icon">
</p>

<h1 align="center">Furina: Clank Chat Atelier</h1>

<p align="center">
  A client-side browser extension for <a href="https://www.clank.world/">ClankWorld</a> focused on chat customization, roleplay immersion, story direction, continuity, and long-form roleplay tools.
</p>

<p align="center">
  <strong>Current version: 1.3.2</strong> · Manifest V3 · Chromium
</p>

## Website and documentation

The dedicated Furina website contains installation help, feature guides, release information, troubleshooting, and interactive examples:

**https://ionutroscan.github.io/furina/**

## What Furina adds

Furina runs entirely on the client and builds a richer workspace around ClankWorld chat.

### Customization

- Global and per-conversation themes
- Static and live backgrounds
- Assistant and user message styling
- Message and composer skins
- Typography, width, spacing, avatars, borders, shadows, and opacity controls
- Chat Frame / HUD skins: Arcane, Cyber, Gothic, Terminal, and Minimal Luxe
- Edge glow, corner ornaments, particles, separators, and other decor
- Advanced CSS for users who want deeper control

### Atelier Markup and interaction

- Scene headers, cards, meters, details, tooltips, spoilers, blur/redaction, and inline effects
- Interactive choices that insert into the composer without sending automatically
- Dice widgets with explicit result insertion
- Quote selected text directly into the composer
- Optional dialogue presentation, speaker nameplates, typing styles, and entrance effects

### Roleplay immersion

- Atmosphere effects
- Stickers and saved sticker layouts
- Music and ambience, including supported SoundCloud and YouTube workflows
- Reader and Focus modes
- Scene Presentation with title cards, transitions, captions, atmosphere presets, and screenshot-oriented presentation tools
- Optional interface sound themes
- Roleplay SFX with automatic assistant-event detection
- Manual next-send RP SFX from the composer
- Custom RP trigger phrases and custom sound URL overrides

### Director and continuity

- Persistent per-conversation Director Notes
- Guard rails and roleplay rules
- Next-reply direction
- Director presets and cue queue
- Knowledge boundaries
- Scene State
- Continuity notes and memory capture tools
- Scene intelligence, scene recaps, timelines, and story-oriented organization
- Bookmarks and chapters

Director instructions are user-controlled text. Furina does not create a privileged system message or bypass ClankWorld's backend.

### Interfaces and portability

- Essentials Mode for a smaller, simpler control surface
- Full Atelier for the complete toolset
- Visual Novel Mode
- Phantom Chat
- Response Style library
- Profile Atelier / Miyabi profile customization
- Theme and setup import/export
- Built-in guide and diagnostics tools

## What's new in 1.3.2

1.3.2 is a major customization and immersion release. Highlights include:

- Atelier Markup expansion
- Interactive choices and dice
- Message and composer skins
- Quote to Composer
- Optional dialogue presentation and speaker nameplates
- Interface Sounds
- Automatic and manual Roleplay SFX
- Custom RP sound triggers and URL overrides
- Chat Frame / HUD skins
- Scene Presentation improvements and distinct transition effects
- Arabic interface translation
- Mobile launcher redesign to avoid overlapping the composer
- Stability, migration, and source-documentation work

See the website for the user-facing guide and release notes.

## Installation

### Chromium / Brave / Chrome / Edge

1. Download the latest Chromium release ZIP from the Furina website or GitHub Releases.
2. Extract the ZIP to a folder. Do not load the ZIP itself as an unpacked extension.
3. Open your browser's extensions page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode**.
5. Choose **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Open a ClankWorld chat and refresh the page once after installing or updating Furina.

For normal users, the packaged release from the website is recommended over cloning the repository.

## Permissions and privacy

Furina intentionally keeps its extension permissions small:

```text
storage
https://www.clank.world/*
```

- `storage` stores Furina settings and user-created local data.
- The ClankWorld host permission allows the content scripts to customize supported ClankWorld pages.
- Furina does not request access to browser history, cookies, passwords, or unrelated websites.
- Furina does not modify ClankWorld's backend or increase a model's real context window.
- Director features work by preparing user-controlled context in the normal Clank composer/send flow.

Some optional media features can load resources from URLs supplied by the user or supported third-party media services.

## Supported interface languages

Furina currently includes:

- English
- Spanish
- French
- German
- Brazilian Portuguese
- Romanian
- Japanese
- Hindi
- Arabic

Missing or newly-added strings safely fall back to English.

## Development

Furina intentionally has no bundler or required package-manager build step. The extension is plain JavaScript, CSS, JSON, and browser-extension assets.

That means the repository can be loaded directly as an unpacked extension while developing:

```text
manifest.json
_locales/
icons/
src/
styles/
```

After changing a content script, reload the unpacked extension and refresh the open ClankWorld tab so the updated script is injected.

### Source map

```text
src/
├── core/           Shared namespace and core helpers
├── content/        Clank detection, selectors, lifecycle and diagnostics
├── storage/        Persistence helpers
├── renderer/       Markdown, Atelier Markup and message rendering
├── themes/         Theme state and application
├── features/       Director, continuity, SFX, stickers, ambience, story tools, etc.
├── i18n/           Runtime translations
├── profile/        Profile Atelier / Miyabi
└── ui/             Panel, workspaces, Essentials and feature sections

styles/             Feature and UI stylesheets
_locales/           Browser-extension metadata translations
icons/              Extension icons
```

For a deeper overview, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Validation and packaging

The repository includes lightweight validation and packaging helpers.

Run the repository checks with Node.js:

```powershell
node tools/validate-manifest.mjs
```

To create a clean Chromium release ZIP on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools/package-chromium.ps1
```

The packaging script deliberately includes only extension runtime files. Repository documentation, Git metadata, issue templates, and development tools are not copied into the release archive.

## Contributing and forking

Forks, experiments, translations, fixes, and feature work are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

The source is heavily commented with an emphasis on lifecycle decisions, ClankWorld DOM assumptions, state ownership, and the reasons behind non-obvious workarounds.

## Firefox

Firefox support is packaged separately because browser-extension submission requirements and manifest compatibility can differ from Chromium.

Do not assume the Chromium release ZIP is the final Firefox/AMO package. The shared source remains usable; the Firefox release should be produced and validated as its own build.

## Disclaimer

Furina is an independent community project and is not affiliated with or endorsed by ClankWorld.

## License

Released under the [MIT License](LICENSE).
