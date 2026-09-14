'use strict'


/*
  Developer notes

  Resolves Furina UI strings from the locale dictionaries loaded before this
  module. Missing translations intentionally fall back to English/source text,
  which lets new features ship without making an incomplete locale unusable.
*/
/*
    Furina Internationalization

    Furina keeps one English source UI and translates only Furina-owned
    interface text at render time. User content is deliberately excluded:
    chats, Director notes, preset names, sticker names, URLs, CSS, and other
    saved text are never rewritten by changing the interface language.

    Language preference:
        auto  -> follow browser language when supported
        en    -> English
        es    -> neutral Spanish
        fr    -> French
        de    -> German
        pt_BR -> Brazilian Portuguese
        ro    -> Romanian
        ja    -> Japanese
        hi    -> Hindi
        ar    -> Arabic

    Future translations only need another locale pack plus one entry in the
    supported locale list below.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const STORAGE_KEY = 'furina-language'

  function supportedCodes() {
    return Object.keys(Atelier.LocalePacks || {})
  }

  function findSupportedCode(value) {
    if (!value) {
      return null
    }

    const normalized = String(value).trim().replace(/-/g, '_').toLowerCase()

    return (
      supportedCodes().find(
        code => code.replace(/-/g, '_').toLowerCase() === normalized
      ) || null
    )
  }

  let preference = 'auto'

  let locale = 'en'

  let discoveryObserver = null

  const rootObservers = new WeakMap()

  const reverseCache = new Map()

  let translating = false

  const ROOT_SELECTOR = [
    '#furina-panel',
    '#furina-launcher',
    '#furina-guidebook',
    '#furina-entrance-root',
    '.furina-ambience-player',
    '.furina-focus-exit',
    '.furina-screenshot-notice',
    '.clank-atelier-lightbox'
  ].join(',')

  function browserLanguage() {
    let value = ''

    try {
      value = chrome?.i18n?.getUILanguage?.() || ''
    } catch (_) {
      // Browser locale fallback below.
    }

    if (!value) {
      value = navigator.languages?.[0] || navigator.language || 'en'
    }

    return String(value).toLowerCase()
  }

  function resolveLocale(requested = preference) {
    if (requested && requested !== 'auto') {
      const direct = findSupportedCode(requested)

      if (direct) {
        return direct
      }
    }

    const browser = browserLanguage()

    const exact = findSupportedCode(browser)

    if (exact) {
      return exact
    }

    const base = findSupportedCode(browser.split(/[-_]/)[0])

    if (base) {
      return base
    }

    return findSupportedCode('en') || supportedCodes()[0] || 'en'
  }

  function pack(code = locale) {
    return (
      Atelier.LocalePacks?.[code] ||
      Atelier.LocalePacks?.en || {
        messages: {}
      }
    )
  }

  function getReverseMessages(code) {
    if (reverseCache.has(code)) {
      return reverseCache.get(code)
    }

    const reverse = new Map()

    const messages = Atelier.LocalePacks?.[code]?.messages || {}

    for (const [english, translated] of Object.entries(messages)) {
      if (typeof translated === 'string' && !reverse.has(translated)) {
        reverse.set(translated, english)
      }
    }

    reverseCache.set(code, reverse)

    return reverse
  }

  function canonicalEnglish(value) {
    const source = String(value)

    for (const code of Object.keys(Atelier.LocalePacks || {})) {
      if (code === 'en') {
        continue
      }

      const english = getReverseMessages(code).get(source)

      if (english) {
        return english
      }
    }

    let match = source.match(/^(\d+) recordatorio(?:s)? activo(?:s)?$/)

    if (match) {
      const count = Number(match[1])

      return count === 1 ? '1 active reminder' : `${count} active reminders`
    }

    match = source.match(/^(\d+) stickers?$/)

    if (match) {
      const count = Number(match[1])

      return count === 1 ? '1 sticker' : `${count} stickers`
    }

    match = source.match(
      /^(\d[\d.,]*) \/ 6\.000 caracteres inyectados por mensaje$/
    )

    if (match) {
      return `${match[1]} / 6,000 characters injected per message`
    }

    return source
  }

  function translateDynamic(source) {
    if (locale !== 'es') {
      return source
    }

    let match = source.match(
      /^(\d[\d.,]*) \/ 6,000 characters injected per message$/
    )

    if (match) {
      return `${match[1]} / 6.000 caracteres inyectados por mensaje`
    }

    match = source.match(/^(\d+) active reminder(?:s)?$/)

    if (match) {
      const count = Number(match[1])

      return count === 1
        ? '1 recordatorio activo'
        : `${count} recordatorios activos`
    }

    match = source.match(/^(\d+) sticker(?:s)?$/)

    if (match) {
      const count = Number(match[1])

      return count === 1 ? '1 sticker' : `${count} stickers`
    }

    match = source.match(/^Edit (.+) note:$/)

    if (match) {
      return `Editar nota ${match[1]}:`
    }

    match = source.match(/^Reset (.+) to Furina defaults\?$/)

    if (match) {
      return `¿Restablecer ${t(match[1])} a los valores predeterminados de Furina?`
    }

    match = source.match(/^(\d+) characters?$/)

    if (match) {
      return `${match[1]} caracteres`
    }

    match = source.match(/^(\d[\d.,]*) \/ 30,000 characters$/)

    if (match) {
      return `${match[1]} / 30.000 caracteres`
    }

    match = source.match(/^(\d+) active Director reminder(?:s)?$/)

    if (match) {
      const count = Number(match[1])

      return count === 1
        ? '1 recordatorio de Director activo'
        : `${count} recordatorios de Director activos`
    }

    match = source.match(/^Delete the custom preset "(.+)"\?$/)

    if (match) {
      return `¿Eliminar el preajuste personalizado "${match[1]}"?`
    }

    match = source.match(/^Delete "(.+)" and its (\d+) saved sticker\(s\)\?$/)

    if (match) {
      return `¿Eliminar "${match[1]}" y sus ${match[2]} stickers guardados?`
    }

    match = source.match(/^Delete "(.+)"\?$/)

    if (match) {
      return `¿Eliminar "${match[1]}"?`
    }

    match = source.match(/^Delete "(.+)" from this pack\?$/)

    if (match) {
      return `¿Eliminar "${match[1]}" de este paquete?`
    }

    match = source.match(/^Delete the saved layout "(.+)"\?$/)

    if (match) {
      return `¿Eliminar el diseño guardado "${match[1]}"?`
    }

    match = source.match(/^Sticker (\d+)$/)

    if (match) {
      return `Sticker ${match[1]}`
    }

    match = source.match(/^Furina theme v(.+) • (\d+) validated setting(?:s)?$/)

    if (match) {
      const count = Number(match[2])

      return `Tema Furina v${match[1]} • ${count} ${
        count === 1 ? 'ajuste validado' : 'ajustes validados'
      }`
    }

    match = source.match(/^Previewing on (.+)\. Nothing has been saved yet\.$/)

    if (match) {
      return `Previsualizando en ${t(match[1])}. Todavía no se ha guardado nada.`
    }

    match = source.match(/^Delete this (.+) note\?$/)

    if (match) {
      return `¿Eliminar esta nota ${t(match[1])}?`
    }

    match = source.match(
      /^- Narration and actions are written inside (.+)opening and closing wrappers(.+)\. Use "(.+)" before narration\/actions and "(.+)" after them\.$/
    )

    if (match) {
      return `- La narración y las acciones se escriben entre los envoltorios ${match[1]}de apertura y cierre${match[2]}. Usa "${match[3]}" antes de la narración/acciones y "${match[4]}" después.`
    }

    match = source.match(
      /^- Dialogue is always wrapped with "(.+)" before the spoken text and "(.+)" after it\.$/
    )

    if (match) {
      return `- El diálogo siempre se envuelve con "${match[1]}" antes del texto hablado y "${match[2]}" después.`
    }

    return source
  }

  function t(value) {
    if (value === null || value === undefined) {
      return ''
    }

    const raw = String(value)

    if (!raw) {
      return raw
    }

    const source = canonicalEnglish(raw)

    if (locale === 'en') {
      return source
    }

    const translated = pack().messages?.[source]

    if (typeof translated === 'string') {
      return translated
    }

    const localeDynamic = pack().dynamic

    if (typeof localeDynamic === 'function') {
      const dynamicValue = localeDynamic(source, t)

      if (typeof dynamicValue === 'string' && dynamicValue !== source) {
        return dynamicValue
      }
    }

    return translateDynamic(source)
  }

  function translateTemplate(value) {
    if (locale === 'en' || typeof value !== 'string') {
      return value
    }

    /*
            Built-in Director templates are generated line by line.
            Translating each line lets wrapper symbols and blank lines stay
            exactly as the template builder intended.
        */
    return value
      .split('\n')
      .map(line => t(line))
      .join('\n')
  }

  function isUserContentNode(node) {
    const element =
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement

    if (!(element instanceof Element)) {
      return false
    }

    return Boolean(
      element.closest(
        [
          '.furina-custom-preset-name',
          '.furina-library-sticker-name',
          '.furina-sticker-card-name',
          '.furina-director-note-text',
          '.furina-ambience-player-title',
          '.furina-pack-name',
          '.furina-layout-name',
          "[data-furina-no-i18n='true']",
          'style',
          'script',
          'pre',
          'code'
        ].join(',')
      )
    )
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || isUserContentNode(element)) {
      return
    }

    for (const name of ['placeholder', 'title', 'aria-label']) {
      if (!element.hasAttribute(name)) {
        continue
      }

      const current = element.getAttribute(name)

      const next = t(current)

      if (next !== current) {
        element.setAttribute(name, next)
      }
    }
  }

  function translateTextNode(node) {
    if (!(node instanceof Text) || isUserContentNode(node)) {
      return
    }

    const original = node.nodeValue

    if (!original || !original.trim()) {
      return
    }

    const leading = original.match(/^\s*/)?.[0] || ''

    const trailing = original.match(/\s*$/)?.[0] || ''

    const core = original.trim()

    const next = t(core)

    if (next !== core) {
      node.nodeValue = `${leading}${next}${trailing}`
    }
  }

  function translateTree(root) {
    if (!root || translating) {
      return
    }

    translating = true

    try {
      if (root instanceof Element) {
        translateAttributes(root)
      }

      if (root instanceof Text) {
        translateTextNode(root)

        return
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
      )

      let node = walker.currentNode

      while (node) {
        if (node instanceof Element) {
          translateAttributes(node)
        } else if (node instanceof Text) {
          translateTextNode(node)
        }

        node = walker.nextNode()
      }
    } finally {
      translating = false
    }
  }

  function observeRoot(root) {
    if (!(root instanceof Element)) {
      return
    }

    translateTree(root)

    if (rootObservers.has(root)) {
      return
    }

    const localObserver = new MutationObserver(records => {
      if (translating) {
        return
      }

      for (const record of records) {
        if (record.type === 'attributes') {
          translateAttributes(record.target)

          continue
        }

        if (record.type === 'characterData') {
          translateTextNode(record.target)

          continue
        }

        for (const node of record.addedNodes) {
          translateTree(node)
        }
      }
    })

    localObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    })

    rootObservers.set(root, localObserver)
  }

  function observeExistingRoots() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(observeRoot)
  }

  function startObserver() {
    if (discoveryObserver || !document.documentElement) {
      return
    }

    /*
            The discovery observer only watches element insertion. It does not
            watch every character mutation in the Clank transcript. Once a
            Furina UI root appears, a small local observer handles that root.
        */
    discoveryObserver = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) {
            continue
          }

          if (node.matches(ROOT_SELECTOR)) {
            observeRoot(node)
          }

          node.querySelectorAll?.(ROOT_SELECTOR).forEach(observeRoot)
        }
      }
    })

    discoveryObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    observeExistingRoots()
  }

  function emitChange() {
    document.documentElement.dataset.furinaLocale = locale

    document.documentElement.setAttribute(
      'lang',
      locale === 'pt_BR' ? 'pt-BR' : locale
    )

    observeExistingRoots()

    document.dispatchEvent(
      new CustomEvent('furina-language-changed', {
        detail: {
          preference,
          locale
        }
      })
    )
  }

  async function setPreference(next) {
    const supported = findSupportedCode(next)

    const normalized = next === 'auto' ? 'auto' : supported || 'auto'

    preference = normalized

    const nextLocale = resolveLocale(preference)

    try {
      if (Atelier.Storage?.set) {
        await Atelier.Storage.set(STORAGE_KEY, preference)
      } else {
        await chrome.storage.local.set({
          [STORAGE_KEY]: preference
        })
      }
    } catch (_) {
      // Language still changes for the current session.
    }

    locale = nextLocale

    emitChange()

    return locale
  }

  async function init() {
    locale = resolveLocale(preference)

    try {
      let stored = null

      if (Atelier.Storage?.get) {
        stored = await Atelier.Storage.get(STORAGE_KEY, null)
      } else {
        stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
      }

      if (stored === 'auto') {
        preference = 'auto'
      } else {
        const storedLocale = findSupportedCode(stored)

        if (storedLocale) {
          preference = storedLocale
        }
      }
    } catch (_) {
      // Keep automatic locale selection.
    }

    locale = resolveLocale(preference)

    document.documentElement.dataset.furinaLocale = locale

    document.documentElement.setAttribute(
      'lang',
      locale === 'pt_BR' ? 'pt-BR' : locale
    )

    startObserver()

    return locale
  }

  function alertTranslated(message) {
    window.alert(t(message))
  }

  function confirmTranslated(message) {
    return window.confirm(t(message))
  }

  function promptTranslated(message, defaultValue = '') {
    return window.prompt(t(message), defaultValue)
  }

  Atelier.I18n = {
    init,
    t,
    translateTree,
    translateTemplate,
    observeRoot,
    setPreference,
    getPreference: () => preference,
    getLocale: () => locale,
    getBrowserLanguage: browserLanguage,
    getSupportedLocales: () =>
      Object.values(Atelier.LocalePacks || {})
        .map(item => ({
          code: item.code,
          label: item.label,
          nativeLabel: item.nativeLabel || item.label
        }))
        .sort((a, b) =>
          a.code === 'en'
            ? -1
            : b.code === 'en'
              ? 1
              : a.nativeLabel.localeCompare(b.nativeLabel)
        ),
    alert: alertTranslated,
    confirm: confirmTranslated,
    prompt: promptTranslated
  }
})()
