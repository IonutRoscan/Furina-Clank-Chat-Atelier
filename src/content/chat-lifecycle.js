'use strict'

/*
  Developer notes

  This is Furina's SPA lifecycle coordinator. It discovers the active chat,
  classifies message nodes, schedules rendering, watches route/DOM changes and
  tells conversation-scoped managers when the chat ID changes. Features should
  usually expose small manager APIs and let this module orchestrate them rather
  than creating competing page-wide observers.

  MutationObserver callbacks can run many times while Clank streams one reply.
  New logic added here must therefore be idempotent and cheap on repeated runs.
*/
;(() => {
  if (window.top !== window) {
    return
  }

  // NAMESPACE

  const Atelier = window.ClankAtelier

  if (!Atelier || !Atelier.SELECTORS) {
    console.error('[Clank Atelier] Core modules missing.')

    return
  }

  const SELECTORS = Atelier.SELECTORS

  /*
        Chat Lifecycle

        Clank is a single-page app. Opening another conversation usually does
        not reload this content script, so this module watches the current chat
        DOM, tags message parts for the renderer/theme CSS, and asks each
        feature manager to switch to the new conversation when the route changes.
    */

  // CHAT LIFECYCLE STATE

  let chatObserver = null

  let currentChat = null
  let chatActive = false

  // RENDER SCHEDULER

  const renderTimers = new WeakMap()

  function scheduleRender(message, delay = 70) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    const previous = renderTimers.get(message)

    if (previous) {
      clearTimeout(previous)
    }

    const timer = setTimeout(() => {
      renderTimers.delete(message)

      if (!message.isConnected) {
        return
      }

      tagMessageBody(message)

      tagAvatar(message)

      tagMessageActions(message)

      ensureBookmarkButton(message)

      ensureChapterButton(message)

      if (typeof Atelier.renderMessage === 'function') {
        Atelier.renderMessage(message)
      }

      Atelier.CosmeticsManager?.decorateMessage?.(message, false)
    }, delay)

    renderTimers.set(message, timer)
  }

  // MESSAGE CLASSIFICATION

  function classifyMessage(element) {
    if (!(element instanceof HTMLElement)) {
      return
    }

    if (element.matches(SELECTORS.assistantMessage)) {
      element.classList.add(
        'clank-atelier-message',
        'clank-atelier-message-assistant'
      )

      return 'assistant'
    }

    if (element.matches(SELECTORS.userMessage)) {
      element.classList.add(
        'clank-atelier-message',
        'clank-atelier-message-user'
      )

      return 'user'
    }

    /*
            Resilience fallback for small Clank Tailwind changes.
            Keep it deliberately narrow: only direct chat children
            with a message-like body and row direction qualify.
        */

    const isDirectChatChild =
      currentChat && element.parentElement === currentChat

    const hasMessageBody = Boolean(
      element.querySelector(SELECTORS.messageBody) ||
      element.querySelector('div.break-words')
    )

    if (isDirectChatChild && hasMessageBody) {
      if (element.classList.contains('flex-row-reverse')) {
        element.classList.add(
          'clank-atelier-message',
          'clank-atelier-message-user'
        )

        return 'user'
      }

      if (element.classList.contains('flex-row')) {
        element.classList.add(
          'clank-atelier-message',
          'clank-atelier-message-assistant'
        )

        return 'assistant'
      }
    }

    return null
  }

  // MESSAGE BODY

  function tagMessageBody(message) {
    const body =
      message.querySelector(SELECTORS.messageBody) ||
      message.querySelector('div.break-words')

    if (!body) {
      return
    }

    body.classList.add('clank-atelier-message-body')

    // NATIVE USER BUBBLE

    if (message.classList.contains('clank-atelier-message-user')) {
      const nativeBubble = body.parentElement

      if (nativeBubble) {
        nativeBubble.classList.add('clank-atelier-user-bubble')
      }
    }

    let paragraphs = body.querySelectorAll(SELECTORS.messageParagraph)

    if (paragraphs.length === 0) {
      paragraphs = body.querySelectorAll('p')
    }

    paragraphs.forEach(paragraph => {
      paragraph.classList.add('clank-atelier-paragraph')
    })
  }

  // AVATAR

  function tagAvatar(message) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    /*
            Find images belonging to the message row,
            but never images inside the actual message
            content / Furina renderer.
        */

    const images = message.querySelectorAll('img')

    for (const image of images) {
      if (image.closest('.clank-atelier-message-body')) {
        continue
      }

      if (image.closest('.clank-atelier-rendered')) {
        continue
      }

      image.classList.add('clank-atelier-avatar')

      /*
                A message only has one actual avatar,
                so once we've found it we're done.
            */

      break
    }
  }

  // Message actions

  function tagMessageActions(message) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    const actionButton = message.querySelector(
      [
        'button[aria-label="Edit message"]',
        'button[aria-label="Continue"]',
        'button[aria-label="Continue as new message"]',
        'button[aria-label="Continue as new message with direction"]',
        'button[aria-label="Report bad response"]',
        'button[aria-label="Like"]',
        'button[aria-label="Previous"]',
        'button[aria-label="Next"]'
      ].join(',')
    )

    if (!actionButton) {
      return
    }

    /*
            Clank places the message controls inside one shared wrapper.
            Walk upward from a known action until we reach the smallest
            container that owns multiple message buttons.
        */

    let actions = actionButton.parentElement

    while (actions && actions !== message) {
      if (actions.querySelectorAll('button').length >= 2) {
        actions.classList.add('clank-atelier-message-actions')

        return
      }

      actions = actions.parentElement
    }
  }

  // BOOKMARK PROTOTYPE

  const BOOKMARK_STORAGE_KEY = 'furina-message-bookmarks'

  const CHAPTER_STORAGE_KEY = 'furina-scene-chapters'

  function getBookmarkConversationId() {
    return Atelier.getConversationId?.() || null
  }

  function normalizeBookmarkText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function hashBookmarkText(text) {
    let hash = 2166136261

    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index)

      hash = Math.imul(hash, 16777619)
    }

    return (hash >>> 0).toString(36)
  }

  function getBookmarkMessageRole(message) {
    if (message.classList.contains('clank-atelier-message-user')) {
      return 'user'
    }

    return 'assistant'
  }

  function createBookmarkMessageKey(message) {
    const role = getBookmarkMessageRole(message)

    const text = normalizeBookmarkText(getBookmarkMessageText(message))

    if (!text) {
      return null
    }

    return role + ':' + hashBookmarkText(text)
  }

  async function getConversationBookmarks() {
    const conversationId = getBookmarkConversationId()

    if (!conversationId) {
      return []
    }

    const allBookmarks = await Atelier.Storage.getObject(
      BOOKMARK_STORAGE_KEY,
      {}
    )

    const bookmarks = allBookmarks[conversationId]

    return Array.isArray(bookmarks) ? bookmarks : []
  }

  async function saveConversationBookmarks(bookmarks) {
    const conversationId = getBookmarkConversationId()

    if (!conversationId) {
      return false
    }

    return await Atelier.Storage.updateObject(BOOKMARK_STORAGE_KEY, current => {
      current[conversationId] = bookmarks

      return current
    })
  }

  async function getConversationChapters() {
    const conversationId = getBookmarkConversationId()

    if (!conversationId) {
      return []
    }

    const allChapters = await Atelier.Storage.getObject(CHAPTER_STORAGE_KEY, {})

    const chapters = allChapters[conversationId]

    return Array.isArray(chapters) ? chapters : []
  }

  async function saveConversationChapters(chapters) {
    const conversationId = getBookmarkConversationId()

    if (!conversationId) {
      return false
    }

    return await Atelier.Storage.updateObject(CHAPTER_STORAGE_KEY, current => {
      current[conversationId] = chapters

      return current
    })
  }

  function getBookmarkMessageText(message) {
    if (!(message instanceof HTMLElement)) {
      return ''
    }

    const rendered = message.querySelector('.clank-atelier-rendered')

    if (rendered && rendered.textContent) {
      return rendered.textContent.trim()
    }

    const body = message.querySelector('.clank-atelier-message-body')

    if (body && body.textContent) {
      return body.textContent.trim()
    }

    return ''
  }

  function setBookmarkButtonState(button, bookmarked) {
    button.dataset.furinaBookmarked = bookmarked ? 'true' : 'false'

    button.textContent = bookmarked ? '★' : '☆'

    button.title = bookmarked ? 'Remove bookmark' : 'Bookmark this message'

    button.setAttribute('aria-label', button.title)
  }

  async function syncBookmarkButtonState(message, button) {
    const currentText = normalizeBookmarkText(getBookmarkMessageText(message))

    if (!currentText) {
      delete message.dataset.furinaMessageKey

      setBookmarkButtonState(button, false)

      return
    }

    const currentRole = getBookmarkMessageRole(message)

    const currentKey = createBookmarkMessageKey(message)

    if (currentKey) {
      message.dataset.furinaMessageKey = currentKey
    }

    const bookmarks = await getConversationBookmarks()

    if (
      !button.isConnected ||
      button.closest('.clank-atelier-message') !== message
    ) {
      return
    }

    /*
            First try the normal deterministic key.

            If Clank changed the exact rendered structure/text during
            reload, fall back to matching the stored normalized message
            text and role directly.
        */
    const matchingBookmark = bookmarks.find(bookmark => {
      if (bookmark.key === currentKey) {
        return true
      }

      return (
        bookmark.role === currentRole &&
        normalizeBookmarkText(bookmark.text) === currentText
      )
    })

    if (matchingBookmark) {
      /*
                If the text matched but the old key did not, update the
                saved bookmark to the current stable key.

                This lets Furina repair older bookmark identifiers
                automatically after Clank rerenders a message.
            */
      if (currentKey && matchingBookmark.key !== currentKey) {
        matchingBookmark.key = currentKey

        await saveConversationBookmarks(bookmarks)
      }

      setBookmarkButtonState(button, true)

      return
    }

    setBookmarkButtonState(button, false)
  }

  // CHAPTERS

  function findMessageForChapter(chapter) {
    if (!chapter) {
      return null
    }

    const messages = Array.from(
      document.querySelectorAll('.clank-atelier-message')
    )

    return (
      messages.find(
        message => createBookmarkMessageKey(message) === chapter.key
      ) ||
      messages.find(message => {
        const role = getBookmarkMessageRole(message)

        const text = normalizeBookmarkText(getBookmarkMessageText(message))

        return (
          role === chapter.role && text === normalizeBookmarkText(chapter.text)
        )
      }) ||
      null
    )
  }

  function removeChapterDividers() {
    document.querySelectorAll('.furina-chapter-divider').forEach(divider => {
      divider.remove()
    })
  }

  function createChapterDivider(chapter) {
    const divider = document.createElement('div')

    divider.className = 'furina-chapter-divider'

    divider.dataset.furinaChapterId = chapter.id

    const ornament = document.createElement('div')

    ornament.className = 'furina-chapter-ornament'

    ornament.textContent = '✦'

    const title = document.createElement('div')

    title.className = 'furina-chapter-title'

    title.textContent = chapter.title

    divider.append(ornament, title)

    return divider
  }

  async function renderChapterDividers() {
    removeChapterDividers()

    const chapters = await getConversationChapters()

    for (const chapter of chapters) {
      const target = findMessageForChapter(chapter)

      if (!target) {
        continue
      }

      const divider = createChapterDivider(chapter)

      target.before(divider)
    }
  }

  function jumpToChapter(chapter) {
    const divider = document.querySelector(
      `.furina-chapter-divider[data-furina-chapter-id="${CSS.escape(
        chapter.id
      )}"]`
    )

    const target = divider || findMessageForChapter(chapter)

    if (!target) {
      return false
    }

    target.scrollIntoView({
      behavior: 'smooth',

      block: 'center'
    })

    target.classList.remove('furina-chapter-jump-highlight')

    void target.offsetWidth

    target.classList.add('furina-chapter-jump-highlight')

    window.setTimeout(() => {
      target.classList.remove('furina-chapter-jump-highlight')
    }, 1400)

    return true
  }

  // SCENE NAVIGATOR

  function findMessageForBookmark(bookmark) {
    if (!bookmark) {
      return null
    }

    const messages = Array.from(
      document.querySelectorAll('.clank-atelier-message')
    )

    return (
      messages.find(
        message => createBookmarkMessageKey(message) === bookmark.key
      ) ||
      messages.find(message => {
        const role = getBookmarkMessageRole(message)

        const text = normalizeBookmarkText(getBookmarkMessageText(message))

        return (
          role === bookmark.role &&
          text === normalizeBookmarkText(bookmark.text)
        )
      }) ||
      null
    )
  }

  function flashBookmarkTarget(message) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    message.classList.remove('furina-bookmark-jump-highlight')

    /*
            Force a reflow so repeated jumps to the same message
            can restart the animation reliably.
        */
    void message.offsetWidth

    message.classList.add('furina-bookmark-jump-highlight')

    window.setTimeout(() => {
      message.classList.remove('furina-bookmark-jump-highlight')
    }, 1400)
  }

  function jumpToBookmark(bookmark) {
    const target = findMessageForBookmark(bookmark)

    if (!target) {
      return false
    }

    target.scrollIntoView({
      behavior: 'smooth',

      block: 'center'
    })

    window.setTimeout(() => {
      flashBookmarkTarget(target)
    }, 250)

    return true
  }

  function getSceneNavigator() {
    return document.getElementById('furina-scene-navigator')
  }

  async function renderSceneNavigatorChapters() {
    const navigator = getSceneNavigator()

    if (!navigator) {
      return
    }

    const list = navigator.querySelector('.furina-scene-nav-chapter-list')

    if (!list) {
      return
    }

    const chapters = await getConversationChapters()

    list.replaceChildren()

    if (chapters.length === 0) {
      const empty = document.createElement('div')

      empty.className = 'furina-scene-nav-empty'

      empty.textContent = 'No chapters yet.'

      list.appendChild(empty)

      return
    }

    chapters.forEach((chapter, index) => {
      const row = document.createElement('div')

      row.className = 'furina-scene-nav-item furina-scene-nav-chapter-item'

      const jumpButton = document.createElement('button')

      jumpButton.type = 'button'

      jumpButton.className = 'furina-scene-nav-jump'

      const label = document.createElement('span')

      label.className = 'furina-scene-nav-role'

      label.textContent = `CHAPTER ${index + 1}`

      const title = document.createElement('span')

      title.className = 'furina-scene-nav-preview'

      title.textContent = chapter.title

      jumpButton.append(label, title)

      jumpButton.addEventListener('click', () => {
        const found = jumpToChapter(chapter)

        if (found) {
          navigator.dataset.open = 'false'
        }
      })

      const removeButton = document.createElement('button')

      removeButton.type = 'button'

      removeButton.className = 'furina-scene-nav-remove'

      removeButton.textContent = '×'

      removeButton.title = 'Delete chapter'

      removeButton.setAttribute('aria-label', 'Delete chapter')

      removeButton.addEventListener('click', async event => {
        event.stopPropagation()

        const current = await getConversationChapters()

        const next = current.filter(item => item.id !== chapter.id)

        await saveConversationChapters(next)

        await renderChapterDividers()

        await renderSceneNavigatorChapters()
      })

      row.append(jumpButton, removeButton)

      list.appendChild(row)
    })
  }

  async function renderSceneNavigatorBookmarks() {
    const navigator = getSceneNavigator()

    if (!navigator) {
      return
    }

    const count = navigator.querySelector('.furina-scene-nav-count')

    const list = navigator.querySelector('.furina-scene-nav-list')

    if (!count || !list) {
      return
    }

    const bookmarks = await getConversationBookmarks()

    count.textContent = String(bookmarks.length)

    list.replaceChildren()

    if (bookmarks.length === 0) {
      const empty = document.createElement('div')

      empty.className = 'furina-scene-nav-empty'

      empty.textContent = 'No bookmarks yet.'

      list.appendChild(empty)

      return
    }

    bookmarks.forEach(bookmark => {
      const row = document.createElement('div')

      row.className = 'furina-scene-nav-item'

      const jumpButton = document.createElement('button')

      jumpButton.type = 'button'

      jumpButton.className = 'furina-scene-nav-jump'

      const role = document.createElement('span')

      role.className = 'furina-scene-nav-role'

      role.textContent = bookmark.role === 'user' ? 'YOU' : 'CHARACTER'

      const preview = document.createElement('span')

      preview.className = 'furina-scene-nav-preview'

      const cleanText = normalizeBookmarkText(bookmark.text)

      preview.textContent =
        cleanText.length > 110 ? `${cleanText.slice(0, 110)}…` : cleanText

      jumpButton.append(role, preview)

      jumpButton.addEventListener('click', () => {
        const found = jumpToBookmark(bookmark)

        if (!found) {
          preview.textContent =
            'Message is not currently available in the chat.'

          return
        }

        navigator.dataset.open = 'false'
      })

      const removeButton = document.createElement('button')

      removeButton.type = 'button'

      removeButton.className = 'furina-scene-nav-remove'

      removeButton.textContent = '×'

      removeButton.title = 'Remove bookmark'

      removeButton.setAttribute('aria-label', 'Remove bookmark')

      removeButton.addEventListener('click', async event => {
        event.stopPropagation()

        const current = await getConversationBookmarks()

        const next = current.filter(item => item.key !== bookmark.key)

        await saveConversationBookmarks(next)

        const message = findMessageForBookmark(bookmark)

        if (message) {
          const button = message.querySelector(
            '.furina-message-bookmark-button'
          )

          if (button) {
            setBookmarkButtonState(button, false)
          }
        }

        await renderSceneNavigatorBookmarks()
      })

      row.append(jumpButton, removeButton)

      list.appendChild(row)
    })
  }

  function ensureSceneNavigator() {
    let navigator = getSceneNavigator()

    if (navigator) {
      renderSceneNavigatorChapters()

      renderSceneNavigatorBookmarks()

      return navigator
    }

    navigator = document.createElement('div')

    navigator.id = 'furina-scene-navigator'

    navigator.dataset.open = 'false'

    const toggle = document.createElement('button')

    toggle.type = 'button'

    toggle.className = 'furina-scene-nav-toggle'

    toggle.title = 'Scene navigation'

    toggle.setAttribute('aria-label', 'Open Scene Navigation')

    const star = document.createElement('span')

    star.className = 'furina-scene-nav-star'

    star.textContent = '★'

    const count = document.createElement('span')

    count.className = 'furina-scene-nav-count'

    count.textContent = '0'

    toggle.append(star, count)

    const drawer = document.createElement('div')

    drawer.className = 'furina-scene-nav-drawer'

    const header = document.createElement('div')

    header.className = 'furina-scene-nav-header'

    const title = document.createElement('div')

    title.className = 'furina-scene-nav-title'

    title.textContent = 'Scene Navigation'

    const close = document.createElement('button')

    close.type = 'button'

    close.className = 'furina-scene-nav-close'

    close.textContent = '×'

    close.title = 'Close'

    close.setAttribute('aria-label', 'Close Scene Navigation')

    header.append(title, close)

    const chapterSectionTitle = document.createElement('div')

    chapterSectionTitle.className = 'furina-scene-nav-section-title'

    chapterSectionTitle.textContent = 'Chapters'

    const chapterList = document.createElement('div')

    chapterList.className = 'furina-scene-nav-chapter-list'

    const bookmarkSectionTitle = document.createElement('div')

    bookmarkSectionTitle.className = 'furina-scene-nav-section-title'

    bookmarkSectionTitle.textContent = 'Bookmarks'

    const list = document.createElement('div')

    list.className = 'furina-scene-nav-list'

    drawer.append(
      header,
      chapterSectionTitle,
      chapterList,
      bookmarkSectionTitle,
      list
    )

    navigator.append(toggle, drawer)

    toggle.addEventListener('click', () => {
      const nextOpen = navigator.dataset.open !== 'true'

      navigator.dataset.open = nextOpen ? 'true' : 'false'

      if (nextOpen) {
        renderSceneNavigatorChapters()

        renderSceneNavigatorBookmarks()
      }
    })

    close.addEventListener('click', () => {
      navigator.dataset.open = 'false'
    })

    document.body.appendChild(navigator)

    renderSceneNavigatorChapters()

    renderSceneNavigatorBookmarks()

    return navigator
  }

  function ensureChapterButton(message) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    if (message.querySelector(':scope .furina-message-chapter-button')) {
      return
    }

    const actions = message.querySelector('.clank-atelier-message-actions')

    if (!actions) {
      return
    }

    const button = document.createElement('button')

    button.type = 'button'

    button.className = 'furina-message-chapter-button'

    button.textContent = '◆'

    button.title = 'Start chapter here'

    button.setAttribute('aria-label', 'Start chapter here')

    button.addEventListener('click', async event => {
      event.preventDefault()
      event.stopPropagation()

      const key = createBookmarkMessageKey(message)

      const text = normalizeBookmarkText(getBookmarkMessageText(message))

      if (!key || !text) {
        return
      }

      const title = window.prompt('Chapter title:')

      if (title === null) {
        return
      }

      const cleanTitle = title.trim().slice(0, 100)

      if (!cleanTitle) {
        return
      }

      const role = getBookmarkMessageRole(message)

      const chapters = await getConversationChapters()

      const existing = chapters.find(chapter => chapter.key === key)

      if (existing) {
        existing.title = cleanTitle

        existing.text = text

        existing.role = role
      } else {
        chapters.push({
          id:
            'chapter-' +
            Date.now() +
            '-' +
            Math.random().toString(36).slice(2, 8),

          key,

          role,

          text,

          title: cleanTitle,

          createdAt: Date.now()
        })
      }

      await saveConversationChapters(chapters)

      await renderChapterDividers()

      await renderSceneNavigatorChapters()
    })

    actions.appendChild(button)
  }

  function ensureBookmarkButton(message) {
    if (!(message instanceof HTMLElement)) {
      return
    }

    const existingButton = message.querySelector(
      ':scope .furina-message-bookmark-button'
    )

    if (existingButton) {
      /*
                Clank can create the action row before Furina's final
                rendered message text is available.

                Do not simply abandon an existing bookmark button.
                Re-evaluate its message key whenever the message is
                processed again so saved state survives rerenders
                and page reloads reliably.
            */

      void syncBookmarkButtonState(message, existingButton).catch(error => {
        if (!Atelier.Storage?.isContextInvalidated?.(error)) {
          console.warn('[Clank Atelier] Bookmark state sync failed:', error)
        }
      })

      return
    }

    const actions = message.querySelector('.clank-atelier-message-actions')

    if (!actions) {
      return
    }

    const button = document.createElement('button')

    button.type = 'button'

    button.className = 'furina-message-bookmark-button'

    button.addEventListener('click', async event => {
      event.preventDefault()
      event.stopPropagation()

      const conversationId = getBookmarkConversationId()

      if (!conversationId) {
        return
      }

      const key = createBookmarkMessageKey(message)

      const text = normalizeBookmarkText(getBookmarkMessageText(message))

      if (!key || !text) {
        return
      }

      const role = getBookmarkMessageRole(message)

      const bookmarks = await getConversationBookmarks()

      const existingIndex = bookmarks.findIndex(
        bookmark => bookmark.key === key
      )

      if (existingIndex >= 0) {
        bookmarks.splice(existingIndex, 1)

        await saveConversationBookmarks(bookmarks)

        await renderSceneNavigatorBookmarks()

        setBookmarkButtonState(button, false)

        console.log('[Furina] Bookmark removed:', text)

        return
      }

      bookmarks.push({
        key,

        role,

        text,

        createdAt: Date.now()
      })

      await saveConversationBookmarks(bookmarks)

      await renderSceneNavigatorBookmarks()

      message.dataset.furinaMessageKey = key

      setBookmarkButtonState(button, true)

      console.log('[Furina] Bookmark saved:', {
        key,
        role,
        text
      })
    })

    setBookmarkButtonState(button, false)

    actions.appendChild(button)

    void syncBookmarkButtonState(message, button).catch(error => {
      if (!Atelier.Storage?.isContextInvalidated?.(error)) {
        console.warn('[Clank Atelier] Bookmark state sync failed:', error)
      }
    })
  }

  // PROCESS MESSAGE

  function processMessage(element, animateEntrance = false) {
    if (!(element instanceof HTMLElement)) {
      return
    }

    if (element.dataset.clankAtelierProcessed === 'true') {
      return
    }

    const type = classifyMessage(element)

    if (!type) {
      return
    }

    tagMessageBody(element)

    tagAvatar(element)

    tagMessageActions(element)

    ensureBookmarkButton(element)

    ensureChapterButton(element)

    Atelier.MemoryCaptureManager?.attachMessage?.(element)

    scheduleRender(element, 0)

    if (
      Atelier.CosmeticsManager &&
      typeof Atelier.CosmeticsManager.decorateMessage === 'function'
    ) {
      Atelier.CosmeticsManager.decorateMessage(element, animateEntrance)
    }

    element.dataset.clankAtelierProcessed = 'true'
  }

  // PROCESS CHAT

  function processExistingMessages() {
    if (!currentChat) {
      return
    }

    const children = Array.from(currentChat.children)

    for (const child of children) {
      processMessage(child)
    }
  }

  // COMPOSER

  function processComposer() {
    const textarea =
      document.querySelector(SELECTORS.composer) ||
      document.querySelector('.clank-atelier-chat-shell form textarea')

    if (!textarea) {
      return
    }

    textarea.classList.add('clank-atelier-composer')

    const form = textarea.closest('form')

    if (form) {
      form.classList.add('clank-atelier-composer-form')
    }

    /*
            User-directed SFX listens for send attempts before Director can
            intercept Enter. It never changes the draft; it only arms the
            ephemeral cue queue for the message Furina later observes.
        */
    Atelier.UserSfxComposer?.attachComposer(textarea)

    if (Atelier.DirectorManager) {
      Atelier.DirectorManager.attachComposer(textarea)
    }

    if (Atelier.Director2Manager) {
      Atelier.Director2Manager.attachComposer(textarea)
    }

    if (Atelier.MemoryCaptureManager) {
      Atelier.MemoryCaptureManager.attachComposer(textarea)
    }

    Atelier.AtelierComposer?.attachComposer(textarea)
  }

  // CHAT OBSERVER

  function startChatObserver() {
    if (!currentChat) {
      return
    }

    if (chatObserver) {
      chatObserver.disconnect()
    }

    chatObserver = new MutationObserver(mutations => {
      const messagesToUpdate = new Set()

      for (const mutation of mutations) {
        // IGNORE FURINA'S OWN OUTPUT

        let mutationElement = mutation.target

        if (mutationElement.nodeType === Node.TEXT_NODE) {
          mutationElement = mutationElement.parentElement
        }

        if (
          mutationElement instanceof HTMLElement &&
          mutationElement.closest('.clank-atelier-rendered')
        ) {
          continue
        }

        // ADDED NODES

        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) {
            continue
          }

          if (
            node.matches('.clank-atelier-rendered') ||
            node.closest('.clank-atelier-rendered')
          ) {
            continue
          }

          // ENTIRE NEW MESSAGE

          if (
            node.matches(SELECTORS.assistantMessage) ||
            node.matches(SELECTORS.userMessage)
          ) {
            processMessage(node, true)

            continue
          }

          // NESTED NEW MESSAGES

          const nestedMessages = node.querySelectorAll(
            [SELECTORS.assistantMessage, SELECTORS.userMessage].join(',')
          )

          nestedMessages.forEach(message => processMessage(message, true))
        }

        // FIND EXISTING MESSAGE AFFECTED

        let element = mutation.target

        if (element.nodeType === Node.TEXT_NODE) {
          element = element.parentElement
        }

        if (!(element instanceof HTMLElement)) {
          continue
        }

        const message = element.closest('.clank-atelier-message')

        if (message) {
          messagesToUpdate.add(message)
        }
      }

      // SCHEDULE AFFECTED MESSAGES

      for (const message of messagesToUpdate) {
        /*
                            70ms is enough to combine streaming DOM updates
                            without making the visible output feel delayed.
                        */

        scheduleRender(message, 70)
      }
    })

    chatObserver.observe(currentChat, {
      childList: true,

      subtree: true,

      characterData: true
    })
  }

  // ROUTE STATE

  function isChatRoute() {
    return window.location.pathname.startsWith('/chat/')
  }

  function deactivateChat() {
    Atelier.AtelierComposer?.detach()

    if (chatObserver) {
      chatObserver.disconnect()
    }

    chatObserver = null

    currentChat = null

    const sceneNavigator = getSceneNavigator()

    if (sceneNavigator) {
      sceneNavigator.remove()
    }

    removeChapterDividers()

    if (Atelier.StickerManager) {
      Atelier.StickerManager.conversationId = null

      Atelier.StickerManager.stickers = []

      Atelier.StickerManager.setEditing(false)

      if (Atelier.StickerManager.layer) {
        Atelier.StickerManager.layer.remove()

        Atelier.StickerManager.layer = null
      }

      if (Atelier.StickerManager.fixedLayer) {
        Atelier.StickerManager.fixedLayer.remove()

        Atelier.StickerManager.fixedLayer = null
      }
    }

    if (Atelier.AtmosphereManager) {
      Atelier.AtmosphereManager.conversationId = null
      Atelier.AtmosphereManager.settings =
        Atelier.AtmosphereManager.getDefaults()
      Atelier.AtmosphereManager.destroyLayer()
    }

    if (Atelier.AmbienceManager) {
      Atelier.AmbienceManager.loadConversation(null)
    }

    if (Atelier.ReaderManager) {
      Atelier.ReaderManager.focusMode = false

      Atelier.ReaderManager.conversationId = null

      Atelier.ReaderManager.settings = Atelier.ReaderManager.getDefaults()

      Atelier.ReaderManager.apply()
    }

    if (Atelier.DirectorManager) {
      Atelier.DirectorManager.conversationId = null

      Atelier.DirectorManager.settings = Atelier.DirectorManager.getDefaults()
    }

    if (Atelier.ContinuityManager) {
      Atelier.ContinuityManager.conversationId = null
      Atelier.ContinuityManager.settings =
        Atelier.ContinuityManager.getDefaults()
    }

    if (Atelier.MemoryCaptureManager) {
      Atelier.MemoryCaptureManager.conversationId = null
      Atelier.MemoryCaptureManager.settings =
        Atelier.MemoryCaptureManager.getDefaults()
    }

    if (Atelier.Director2Manager) {
      Atelier.Director2Manager.conversationId = null
      Atelier.Director2Manager.settings = Atelier.Director2Manager.getDefaults()
    }

    if (Atelier.SceneIntelligenceManager) {
      Atelier.SceneIntelligenceManager.conversationId = null
      Atelier.SceneIntelligenceManager.currentChapter = null
      Atelier.SceneIntelligenceManager.settings =
        Atelier.SceneIntelligenceManager.getDefaults()
    }

    if (Atelier.AdvancedCssManager) {
      Atelier.AdvancedCssManager.loadConversation(null)
    }

    chatActive = false

    document.documentElement.classList.remove('clank-atelier-enabled')

    if (
      Atelier.ThemeManager &&
      typeof Atelier.ThemeManager.clearVideoBackground === 'function'
    ) {
      Atelier.ThemeManager.clearVideoBackground()
    }

    if (
      Atelier.CosmeticsManager &&
      typeof Atelier.CosmeticsManager.leaveChat === 'function'
    ) {
      Atelier.CosmeticsManager.leaveChat()
    }

    document.querySelectorAll('.clank-atelier-chat-shell').forEach(shell => {
      shell.classList.remove('clank-atelier-chat-shell')
    })

    document
      .querySelectorAll('.clank-atelier-viewport-shell')
      .forEach(element => {
        element.classList.remove('clank-atelier-viewport-shell')
      })

    document.querySelectorAll('.clank-atelier-chat').forEach(chat => {
      chat.classList.remove('clank-atelier-chat')
    })
  }

  // Sidebar

  function tagSidebar() {
    const toggle = document.querySelector(
      [
        'button[aria-label="Collapse sidebar"]',
        'button[aria-label="Expand sidebar"]'
      ].join(',')
    )

    if (!toggle) {
      return
    }

    const header = toggle.closest('header')

    if (!header) {
      return
    }

    /*
            Current Clank structure:

            sidebar shell
                scroll container
                    header
                        collapse / expand button

            Tag the outer sidebar shell rather than depending on its
            Tailwind class string in Reader Mode CSS.
        */

    const sidebar = header.parentElement?.parentElement

    if (sidebar instanceof HTMLElement) {
      sidebar.classList.add('clank-atelier-sidebar')

      /*
                The main conversation area is a sibling of Clank's sidebar.
                Tag it too so Reader Mode can reclaim the space normally
                reserved for the navigation column.
            */

      const layout = sidebar.parentElement

      if (layout) {
        const mainContent = Array.from(layout.children).find(child => {
          return (
            child instanceof HTMLElement &&
            child !== sidebar &&
            child.classList.contains('flex-1')
          )
        })

        if (mainContent instanceof HTMLElement) {
          mainContent.classList.add('clank-atelier-main-content')

          /*
                        Clank wraps the whole application in a centered max-width container
                        with horizontal clipping.

                        Furina's scene background is fixed to the viewport, but because it
                        still lives inside Clank's DOM tree, that ancestor can clip the
                        wallpaper before it reaches the browser edges.

                        Tag the first clipping ancestor so CSS can disable only its horizontal
                        clipping without changing Clank's actual content width.
                    */

          let viewportShell = mainContent.parentElement

          while (viewportShell && viewportShell !== document.body) {
            const style = window.getComputedStyle(viewportShell)

            if (style.overflowX === 'hidden' || style.overflow === 'hidden') {
              viewportShell.classList.add('clank-atelier-viewport-shell')

              break
            }

            viewportShell = viewportShell.parentElement
          }
        }
      }
    }
  }

  // CHAT SHELL

  function ensureChatShell() {
    if (!currentChat) {
      return null
    }

    let shell = currentChat.parentElement

    while (shell && shell !== document.body) {
      if (shell.classList && shell.classList.contains('group/layout')) {
        if (!shell.classList.contains('clank-atelier-chat-shell')) {
          shell.classList.add('clank-atelier-chat-shell')
        }

        if (
          Atelier.ThemeManager &&
          typeof Atelier.ThemeManager.syncVideoBackground === 'function'
        ) {
          Atelier.ThemeManager.syncVideoBackground(shell)
        }

        if (
          Atelier.CosmeticsManager &&
          typeof Atelier.CosmeticsManager.sync === 'function'
        ) {
          Atelier.CosmeticsManager.sync(shell)
        }

        return shell
      }

      shell = shell.parentElement
    }

    return null
  }

  // INITIALIZE CHAT

  function initializeChat() {
    if (!isChatRoute()) {
      if (chatActive || currentChat) {
        deactivateChat()
      }

      return false
    }

    tagSidebar()

    const chat = document.querySelector(SELECTORS.chatScroller)

    if (!chat) {
      return false
    }

    /*
            If we previously left a chat page,
            reactivate Furina when entering one again.
        */

    if (!chatActive) {
      chatActive = true

      if (
        Atelier.ThemeManager &&
        typeof Atelier.ThemeManager.apply === 'function'
      ) {
        Atelier.ThemeManager.apply()
      }
    }

    if (chat === currentChat) {
      /*
                Clank may rebuild the surrounding layout
                when things such as the sidebar are toggled.

                The chat node can remain identical while its
                parent shell is replaced, so always verify
                the Furina shell here too.
            */

      const shell = ensureChatShell()

      if (Atelier.StickerManager) {
        Atelier.StickerManager.syncConversation(shell)
      }

      if (Atelier.ReaderManager) {
        Atelier.ReaderManager.syncConversation()
      }

      if (Atelier.DirectorManager) {
        Atelier.DirectorManager.syncConversation()
      }

      if (Atelier.ContinuityManager) {
        Atelier.ContinuityManager.syncConversation()
      }

      if (Atelier.MemoryCaptureManager) {
        Atelier.MemoryCaptureManager.syncConversation()
      }

      if (Atelier.Director2Manager) {
        Atelier.Director2Manager.syncConversation()
      }

      if (Atelier.SceneIntelligenceManager) {
        Atelier.SceneIntelligenceManager.syncConversation()
      }

      if (Atelier.AtmosphereManager) {
        Atelier.AtmosphereManager.syncConversation(shell)
      }

      if (Atelier.AmbienceManager) {
        Atelier.AmbienceManager.syncConversation()
      }

      if (Atelier.RpSfxManager) {
        Atelier.RpSfxManager.syncConversation()
      }

      if (Atelier.AdvancedCssManager) {
        Atelier.AdvancedCssManager.syncConversation()
      }

      processComposer()

      processExistingMessages()

      return true
    }

    currentChat = chat

    ensureSceneNavigator()

    renderChapterDividers()

    currentChat.classList.add('clank-atelier-chat')

    // CHAT SHELL

    const shell = ensureChatShell()

    if (Atelier.StickerManager) {
      Atelier.StickerManager.syncConversation(shell)
    }

    if (Atelier.ReaderManager) {
      Atelier.ReaderManager.syncConversation()
    }

    if (Atelier.DirectorManager) {
      Atelier.DirectorManager.syncConversation()
    }

    if (Atelier.ContinuityManager) {
      Atelier.ContinuityManager.syncConversation()
    }

    if (Atelier.MemoryCaptureManager) {
      Atelier.MemoryCaptureManager.syncConversation()
    }

    if (Atelier.Director2Manager) {
      Atelier.Director2Manager.syncConversation()
    }

    if (Atelier.SceneIntelligenceManager) {
      Atelier.SceneIntelligenceManager.syncConversation()
    }

    if (Atelier.AtmosphereManager) {
      Atelier.AtmosphereManager.syncConversation(shell)
    }

    if (Atelier.AmbienceManager) {
      Atelier.AmbienceManager.syncConversation()
    }

    if (Atelier.RpSfxManager) {
      Atelier.RpSfxManager.syncConversation()
    }

    if (Atelier.AdvancedCssManager) {
      Atelier.AdvancedCssManager.syncConversation()
    }

    processExistingMessages()

    processComposer()

    startChatObserver()

    return true
  }

  // PAGE / ROUTE OBSERVER

  let lastPath = window.location.pathname

  function syncPageState() {
    const currentPath = window.location.pathname

    if (currentPath !== lastPath) {
      lastPath = currentPath

      console.log('[Clank Atelier] Route changed:', currentPath)

      document.dispatchEvent(
        new CustomEvent('furina-route-changed', {
          detail: {
            path: currentPath
          }
        })
      )
    }

    initializeChat()
  }

  function checkRouteHeartbeat() {
    if (window.location.pathname === lastPath) {
      return
    }

    syncPageState()
  }

  let pageSyncScheduled = false

  function schedulePageSync() {
    if (pageSyncScheduled) {
      return
    }

    pageSyncScheduled = true

    requestAnimationFrame(() => {
      pageSyncScheduled = false

      syncPageState()
    })
  }

  function isFurinaOwnedMutationNode(node) {
    let element = node

    if (element?.nodeType === Node.TEXT_NODE) {
      element = element.parentElement
    }

    if (!(element instanceof HTMLElement)) {
      return false
    }

    return Boolean(
      element.matches?.(
        [
          '[data-furina-owned="true"]',
          '[data-clank-atelier-owned="true"]',
          '#furina-panel',
          '#furina-launcher',
          '.furina-ambience-player',
          '.furina-atmosphere-layer',
          '.furina-sticker-layer',
          '.clank-atelier-lightbox',
          '.clank-atelier-rendered'
        ].join(',')
      ) ||
      element.closest?.(
        [
          '[data-furina-owned="true"]',
          '[data-clank-atelier-owned="true"]',
          '#furina-panel',
          '#furina-launcher',
          '.furina-ambience-player',
          '.furina-atmosphere-layer',
          '.furina-sticker-layer',
          '.clank-atelier-lightbox',
          '.clank-atelier-rendered'
        ].join(',')
      )
    )
  }

  function shouldSyncForMutations(records) {
    return records.some(record => {
      if (isFurinaOwnedMutationNode(record.target)) {
        return false
      }

      const changedNodes = [...record.addedNodes, ...record.removedNodes]

      if (changedNodes.length === 0) {
        return true
      }

      return changedNodes.some(node => !isFurinaOwnedMutationNode(node))
    })
  }

  const pageObserver = new MutationObserver(records => {
    if (shouldSyncForMutations(records)) {
      schedulePageSync()
    }
  })

  pageObserver.observe(document.documentElement, {
    childList: true,

    subtree: true
  })

  // HISTORY NAVIGATION

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') {
      return
    }

    if (!Atelier.ReaderManager || !Atelier.ReaderManager.focusMode) {
      return
    }

    Atelier.ReaderManager.exitFocusMode()
  })

  window.addEventListener('clank-atelier-conversation-changed', () => {
    renderSceneNavigatorChapters()

    renderSceneNavigatorBookmarks()

    renderChapterDividers()
  })

  window.addEventListener('popstate', syncPageState)

  window.setInterval(checkRouteHeartbeat, 250)

  // INITIAL ATTEMPT

  syncPageState()
})()
