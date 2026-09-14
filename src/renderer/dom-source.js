'use strict'


/*
  Developer notes

  Reconstructs stable source text from Clank's rendered message DOM when raw
  message text is not directly available. The output feeds Furina's renderer and
  Director-marker stripping, so DOM fallbacks should remain conservative and
  should not absorb action buttons, HUD ornaments or other Furina UI.
*/
/*
    Native DOM → Markdown Source

    Clank already renders message HTML. Furina converts that native DOM back into a stable Markdown-like source before applying its own renderer, while ignoring Furina-generated DOM and hiding only Furina-owned Director markers.
*/

window.ClankAtelier = window.ClankAtelier || {}

// DOM TABLE → MARKDOWN

window.ClankAtelier.domTableToMarkdown = function (table) {
  if (
    !(table instanceof HTMLElement) ||
    table.tagName.toLowerCase() !== 'table'
  ) {
    return ''
  }

  function cleanCell(cell) {
    return window.ClankAtelier.domToMarkdown(cell)
      .replace(/\n+/g, ' ')
      .trim()
      .replace(/\|/g, '\\|')
  }

  const rows = Array.from(
    table.querySelectorAll(
      ':scope > thead > tr, :scope > tbody > tr, :scope > tr'
    )
  )

  if (rows.length === 0) {
    return ''
  }

  const firstRowCells = Array.from(rows[0].children).filter(cell => {
    const tag = cell.tagName.toLowerCase()

    return tag === 'th' || tag === 'td'
  })

  if (firstRowCells.length === 0) {
    return ''
  }

  const columnCount = firstRowCells.length

  const header = firstRowCells.map(cleanCell)

  const divider = firstRowCells.map(cell => {
    const alignment = (
      cell.style.textAlign ||
      getComputedStyle(cell).textAlign ||
      ''
    ).toLowerCase()

    if (alignment === 'center') {
      return ':---:'
    }

    if (alignment === 'right') {
      return '---:'
    }

    if (alignment === 'left') {
      return ':---'
    }

    return '---'
  })

  const lines = [
    '| ' + header.join(' | ') + ' |',

    '| ' + divider.join(' | ') + ' |'
  ]

  rows.slice(1).forEach(row => {
    const cells = Array.from(row.children)
      .filter(cell => {
        const tag = cell.tagName.toLowerCase()

        return tag === 'th' || tag === 'td'
      })
      .map(cleanCell)

    while (cells.length < columnCount) {
      cells.push('')
    }

    lines.push('| ' + cells.slice(0, columnCount).join(' | ') + ' |')
  })

  return lines.join('\n')
}

// DOM LIST → MARKDOWN

window.ClankAtelier.domListToMarkdown = function (list, depth = 0) {
  if (!(list instanceof HTMLElement)) {
    return ''
  }

  const ordered = list.tagName.toLowerCase() === 'ol'

  const start = ordered ? Number(list.getAttribute('start') || 1) : 1

  const lines = []

  const indent = '  '.repeat(depth)

  const items = Array.from(list.children).filter(
    child => child.tagName?.toLowerCase() === 'li'
  )

  items.forEach((item, index) => {
    const marker = ordered ? `${start + index}.` : '-'

    /*
                    Read the current LI's inline content separately
                    from any nested UL/OL elements.
                */

    let inlineText = ''

    const nestedLists = []

    Array.from(item.childNodes).forEach(child => {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child.tagName.toLowerCase() === 'ul' ||
          child.tagName.toLowerCase() === 'ol')
      ) {
        nestedLists.push(child)

        return
      }

      inlineText += window.ClankAtelier.domToMarkdown(child)
    })

    inlineText = inlineText.replace(/\n+/g, ' ').trim()

    lines.push(`${indent}${marker} ${inlineText}`)

    nestedLists.forEach(nestedList => {
      const nested = window.ClankAtelier.domListToMarkdown(
        nestedList,
        depth + 1
      )

      if (nested) {
        lines.push(nested)
      }
    })
  })

  return lines.join('\n')
}

// CONVERT CLANK'S RENDERED DOM BACK INTO MARKDOWN-LIKE SOURCE

window.ClankAtelier.domToMarkdown = function (node) {
  if (!node) {
    return ''
  }

  // TEXT

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node

  // Never read our own renderer.
  if (element.classList?.contains('clank-atelier-rendered')) {
    return ''
  }

  const children = () =>
    Array.from(element.childNodes)
      .map(child => window.ClankAtelier.domToMarkdown(child))
      .join('')

  const tag = element.tagName.toLowerCase()

  // INLINE

  if (tag === 'strong' || tag === 'b') {
    return '**' + children() + '**'
  }

  if (tag === 'em' || tag === 'i') {
    return '*' + children() + '*'
  }

  if (tag === 'del' || tag === 's') {
    return '~~' + children() + '~~'
  }

  if (
    tag === 'code' &&
    element.parentElement?.tagName.toLowerCase() !== 'pre'
  ) {
    return '`' + children() + '`'
  }

  // HEADINGS

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1])

    return '#'.repeat(level) + ' ' + children().trim() + '\n\n'
  }

  // PARAGRAPH

  if (tag === 'p') {
    return children().trim() + '\n\n'
  }

  // LINE BREAK

  if (tag === 'br') {
    return '\n'
  }

  // BLOCKQUOTE

  if (tag === 'blockquote') {
    const value = children()
      .trim()
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n')

    return value + '\n\n'
  }

  // HORIZONTAL RULE

  if (tag === 'hr') {
    return '---\n\n'
  }

  // TABLE

  if (tag === 'table') {
    const markdown = window.ClankAtelier.domTableToMarkdown(element)

    return markdown ? markdown + '\n\n' : ''
  }

  if (
    tag === 'thead' ||
    tag === 'tbody' ||
    tag === 'tfoot' ||
    tag === 'tr' ||
    tag === 'th' ||
    tag === 'td'
  ) {
    return children()
  }

  // IMAGE

  if (tag === 'img') {
    const src = element.getAttribute('src') || ''

    const alt = element.getAttribute('alt') || ''

    if (src && window.ClankAtelier.isSafeHttpUrl(src)) {
      return '![' + alt + '](' + src + ')'
    }

    return ''
  }

  // UNORDERED LIST

  if (tag === 'ul') {
    return window.ClankAtelier.domListToMarkdown(element, 0) + '\n\n'
  }

  // ORDERED LIST

  if (tag === 'ol') {
    return window.ClankAtelier.domListToMarkdown(element, 0) + '\n\n'
  }

  if (tag === 'li') {
    return children()
  }

  // CODE BLOCK

  if (tag === 'pre') {
    const code = element.textContent || ''

    return '```\n' + code.trimEnd() + '\n```\n\n'
  }

  // LINK

  if (tag === 'a') {
    const label = children().trim()

    const href = element.getAttribute('href') || ''

    if (href) {
      return '[' + label + '](' + href + ')'
    }

    return label
  }

  // DEFAULT

  return children()
}

// HIDE FURINA DIRECTOR BLOCKS FROM LOCAL DISPLAY

window.ClankAtelier.stripDirectorBlocks = function (source) {
  let result = String(source || '')

  /*
            IMPORTANT:

            We only remove blocks that contain Furina's unique
            internal markers.

            Normal user-written things such as:

                (ooc: hello!)
                ooc: can we pause?

            are NOT touched.
        */

  // PERSISTENT DIRECTOR NOTES

  result = result.replace(
    /\(\s*ooc:\s*furina-director:\s*\n?\s*\[FURINA_DIRECTOR_NOTES\][\s\S]*?\[\/FURINA_DIRECTOR_NOTES\]\s*\)\s*/gi,
    ''
  )

  /*
            Compatibility with the earlier non-parenthesized test
            format, so old test messages also render cleanly.
        */

  result = result.replace(
    /ooc:\s*furina-director:\s*\n?\s*\[FURINA_DIRECTOR_NOTES\][\s\S]*?\[\/FURINA_DIRECTOR_NOTES\]\s*/gi,
    ''
  )

  // FUTURE NEXT-REPLY BLOCK

  /*
            This is included now so the renderer is already ready
            for the one-shot Director feature later.
        */

  result = result.replace(
    /\(\s*ooc:\s*furina-next:\s*\n?\s*\[FURINA_NEXT_REPLY\][\s\S]*?\[\/FURINA_NEXT_REPLY\]\s*\)\s*/gi,
    ''
  )

  result = result.replace(
    /ooc:\s*furina-next:\s*\n?\s*\[FURINA_NEXT_REPLY\][\s\S]*?\[\/FURINA_NEXT_REPLY\]\s*/gi,
    ''
  )

  return result
    .replace(/^\s*\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// READ CURRENT NATIVE MESSAGE SOURCE

window.ClankAtelier.getMessageSource = function (message) {
  const body = message.querySelector('.clank-atelier-message-body')

  if (!body) {
    return ''
  }

  let result = ''

  for (const child of body.childNodes) {
    /*
                Never consume Furina's own generated DOM.
            */

    if (
      child.nodeType === Node.ELEMENT_NODE &&
      child.classList?.contains('clank-atelier-rendered')
    ) {
      continue
    }

    result += window.ClankAtelier.domToMarkdown(child)
  }

  return result.replace(/\n{3,}/g, '\n\n').trim()
}
