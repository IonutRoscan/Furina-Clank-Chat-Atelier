# Furina architecture

Furina is deliberately built as a plain Manifest V3 extension with ordered content scripts rather than a bundled framework application. This keeps the project easy to inspect, fork, and load locally.

## Runtime model

`manifest.json` injects Furina's JavaScript files in a deliberate order. Early scripts establish shared helpers and state; later scripts register feature managers and UI sections.

Most modules communicate through the shared `window.ClankAtelier` namespace. This acts as a lightweight module registry in an environment where every file is loaded as a classic content script.

## ClankWorld is a single-page application

Conversation changes do not necessarily reload the browser page. Furina therefore cannot depend on normal page-load events alone.

`src/content/chat-lifecycle.js` watches the page and coordinates work that must happen when:

- a chat route appears
- the active conversation changes
- the composer is rebuilt
- messages stream or rerender
- Furina needs to clean up after leaving a supported route

A large portion of Furina's defensive code exists because third-party application DOM is not a stable API.

## Selectors and message classification

`src/content/selectors.js` centralizes knowledge about ClankWorld's current DOM. Features should prefer shared selectors and semantic checks over copying fragile class strings throughout the project.

The renderer tries to classify only real assistant/user messages. Broad selectors are intentionally avoided because ClankWorld contains many visually similar controls and cards.

## Rendering

The renderer pipeline lives under `src/renderer/`.

It handles Furina's richer Markdown presentation, Atelier Markup, source extraction, lightbox behavior, and the process of decorating messages without replacing ClankWorld's underlying data.

Furina should preserve native message behavior whenever possible. Rendering is a client-side presentation layer, not a server-side message rewrite.

## Director

The Director system is intentionally designed around ClankWorld's normal composer and send flow.

Furina does not reproduce ClankWorld's backend request. Immediately before a genuine user send, Director can prepare a marked OOC block in the real composer so ClankWorld's own handler sends the message normally.

After the message appears in chat, Furina's renderer can hide only Furina-owned marker blocks locally. The underlying sent message still contains the context because the AI must actually receive it.

This distinction is important:

- hiding is local presentation
- injection is user-message content
- Furina does not create a privileged system message
- Furina must never send without the user's explicit normal send action

## Storage

Storage is local extension state backed by the browser `storage` permission. Different managers own different pieces of state, often scoped by conversation ID.

New fields should have safe defaults because existing users can upgrade with partial/older state. Routers and managers should also remain defensive in case storage is missing or malformed.

## Themes and cosmetics

Theme state is applied to normal chat independently from special interfaces such as Phantom or Visual Novel mode. Presentation features should be opt-in when they substantially alter the user's existing chat.

The HUD/frame system, message skins, composer skins, ornaments, atmosphere, stickers, and related effects should avoid taking ownership of native pseudo-elements or DOM regions that ClankWorld itself may reuse.

## SFX

Interface sounds and Roleplay SFX are separate systems.

Roleplay SFX can react to newly generated assistant text, but historical messages are seeded silently so opening an old conversation does not replay an entire story's sound events.

Manual next-send SFX are local presentation. They are queued intentionally by the user and should not insert SFX metadata into the outgoing Clank message.

## UI

The main panel is split between Essentials Mode and Full Atelier. Workspace routers select one view at a time rather than rebuilding the entire control surface for every small setting change.

Feature UI modules live under `src/ui/sections/` and should call manager APIs instead of reproducing manager logic.

## Special interfaces

Phantom Chat and Visual Novel Mode are separate presentation systems. Changes to standard chat should not casually alter their files or assumptions.

## Internationalization

There are two translation layers:

- `_locales/` contains browser-extension metadata used by the manifest.
- `src/i18n/locales/` contains Furina runtime UI strings.

English is the runtime fallback.

## Packaging

The repository itself contains documentation and development tools, but a release ZIP should contain only runtime extension files:

```text
manifest.json
_locales/
icons/
src/
styles/
```

Use `tools/package-chromium.ps1` to create a clean Chromium archive.
