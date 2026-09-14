'use strict'


/*
  Developer notes

  Parses the practical Markdown subset Furina renders in Clank messages. This is
  deliberately not a full CommonMark implementation. Prefer predictable output
  for roleplay text over adding rare syntax that makes streaming or sanitizing
  fragile. Never return unsanitized executable HTML from user/model content.
*/
/*
    Markdown Renderer

    Parses the small Markdown subset Furina intentionally supports. The parser escapes source text first, then emits only Furina-controlled HTML for supported formatting.
*/

window.ClankAtelier = window.ClankAtelier || {}

// ESCAPE HTML

window.ClankAtelier.escapeHtml = function (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// SAFE URL CHECK

window.ClankAtelier.isSafeHttpUrl = function (value) {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (error) {
    return false
  }
}

// INLINE MARKDOWN

window.ClankAtelier.renderInlineMarkdown = function (text) {
  let html = window.ClankAtelier.escapeHtml(text)

  // Images are handled before normal links so Markdown image
  // syntax cannot be consumed by the link replacement below.
  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    (match, alt, url) => {
      if (!window.ClankAtelier.isSafeHttpUrl(url)) {
        return match
      }

      /*
                `html` was escaped before Markdown parsing, so these
                captures are already safe for HTML attributes. Escaping
                them a second time breaks URLs containing query-string
                ampersands (for example `?a=1&b=2`).
            */
      const safeUrl = url

      const safeAlt = alt || ''

      return (
        '<span class="clank-atelier-image-wrap">' +
        '<button ' +
        'type="button" ' +
        'class="clank-atelier-image-link" ' +
        'data-clank-atelier-image="' +
        safeUrl +
        '" ' +
        'aria-label="Open image preview">' +
        '<img ' +
        'class="clank-atelier-image" ' +
        'src="' +
        safeUrl +
        '" ' +
        'alt="' +
        safeAlt +
        '" ' +
        'loading="lazy" ' +
        'referrerpolicy="no-referrer">' +
        '</button>' +
        '</span>'
      )
    }
  )

  // INLINE CODE
  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="clank-atelier-inline-code">$1</code>'
  )

  // BOLD
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')

  // STRIKETHROUGH
  html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  // ITALIC
  html = html.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')

  // LINKS
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (match, label, url) => {
      return (
        '<a class="clank-atelier-link" ' +
        'href="' +
        url +
        '" ' +
        'target="_blank" ' +
        'rel="noopener noreferrer">' +
        label +
        '</a>'
      )
    }
  )

  return html
}

// TABLE HELPERS

window.ClankAtelier.isTableDivider = function (line) {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')

  if (cells.length === 0) {
    return false
  }

  return cells.every(cell => {
    return /^:?-{3,}:?$/.test(cell.trim())
  })
}

window.ClankAtelier.parseTableRow = function (line) {
  const source = String(line).trim().replace(/^\|/, '').replace(/\|$/, '')

  const cells = []

  let current = ''

  let escaped = false

  for (const character of source) {
    if (escaped) {
      /*
                    Preserve the escaped character itself, but drop
                    the Markdown escape slash.

                    Example:

                        one \| two

                    becomes one literal pipe inside the same cell.
                */

      current += character

      escaped = false

      continue
    }

    if (character === '\\') {
      escaped = true

      continue
    }

    if (character === '|') {
      cells.push(current.trim())

      current = ''

      continue
    }

    current += character
  }

  if (escaped) {
    /*
                A trailing slash should not silently disappear.
            */

    current += '\\'
  }

  cells.push(current.trim())

  return cells
}

// TABLE

window.ClankAtelier.renderTable = function (
  headerLine,
  dividerLine,
  bodyLines
) {
  const headers = window.ClankAtelier.parseTableRow(headerLine)

  const divider = window.ClankAtelier.parseTableRow(dividerLine)

  const alignments = divider.map(cell => {
    const left = cell.startsWith(':')

    const right = cell.endsWith(':')

    if (left && right) {
      return 'center'
    }

    if (right) {
      return 'right'
    }

    if (left) {
      return 'left'
    }

    return ''
  })

  const rows = bodyLines.map(line => window.ClankAtelier.parseTableRow(line))

  let html =
    '<div class="clank-atelier-table-wrap">' +
    '<table class="clank-atelier-table">' +
    '<thead><tr>'

  headers.forEach((cell, index) => {
    const alignment = alignments[index] || ''

    html +=
      '<th' +
      (alignment ? ` style="text-align:${alignment}"` : '') +
      '>' +
      window.ClankAtelier.renderInlineMarkdown(cell) +
      '</th>'
  })

  html += '</tr></thead><tbody>'

  rows.forEach(row => {
    html += '<tr>'

    headers.forEach((header, index) => {
      const alignment = alignments[index] || ''

      const value = row[index] || ''

      html +=
        '<td' +
        (alignment ? ` style="text-align:${alignment}"` : '') +
        '>' +
        window.ClankAtelier.renderInlineMarkdown(value) +
        '</td>'
    })

    html += '</tr>'
  })

  html += '</tbody></table></div>'

  return html
}

// LIST HELPERS

window.ClankAtelier.parseListMarker = function (line) {
  const match = String(line).match(/^([ \t]*)([-+*]|\d+\.)\s+(.+)$/)

  if (!match) {
    return null
  }

  /*
            Treat tabs as four spaces for nesting purposes.

            We only need a stable relative indentation value;
            the original whitespace does not need to be preserved.
        */

  const indent = match[1].replace(/\t/g, '    ').length

  const marker = match[2]

  const ordered = /^\d+\.$/.test(marker)

  return {
    indent,

    type: ordered ? 'ol' : 'ul',

    start: ordered ? Number(marker.slice(0, -1)) : null,

    text: match[3]
  }
}

window.ClankAtelier.renderListTokens = function (tokens) {
  let index = 0

  function renderLevel(indent, type) {
    const first = tokens[index]

    let html = `<${type}`

    /*
                Preserve an explicitly numbered ordered-list start.

                Example:

                    3. Third
                    4. Fourth
            */

    if (type === 'ol' && first && first.start && first.start !== 1) {
      html += ` start="${first.start}"`
    }

    html += ` class="clank-atelier-list clank-atelier-list-${type}">`

    while (index < tokens.length) {
      const token = tokens[index]

      /*
                    We've returned to a shallower list level.
                */

      if (token.indent < indent) {
        break
      }

      /*
                    A deeper token belongs to the most recently
                    consumed list item and is handled below.
                */

      if (token.indent > indent) {
        break
      }

      /*
                    Changing list type at the same indentation starts
                    a new sibling list rather than merging the two.
                */

      if (token.type !== type) {
        break
      }

      index++

      html += '<li>' + window.ClankAtelier.renderInlineMarkdown(token.text)

      /*
                    Anything indented farther than this item becomes
                    a child list inside the current <li>.

                    Mixed nesting is supported:

                        - Parent
                          1. Child
                          2. Child
                            - Grandchild
                */

      while (index < tokens.length && tokens[index].indent > indent) {
        const childIndent = tokens[index].indent

        const childType = tokens[index].type

        html += renderLevel(childIndent, childType)
      }

      html += '</li>'
    }

    html += `</${type}>`

    return html
  }

  let html = ''

  /*
            Usually there is one root list.

            The loop also handles switching from UL → OL, or OL → UL,
            at the same root indentation.
        */

  while (index < tokens.length) {
    html += renderLevel(
      tokens[index].indent,

      tokens[index].type
    )
  }

  return html
}

// MAIN MARKDOWN PARSER

window.ClankAtelier.renderMarkdown = function (source) {
  const normalized = String(source).replace(/\r\n?/g, '\n')

  const lines = normalized.split('\n')

  const output = []

  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    // EMPTY

    if (!line.trim()) {
      index++

      continue
    }

    // CODE BLOCK

    const fenceMatch = line.trim().match(/^```([^\n`]*)$/)

    if (fenceMatch) {
      const language = fenceMatch[1].trim()

      const code = []

      index++

      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index])

        index++
      }

      if (index < lines.length) {
        index++
      }

      output.push(
        '<pre class="clank-atelier-code-block">' +
          '<code' +
          (language
            ? ` data-language="${window.ClankAtelier.escapeHtml(language)}"`
            : '') +
          '>' +
          window.ClankAtelier.escapeHtml(code.join('\n')) +
          '</code></pre>'
      )

      continue
    }

    // TABLE

    if (
      index + 1 < lines.length &&
      line.includes('|') &&
      window.ClankAtelier.isTableDivider(lines[index + 1])
    ) {
      const bodyLines = []

      let bodyIndex = index + 2

      while (
        bodyIndex < lines.length &&
        lines[bodyIndex].trim() &&
        lines[bodyIndex].includes('|')
      ) {
        bodyLines.push(lines[bodyIndex])

        bodyIndex++
      }

      output.push(
        window.ClankAtelier.renderTable(line, lines[index + 1], bodyLines)
      )

      index = bodyIndex

      continue
    }

    // HORIZONTAL RULE

    if (/^(\s*)(---+|\*\*\*+|___+)\s*$/.test(line)) {
      output.push('<hr class="clank-atelier-hr">')

      index++

      continue
    }

    // HEADING

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      const level = headingMatch[1].length

      output.push(
        `<h${level} class="clank-atelier-heading clank-atelier-h${level}">` +
          window.ClankAtelier.renderInlineMarkdown(headingMatch[2]) +
          `</h${level}>`
      )

      index++

      continue
    }

    // BLOCKQUOTE

    if (/^\s*>\s?/.test(line)) {
      const quoteLines = []

      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''))

        index++
      }

      output.push(
        '<blockquote class="clank-atelier-blockquote">' +
          quoteLines
            .map(quote => window.ClankAtelier.renderInlineMarkdown(quote))
            .join('<br>') +
          '</blockquote>'
      )

      continue
    }

    // LIST

    if (window.ClankAtelier.parseListMarker(line)) {
      const tokens = []

      while (index < lines.length) {
        const token = window.ClankAtelier.parseListMarker(lines[index])

        if (!token) {
          break
        }

        tokens.push(token)

        index++
      }

      output.push(window.ClankAtelier.renderListTokens(tokens))

      continue
    }

    // PARAGRAPH

    const paragraph = []

    while (index < lines.length) {
      const current = lines[index]

      if (!current.trim()) {
        break
      }

      if (current.trim().startsWith('```')) {
        break
      }

      if (/^#{1,6}\s+/.test(current)) {
        break
      }

      if (/^\s*>\s?/.test(current)) {
        break
      }

      if (/^\s*[-+*]\s+/.test(current)) {
        break
      }

      if (/^\s*\d+\.\s+/.test(current)) {
        break
      }

      if (/^(\s*)(---+|\*\*\*+|___+)\s*$/.test(current)) {
        break
      }

      if (
        index + 1 < lines.length &&
        current.includes('|') &&
        window.ClankAtelier.isTableDivider(lines[index + 1])
      ) {
        break
      }

      paragraph.push(current)

      index++
    }

    output.push(
      '<p class="clank-atelier-rendered-paragraph">' +
        paragraph
          .map(part => window.ClankAtelier.renderInlineMarkdown(part))
          .join('<br>') +
        '</p>'
    )

    if (index < lines.length && !lines[index].trim()) {
      index++
    }
  }

  return output.join('')
}
