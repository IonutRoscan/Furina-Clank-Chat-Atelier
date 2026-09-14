# Contributing to Furina

Thanks for taking an interest in Furina.

Furina is a client-side browser extension that lives inside a changing third-party web application, so seemingly small DOM changes can have surprisingly large effects. Contributions should favor stability and graceful fallbacks over clever but fragile selectors.

## Before changing code

- Test against a real ClankWorld chat.
- Keep permissions minimal.
- Do not reproduce ClankWorld backend requests when the normal page flow can be reused.
- Do not send messages or trigger AI turns without an explicit user action.
- Avoid broad DOM selectors that could classify unrelated Clank UI as chat content.
- Preserve existing settings when adding new defaults or storage fields.
- Keep optional presentation features off by default when enabling them would visibly change an existing user's chat.

## Development workflow

1. Fork and clone the repository.
2. Open `chrome://extensions` or your Chromium browser's equivalent.
3. Enable Developer mode.
4. Load the repository root as an unpacked extension.
5. Make a focused change.
6. Reload the extension.
7. Refresh the open ClankWorld tab.
8. Test route changes, conversation switching, streaming replies, and extension reloads where relevant.
9. Run:

```powershell
node tools/validate-manifest.mjs
```

## Code style

Furina uses plain JavaScript rather than a framework or transpiler.

Comments should explain architecture, assumptions, lifecycle behavior, ownership, or the reason a workaround exists. Avoid comments that simply restate obvious syntax.

Prefer small managers/modules that own one feature. When possible, expose a small public API through the shared `window.ClankAtelier` namespace rather than coupling unrelated features directly.

## Pull requests

A useful pull request should include:

- What changed
- Why the change is needed
- Which browser was tested
- Which Furina area was tested
- Whether storage/migration behavior changed
- Screenshots or a short clip for visible UI changes

Please avoid combining unrelated features and cleanup into one large pull request unless the changes genuinely depend on each other.

## Translations

Translation contributions are welcome. Runtime UI strings live under `src/i18n/locales/`, while browser-extension metadata lives under `_locales/`.

English remains the fallback language. New features should still work if a translation has not yet been added.
