'use strict'

/*
  Developer notes

  Implements Furina-only presentation markup such as cards, scenes, meters,
  details, tooltips, choices and dice. The markup is a client-side enhancement;
  ordinary Clank text remains the source of truth and malformed Furina markup
  should fail gracefully back to readable text.
*/
/* Explicit tag schemas. User text never supplies HTML, CSS or event handlers.
   Passage tokens survive Clank's list normalization; code remains literal. */
;(() => {
  const A = window.ClankAtelier
  const esc = A.escapeHtml
  const MAX_DEPTH = 16
  const registry = [
    ['whisper', 'Whisper', 'Passages'],
    ['thought', 'Thought', 'Passages'],
    ['narration', 'Narration', 'Passages'],
    ['shout', 'Shout', 'Passages'],
    ['letter', 'Letter', 'Formats'],
    ['phone', 'Phone', 'Formats'],
    ['radio', 'Radio', 'Formats'],
    ['system', 'System', 'Formats'],
    ['card', 'Card', 'Cards', {title: 'Recovered note'}],
    ['status', 'Status', 'Cards', {title: 'Character status'}],
    ['speaker', 'Speaker', 'Cards', {name: 'Mira'}],
    ['details', 'Details', 'Cards', {title: 'Read more'}],
    [
      'scene',
      'Scene',
      'Cards',
      {title: 'North Station', subtitle: '11:47 PM', mood: 'Heavy rain'},
      'leaf'
    ],
    ['meter', 'Meter', 'Cards', {label: 'Trust', value: '35'}, 'leaf'],
    ['choices', 'Choices', 'Interactive', {title: 'Choose a response'}],
    ['dice', 'Dice', 'Interactive', {label: 'Roll', sides: '20'}, 'leaf'],
    ['glow', 'Glow', 'Inline', {}, 'inline'],
    ['key', 'Key term', 'Inline', {}, 'inline'],
    ['sfx', 'Sound lettering', 'Inline', {}, 'inline'],
    ['spoiler', 'Spoiler', 'Inline', {}, 'inline'],
    ['redact', 'Redaction', 'Inline', {}, 'inline'],
    ['blur', 'Blurred text', 'Inline', {}, 'inline'],
    ['tip', 'Tooltip', 'Inline', {text: 'A short explanation'}, 'inline']
  ].map(([kind, label, group, attributes = {}, type = 'block']) =>
    Object.freeze({
      kind,
      label,
      group,
      attributes: Object.freeze(attributes),
      type
    })
  )
  const definitions = new Map(registry.map(item => [item.kind, item]))
  let context = null
  const bound = new WeakSet()

  function header(kind, source = '') {
    const def = definitions.get(kind)
    if (!def) return null
    const attrs = {}
    let rest = source
    while (rest.trim()) {
      const m = rest.match(/^\s+([a-z]+)=(?:"([^"\n]*)"|'([^'\n]*)')/)
      if (
        !m ||
        !Object.prototype.hasOwnProperty.call(def.attributes, m[1]) ||
        m[1] in attrs ||
        (m[2] ?? m[3]).length > 240
      )
        return null
      attrs[m[1]] = m[2] ?? m[3]
      rest = rest.slice(m[0].length)
    }
    if (
      kind === 'meter' &&
      attrs.value !== undefined &&
      !/^\d+(?:\.\d+)?$/.test(attrs.value)
    )
      return null
    if (
      kind === 'dice' &&
      attrs.sides !== undefined &&
      !['4', '6', '8', '10', '12', '20', '100'].includes(attrs.sides)
    )
      return null
    return {kind, attrs, def}
  }
  function stateKey(kind, content) {
    let hash = 2166136261
    for (let i = 0; i < content.length; i++)
      hash = Math.imul(hash ^ content.charCodeAt(i), 16777619)
    const base = kind + '-' + (hash >>> 0).toString(36)
    const count = context?.get(base) || 0
    context?.set(base, count + 1)
    return base + '-' + count
  }
  // Scan for a balanced inline close while skipping code and link destinations.
  function inlineEnd(text, start, kind) {
    const tokens =
      /\\.|(`+)[^\n]*?\1(?!`)|!?\[[^\]\n]*\]\(https?:\/\/[^\s)]+\)|\[(\/?)f:([a-z][a-z0-9-]*)([^\]\n]*)\]/g
    tokens.lastIndex = start
    const stack = [kind]
    let m
    while ((m = tokens.exec(text))) {
      if (!m[3]) continue
      const def = definitions.get(m[3])
      if (!def || def.type !== 'inline') return null
      if (m[2]) {
        if (m[4].trim() || stack.pop() !== m[3]) return null
        if (!stack.length) return {start: m.index, end: tokens.lastIndex}
      } else {
        if (!header(m[3], m[4]) || stack.length >= MAX_DEPTH) return null
        stack.push(m[3])
      }
    }
    return null
  }
  function inline(source, depth = 0, links = true, interactive = true) {
    const text = String(source)
    if (depth > MAX_DEPTH) return esc(text)
    /*
      Emphasis groups, in order: 8 = ***bold italic*** (symmetric triple-star,
      checked first so it isn't swallowed by the bold alternative), 9 = **bold**,
      10 = ~~strikethrough~~, 11 = *italic*. The italic content class also
      accepts a complete **bold** span as one of its repeated units, so a
      single-star italic run that has bold nested inside it -- for example
      *text **bold** more* or *text **bold*** -- is captured whole and handed
      back into inline() to render the nested <strong> correctly, instead of
      the bold alternative grabbing the ** pair out of context.
    */
    const pattern =
      /\\([\\`*~\[\]])|(`+)([^\n]*?)\2(?!`)|!\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\*((?:[^*\n]|\*\*[^*\n]*\*\*)+)\*(?!\*)|\[f:([a-z][a-z0-9-]*)([^\]\n]*)\]/g
    let html = '',
      cursor = 0,
      m
    while ((m = pattern.exec(text))) {
      html += esc(text.slice(cursor, m.index))
      if (m[1] !== undefined) html += esc(m[1])
      else if (m[2] !== undefined)
        html +=
          '<code class="clank-atelier-inline-code">' + esc(m[3]) + '</code>'
      else if (m[4] !== undefined) {
        const url = esc(m[5])
        html +=
          links && A.isSafeHttpUrl(m[5])
            ? '<span class="clank-atelier-image-wrap"><button type="button" class="clank-atelier-image-link" data-clank-atelier-image="' +
              url +
              '" aria-label="Open image preview"><img class="clank-atelier-image" src="' +
              url +
              '" alt="' +
              esc(m[4]) +
              '" loading="lazy" referrerpolicy="no-referrer"></button></span>'
            : esc(m[0])
      } else if (m[6] !== undefined) {
        html +=
          links && A.isSafeHttpUrl(m[7])
            ? '<a class="clank-atelier-link" href="' +
              esc(m[7]) +
              '" target="_blank" rel="noopener noreferrer">' +
              inline(m[6], depth + 1, false, false) +
              '</a>'
            : esc(m[0])
      } else if (m[12] !== undefined) {
        const token = header(m[12], m[13])
        const close =
          token?.def.type === 'inline' &&
          A.AtelierSettings?.value.rendering !== false
            ? inlineEnd(text, pattern.lastIndex, token.kind)
            : null
        if (
          !close ||
          (!interactive &&
            ['spoiler', 'redact', 'blur', 'tip'].includes(token.kind))
        ) {
          html += esc(m[0])
        } else {
          const body = text.slice(pattern.lastIndex, close.start)
          const rendered = inline(body, depth + 1, false, false)
          const key = stateKey(token.kind, text.slice(m.index, close.end))
          if (token.kind === 'tip') {
            html +=
              '<span class="furina-inline-tip" data-furina-state="' +
              key +
              '"><button type="button" class="furina-reveal-toggle" data-furina-tip title="' +
              esc(token.attrs.text || 'Explanation') +
              '" aria-expanded="false">' +
              rendered +
              '</button><span class="furina-inline-tip-content" hidden>' +
              esc(token.attrs.text || 'Explanation') +
              '</span></span>'
          } else if (['spoiler', 'redact', 'blur'].includes(token.kind)) {
            const label =
              token.kind === 'redact'
                ? '██████'
                : token.kind === 'blur'
                  ? 'Reveal blurred text'
                  : 'Reveal spoiler'
            html +=
              '<span class="furina-inline-reveal furina-inline-' +
              token.kind +
              '" data-furina-state="' +
              key +
              '"><button type="button" class="furina-reveal-toggle" aria-label="Reveal ' +
              token.kind +
              '" aria-expanded="false" data-furina-label="' +
              label +
              '">' +
              label +
              '</button><span class="furina-reveal-content" hidden>' +
              rendered +
              '</span></span>'
          } else
            html +=
              '<span class="furina-inline-' +
              token.kind +
              '">' +
              rendered +
              '</span>'
          pattern.lastIndex = close.end
        }
      } else if (m[8] !== undefined) {
        html +=
          '<strong class="clank-atelier-bold-italic"><em>' +
          inline(m[8], depth + 1, links, interactive) +
          '</em></strong>'
      } else {
        const tag =
          m[9] !== undefined ? 'strong' : m[10] !== undefined ? 'del' : 'em'
        html +=
          '<' +
          tag +
          '>' +
          inline(m[9] ?? m[10] ?? m[11], depth + 1, links, interactive) +
          '</' +
          tag +
          '>'
      }
      cursor = pattern.lastIndex
    }
    return html + esc(text.slice(cursor))
  }
  A.renderInlineMarkdown = inline

  function tokenize(source) {
    const lines = source.split('\n')
    const root = {children: []},
      stack = [root]
    let fence = null
    const append = line => {
      const children = stack[stack.length - 1].children
      if (children[children.length - 1]?.type === 'text')
        children[children.length - 1].lines.push(line)
      else children.push({type: 'text', lines: [line]})
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i],
        trimmed = line.trim()
      const mark = trimmed.match(/^(`{3,}|~{3,})(.*)$/)
      if (fence) {
        append(line)
        if (
          mark &&
          mark[1][0] === fence.char &&
          mark[1].length >= fence.length &&
          !mark[2].trim()
        )
          fence = null
        continue
      }
      if (mark) {
        fence = {char: mark[1][0], length: mark[1].length}
        append(line)
        continue
      }
      const single = trimmed.match(
        /^\[f:([a-z][a-z0-9-]*)([^\]\n]*)\](.*?)\[\/f:\1\]$/
      )
      if (single) {
        const token = header(single[1], single[2])
        if (
          token?.def.type === 'block' &&
          !/\[\/?f:(?:whisper|thought|narration|shout|letter|phone|radio|system|card|status|speaker|details)\b/.test(
            single[3]
          )
        ) {
          stack[stack.length - 1].children.push({
            ...token,
            type: 'block',
            start: i,
            end: i,
            children: [{type: 'text', lines: [single[3]]}]
          })
          continue
        }
      }
      const open = trimmed.match(/^\[f:([a-z][a-z0-9-]*)([^\]\n]*)\]$/)
      if (open && definitions.get(open[1])?.type !== 'inline') {
        const token = header(open[1], open[2])
        if (token?.def.type === 'leaf') {
          stack[stack.length - 1].children.push({
            ...token,
            type: 'leaf',
            start: i,
            end: i
          })
          continue
        }
        if (stack.length > MAX_DEPTH) return [{type: 'text', lines}]
        const node = {
          ...token,
          kind: open[1],
          type: 'block',
          start: i,
          invalid: !token,
          children: []
        }
        stack[stack.length - 1].children.push(node)
        stack.push(node)
        continue
      }
      const listClose = line.match(
        /^([ \t]*(?:[-+*]|\d+\.)[ \t]+.+?)[ \t]*\[\/f:([a-z][a-z0-9-]*)\]$/
      )
      if (
        listClose &&
        stack.length > 1 &&
        stack[stack.length - 1].kind === listClose[2] &&
        !stack[stack.length - 1].invalid
      ) {
        append(listClose[1].trimEnd())
        stack[stack.length - 1].end = i
        stack.pop()
        continue
      }
      const close = trimmed.match(/^\[\/f:([a-z][a-z0-9-]*)\]$/)
      if (close && stack.length > 1) {
        if (stack[stack.length - 1].kind === close[1]) {
          stack[stack.length - 1].end = i
          stack.pop()
          continue
        }
        for (const node of stack.slice(1)) node.invalid = true
      }
      append(line)
    }
    function finish(nodes) {
      for (const node of nodes) {
        if (node.type === 'text') continue
        node.raw = lines
          .slice(node.start, (node.end ?? lines.length - 1) + 1)
          .join('\n')
        if (node.children) finish(node.children)
      }
      return nodes
    }
    return finish(root.children)
  }
  function renderNodes(nodes) {
    let html = '',
      pending = []
    const flush = () => {
      if (pending.length) html += A.renderMarkdown(pending.join('\n'))
      pending = []
    }
    for (const node of nodes) {
      if (node.type === 'text') {
        pending.push(node.lines.join('\n'))
        continue
      }
      if (node.invalid || node.end === undefined) {
        pending.push(node.raw)
        continue
      }
      flush()
      const attrs = node.attrs
      if (node.kind === 'choices') {
        const title = esc(attrs.title || 'Choose a response')
        const raw = node.children
          .flatMap(child => (child.type === 'text' ? child.lines : []))
          .join('\n')
        const options = raw
          .split('\n')
          .map(line => line.trim().replace(/^[-*+]\s*/, ''))
          .filter(Boolean)
          .slice(0, 12)
        html +=
          '<div class="furina-choice-block"><div class="furina-markup-title">' +
          title +
          '</div><div class="furina-choice-list">' +
          options
            .map(
              (option, index) =>
                '<button type="button" class="furina-choice-option" data-furina-choice="' +
                esc(option) +
                '"><span>' +
                (index + 1) +
                '</span>' +
                inline(option, 0, false, false) +
                '</button>'
            )
            .join('') +
          '</div></div>'
      } else if (node.kind === 'dice') {
        const sides = Number(attrs.sides || 20)
        const key = stateKey(node.kind, node.raw)
        html +=
          '<div class="furina-dice-widget" data-furina-state="' +
          key +
          '" data-furina-dice-sides="' +
          sides +
          '" data-furina-dice-label="' +
          esc(attrs.label || 'Roll') +
          '"><div><strong>' +
          esc(attrs.label || 'Roll') +
          '</strong><small>d' +
          sides +
          '</small></div><div class="furina-dice-actions"><button type="button" data-furina-roll>Roll d' +
          sides +
          '</button><output aria-live="polite">—</output><button type="button" data-furina-insert-result disabled>Insert result</button></div></div>'
      } else if (node.kind === 'meter') {
        const value = Math.min(100, Math.max(0, Number(attrs.value ?? 0)))
        html +=
          '<div class="furina-markup-meter"><div>' +
          esc(attrs.label || 'Meter') +
          '<strong>' +
          value +
          '%</strong></div><progress max="100" value="' +
          value +
          '" aria-label="' +
          esc(attrs.label || 'Meter') +
          '">' +
          value +
          '%</progress></div>'
      } else if (node.kind === 'scene') {
        html +=
          '<div class="furina-markup-scene"><span aria-hidden="true">✦</span><strong>' +
          esc(attrs.title || 'Scene') +
          '</strong>' +
          (attrs.subtitle ? '<span>' + esc(attrs.subtitle) + '</span>' : '') +
          (attrs.mood ? '<small>' + esc(attrs.mood) + '</small>' : '') +
          '</div>'
      } else {
        const body = renderNodes(node.children)
        if (node.kind === 'details') {
          html +=
            '<details class="furina-markup-details" data-furina-state="' +
            stateKey(node.kind, node.raw) +
            '"><summary>' +
            esc(attrs.title || 'Read more') +
            '</summary><div>' +
            body +
            '</div></details>'
        } else {
          const title =
            attrs.title ||
            attrs.name ||
            {
              letter: 'Correspondence',
              phone: 'Message',
              radio: 'Transmission',
              system: 'System notice',
              status: 'Status'
            }[node.kind]
          html +=
            '<div class="furina-markup-block furina-markup-' +
            node.kind +
            '">' +
            (title
              ? '<div class="furina-markup-title">' + esc(title) + '</div>'
              : '') +
            body +
            '</div>'
        }
      }
    }
    flush()
    return html
  }
  function setRevealed(element, open) {
    const button = element.querySelector(':scope > button')
    const content = element.querySelector(':scope > span')
    if (!button || !content) return
    button.setAttribute('aria-expanded', String(open))
    content.hidden = !open
    if (!button.hasAttribute('data-furina-tip')) {
      button.textContent = open ? 'Hide' : button.dataset.furinaLabel
      button.setAttribute(
        'aria-label',
        open ? 'Hide revealed text' : 'Reveal hidden text'
      )
    }
  }
  A.AtelierMarkup = {
    registry: Object.freeze(registry),
    render(source) {
      const previous = context
      context = new Map()
      try {
        const text = String(source).replace(/\r\n?/g, '\n')
        return A.AtelierSettings?.value.rendering === false
          ? A.renderMarkdown(text)
          : renderNodes(tokenize(text))
      } finally {
        context = previous
      }
    },
    capture(container) {
      return new Map(
        Array.from(container.querySelectorAll('[data-furina-state]'), node => {
          if (node.classList.contains('furina-dice-widget'))
            return [
              node.dataset.furinaState,
              {type: 'dice', result: node.dataset.furinaDiceResult || ''}
            ]
          return [
            node.dataset.furinaState,
            node.tagName === 'DETAILS'
              ? node.open
              : node.querySelector('button')?.getAttribute('aria-expanded') ===
                'true'
          ]
        })
      )
    },
    restore(container, state) {
      for (const node of container.querySelectorAll('[data-furina-state]')) {
        if (!state.has(node.dataset.furinaState)) continue
        const saved = state.get(node.dataset.furinaState)
        if (
          node.classList.contains('furina-dice-widget') &&
          saved?.type === 'dice'
        ) {
          const output = node.querySelector('output')
          const insert = node.querySelector('[data-furina-insert-result]')
          node.dataset.furinaDiceResult = saved.result || ''
          if (output && saved.result) output.textContent = saved.result
          if (insert) insert.disabled = !saved.result
        } else if (node.tagName === 'DETAILS') node.open = saved
        else setRevealed(node, saved)
      }
    },
    bind(container) {
      if (bound.has(container)) return
      bound.add(container)
      container.addEventListener('click', event => {
        const reveal = event.target.closest?.('.furina-reveal-toggle')
        if (reveal && container.contains(reveal)) {
          event.preventDefault()
          event.stopPropagation()
          setRevealed(
            reveal.parentElement,
            reveal.getAttribute('aria-expanded') !== 'true'
          )
          return
        }
        if (A.AtelierSettings?.value.interactive === false) return
        const choice = event.target.closest?.('[data-furina-choice]')
        if (choice && container.contains(choice)) {
          event.preventDefault()
          event.stopPropagation()
          const inserted = A.AtelierComposer?.insertText?.(
            choice.dataset.furinaChoice || ''
          )
          if (inserted) A.SfxManager?.play?.('choice')
          return
        }
        const roll = event.target.closest?.('[data-furina-roll]')
        if (roll && container.contains(roll)) {
          event.preventDefault()
          event.stopPropagation()
          const widget = roll.closest('.furina-dice-widget')
          const sides = Number(widget?.dataset.furinaDiceSides || 20)
          const result = String(
            (crypto.getRandomValues(new Uint32Array(1))[0] % sides) + 1
          )
          widget.dataset.furinaDiceResult = result
          const output = widget.querySelector('output')
          if (output) output.textContent = result
          const insert = widget.querySelector('[data-furina-insert-result]')
          if (insert) insert.disabled = false
          A.SfxManager?.play?.('dice')
          return
        }
        const insert = event.target.closest?.('[data-furina-insert-result]')
        if (insert && container.contains(insert)) {
          event.preventDefault()
          event.stopPropagation()
          const widget = insert.closest('.furina-dice-widget')
          const result = widget?.dataset.furinaDiceResult
          if (result) {
            const inserted = A.AtelierComposer?.insertText?.(
              `${widget.dataset.furinaDiceLabel || 'Roll'}: ${result} (d${widget.dataset.furinaDiceSides || 20})`
            )
            if (inserted) A.SfxManager?.play?.('insert')
          }
        }
      })
    }
  }
})()
