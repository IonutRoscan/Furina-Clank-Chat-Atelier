'use strict'


/*
  Developer notes

  Builds troubleshooting reports from the live Clank page. Diagnostics should
  observe and describe state, never mutate chat data or send messages. Keep
  output useful for bug reports while avoiding private message contents unless
  the user explicitly asks to copy them.
*/
/*
    DOM Diagnostics

    These helpers are intentionally dormant until the user chooses
    “Copy DOM report” in Furina. They describe the current Clank DOM so a
    future site-layout change can be diagnosed without collecting telemetry.
*/

window.ClankAtelier = window.ClankAtelier || {}

// ELEMENT DESCRIPTION

window.ClankAtelier.describeElement = function (element) {
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()

  const styles = getComputedStyle(element)

  const text = (element.innerText || element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)

  return {
    tag: element.tagName.toLowerCase(),

    id: element.id || '',

    classes: typeof element.className === 'string' ? element.className : '',

    role: element.getAttribute('role') || '',

    type: element.getAttribute('type') || '',

    placeholder: element.getAttribute('placeholder') || '',

    ariaLabel: element.getAttribute('aria-label') || '',

    contentEditable: element.getAttribute('contenteditable') || '',

    text,

    width: Math.round(rect.width),

    height: Math.round(rect.height),

    display: styles.display,

    position: styles.position,

    overflowY: styles.overflowY
  }
}

// SHORT DOM PATH

window.ClankAtelier.getElementPath = function (element) {
  if (!element) {
    return ''
  }

  const parts = []

  let current = element

  let depth = 0

  while (current && current !== document.body && depth < 7) {
    let part = current.tagName.toLowerCase()

    if (current.id) {
      part += `#${current.id}`

      parts.unshift(part)

      break
    }

    if (typeof current.className === 'string' && current.className.trim()) {
      const classes = current.className.trim().split(/\s+/).slice(0, 5)

      if (classes.length > 0) {
        part += '.' + classes.join('.')
      }
    }

    parts.unshift(part)

    current = current.parentElement

    depth++
  }

  return parts.join(' > ')
}

// BASIC ITEM CREATOR

window.ClankAtelier.createReportItem = function (element) {
  return {
    path: window.ClankAtelier.getElementPath(element),

    info: window.ClankAtelier.describeElement(element)
  }
}

// CHAT STRUCTURE SCAN

window.ClankAtelier.scanChatStructure = function () {
  const result = {
    found: false,

    container: null,

    directChildren: [],

    textBlocks: [],

    buttons: [],

    images: []
  }

  const chat = document.querySelector('#chat-scroll-container')

  if (!chat) {
    return result
  }

  result.found = true

  result.container = window.ClankAtelier.createReportItem(chat)

  // DIRECT CHILDREN

  Array.from(chat.children).forEach((child, index) => {
    result.directChildren.push({
      index,

      ...window.ClankAtelier.createReportItem(child),

      childCount: child.children.length
    })
  })

  // TEXT-BEARING DESCENDANTS

  const descendants = chat.querySelectorAll(
    ['p', 'span', 'div', 'blockquote'].join(',')
  )

  for (const element of descendants) {
    const ownText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (ownText.length < 2) {
      continue
    }

    result.textBlocks.push({
      ownText: ownText.slice(0, 250),

      ...window.ClankAtelier.createReportItem(element)
    })

    if (result.textBlocks.length >= 60) {
      break
    }
  }

  // CHAT BUTTONS

  const buttons = chat.querySelectorAll('button, [role="button"]')

  for (const button of buttons) {
    result.buttons.push(window.ClankAtelier.createReportItem(button))

    if (result.buttons.length >= 50) {
      break
    }
  }

  // CHAT IMAGES

  const images = chat.querySelectorAll('img')

  for (const image of images) {
    result.images.push({
      src: image.currentSrc || image.src || '',

      alt: image.alt || '',

      ...window.ClankAtelier.createReportItem(image)
    })

    if (result.images.length >= 30) {
      break
    }
  }

  return result
}

// MAIN PAGE SCAN

window.ClankAtelier.scanPage = function () {
  const report = {
    url: location.href,

    viewport: {
      width: window.innerWidth,

      height: window.innerHeight
    },

    chat: window.ClankAtelier.scanChatStructure(),

    editableCandidates: [],

    pageButtons: []
  }

  // EDITABLE ELEMENTS

  const editableElements = document.querySelectorAll(
    ['textarea', 'input', '[contenteditable="true"]', '[role="textbox"]'].join(
      ','
    )
  )

  for (const element of editableElements) {
    report.editableCandidates.push(
      window.ClankAtelier.createReportItem(element)
    )
  }

  // PAGE BUTTONS

  const buttons = document.querySelectorAll('button, [role="button"]')

  for (const button of buttons) {
    const rect = button.getBoundingClientRect()

    if (rect.width <= 0 || rect.height <= 0) {
      continue
    }

    report.pageButtons.push(window.ClankAtelier.createReportItem(button))

    if (report.pageButtons.length >= 80) {
      break
    }
  }

  return report
}

// FORMAT REPORT

window.ClankAtelier.formatReport = function (report) {
  const lines = []

  function separator() {
    lines.push('============================================================')
  }

  function section(title) {
    lines.push('')

    separator()

    lines.push(title)

    separator()
  }

  function item(label, data) {
    lines.push('')

    lines.push(`[${label}]`)

    lines.push(JSON.stringify(data, null, 2))
  }

  lines.push('FURINA: CLANK CHAT ATELIER')

  lines.push('DOM RECONNAISSANCE REPORT')

  lines.push('')

  lines.push(`URL: ${report.url}`)

  lines.push(`Viewport: ${report.viewport.width} x ${report.viewport.height}`)

  // CHAT

  section('CHAT')

  lines.push(`Found: ${report.chat.found}`)

  if (report.chat.container) {
    item('CHAT CONTAINER', report.chat.container)
  }

  // DIRECT CHAT CHILDREN

  section(`CHAT DIRECT CHILDREN (${report.chat.directChildren.length})`)

  report.chat.directChildren.forEach((child, index) => {
    item(`CHAT CHILD ${index + 1}`, child)
  })

  // TEXT BLOCKS

  section(`CHAT TEXT BLOCKS (${report.chat.textBlocks.length})`)

  report.chat.textBlocks.forEach((block, index) => {
    item(`TEXT ${index + 1}`, block)
  })

  // CHAT BUTTONS

  section(`CHAT BUTTONS (${report.chat.buttons.length})`)

  report.chat.buttons.forEach((button, index) => {
    item(`CHAT BUTTON ${index + 1}`, button)
  })

  // IMAGES

  section(`CHAT IMAGES (${report.chat.images.length})`)

  report.chat.images.forEach((image, index) => {
    item(`IMAGE ${index + 1}`, image)
  })

  // EDITABLE

  section(`EDITABLE ELEMENTS (${report.editableCandidates.length})`)

  report.editableCandidates.forEach((editable, index) => {
    item(`EDITABLE ${index + 1}`, editable)
  })

  // PAGE BUTTONS

  section(`VISIBLE PAGE BUTTONS (${report.pageButtons.length})`)

  report.pageButtons.forEach((button, index) => {
    item(`BUTTON ${index + 1}`, button)
  })

  return lines.join('\n')
}
