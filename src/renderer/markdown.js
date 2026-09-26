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

// NESTED EMPHASIS STYLING
//
// Clank can apply its own typography rules to <strong> and <em>. In some
// themes that can make a semantic <strong><em> combination look mostly
// italic. Keep Furina's nested emphasis styling explicit and local.
if (!document.getElementById('clank-atelier-nested-emphasis-style')) {
  const style = document.createElement('style')
  style.id = 'clank-atelier-nested-emphasis-style'
  style.textContent = `
    .clank-atelier-bold-italic {
      font-weight: 700 !important;
      font-style: italic !important;
    }

    .clank-atelier-bold-italic em {
      font-weight: 700 !important;
      font-style: italic !important;
    }

    .clank-atelier-nested-bold {
      font-weight: 700 !important;
    }
  `
  document.head.appendChild(style)
}

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
  // Protect code spans while emphasis is parsed. Markdown markers inside
  // code are literal text and must never become <strong> or <em>.
  const protectedInlineCode = []

  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    const token = `\uE000${protectedInlineCode.length}\uE001`

    protectedInlineCode.push(
      '<code class="clank-atelier-inline-code">' + code + '</code>'
    )

    return token
  })

  /*
    Emphasis is parsed recursively so nested Markdown produces valid HTML.

    This intentionally covers the practical combinations Furina users are
    likely to write rather than attempting to implement every CommonMark edge
    case. The parser works only on escaped text, while inline code is protected
    above so its asterisks remain literal.
  */
  // Finds the next standalone `*` (one that is not part of a `**` pair)
  // starting from `from`, stopping if it would land at or past `limit`.
  // Used to tell a genuine nested `*italic **bold***` pattern apart from
  // an unrelated `**`/`***` run that just happens to appear later in the
  // same line (for example a plain `*action*` followed separately by a
  // `***bold italic***` phrase).
  function findStandaloneStar(source, from, limit) {
    let end = from

    while (end < source.length && (limit === undefined || end < limit)) {
      end = source.indexOf('*', end)

      if (end === -1 || (limit !== undefined && end >= limit)) {
        return -1
      }

      if (source[end - 1] !== '*' && source[end + 1] !== '*') {
        return end
      }

      end++
    }

    return -1
  }

  function renderEmphasis(source) {
    let result = ''
    let index = 0

    function renderRange(start, end) {
      return renderEmphasis(source.slice(start, end))
    }

    while (index < source.length) {
      // Common nested form: *italic with **bold inside***. The final three
      // stars are the bold closing pair plus the outer italic closer.
      //
      // This must only fire when the `**` really does belong to the same
      // span as this opening `*`. If a standalone closing `*` appears first
      // (a normal, unrelated italic ending before the later `**`), this is
      // NOT the nested pattern -- it's a plain italic followed by something
      // else further down the line, and must fall through to the plain
      // italic branch below instead.
      if (source[index] === '*' && source[index + 1] !== '*') {
        const nestedBold = source.indexOf('**', index + 1)

        if (nestedBold > index + 1) {
          const plainClose = findStandaloneStar(source, index + 1, nestedBold)

          if (plainClose === -1) {
            const closingTriple = source.indexOf('***', nestedBold + 2)

            if (closingTriple !== -1) {
              result +=
                '<em>' +
                renderRange(index + 1, nestedBold) +
                '<strong class="clank-atelier-nested-bold">' +
                renderRange(nestedBold + 2, closingTriple) +
                '</strong></em>'

              index = closingTriple + 3
              continue
            }
          }
        }
      }

      // Triple emphasis gets the first chance to claim its complete span.
      if (source.startsWith('***', index)) {
        const end = source.indexOf('***', index + 3)

        if (end !== -1 && end > index + 3) {
          result +=
            '<strong class="clank-atelier-bold-italic"><em>' +
            renderRange(index + 3, end) +
            '</em></strong>'

          index = end + 3
          continue
        }
      }

      // A single star starts italic only when it is not immediately part of
      // a bold marker. Its closing star must likewise stand on its own.
      if (source[index] === '*' && source[index + 1] !== '*') {
        let end = index + 1

        while (end < source.length) {
          end = source.indexOf('*', end)

          if (end === -1) {
            break
          }

          if (source[end - 1] !== '*' && source[end + 1] !== '*') {
            break
          }

          end++
        }

        if (end !== -1 && end > index + 1) {
          result += '<em>' + renderRange(index + 1, end) + '</em>'

          index = end + 1
          continue
        }
      }

      // Bold is checked after outer single-star emphasis. This lets
      // *italic with **bold inside*** keep the final single star for the
      // outer italic span.
      if (source.startsWith('**', index)) {
        let end = index + 2

        while (end < source.length) {
          end = source.indexOf('**', end)

          if (end === -1) {
            break
          }

          if (source[end + 2] !== '*') {
            break
          }

          end++
        }

        if (end !== -1 && end > index + 2) {
          result += '<strong>' + renderRange(index + 2, end) + '</strong>'

          index = end + 2
          continue
        }
      }

      result += source[index]
      index++
    }

    return result
  }

  html = renderEmphasis(html)

  // STRIKETHROUGH
  html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  // Restore protected inline code after all emphasis passes.
  html = html.replace(/\uE000(\d+)\uE001/g, (match, index) => {
    return protectedInlineCode[Number(index)] || match
  })

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
