// THE SANDBOX TAG (BK 2026-11-04 13:15, "1. yes" to Josh's sandbox spec, Q3 wording as proposed).
//
// The same code ships to the sandbox and to live, so that after a promote the two sites serve
// identical bytes (spec §2, §4). It decides at runtime, from the address: on any *.workers.dev
// address (the sandbox, any branch preview) it shows a small corner tag and prefixes the tab title;
// on flashpointhistory.com it does nothing at all. Dormant on live, by design.
//
// The tag does not push the page down (fixed, out of flow) and does not take taps
// (pointer-events: none), so what BK walks is laid out exactly as a kid gets it.
// Text is 12 px, black on white, 21:1.
//
// It also adds <meta name="robots" content="noindex, nofollow"> on a sandbox address, so a sandbox is
// never indexed even where the site itself has no noindex (1832). Live is untouched.
//
// ONE FILE, IDENTICAL IN EVERY REPO THAT HAS A SANDBOX (thearena, long-day-1832, ...). Change it everywhere or nowhere.

const COMMIT = typeof __COMMIT__ === 'string' ? __COMMIT__ : ''
const WORDS = 'SANDBOX · not live'
const TITLE_PREFIX = '[SANDBOX] '

export function isSandboxHost(host) {
  return /\.workers\.dev$/i.test(String(host || ''))
}

export function mountSandboxTag(win = typeof window !== 'undefined' ? window : null) {
  if (!win || !isSandboxHost(win.location && win.location.hostname)) return false
  const doc = win.document

  if (!doc.querySelector('meta[name="robots"]')) {
    const m = doc.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    doc.head.appendChild(m)
  }

  const tag = doc.createElement('div')
  tag.className = 'sandbox-tag'
  tag.setAttribute('role', 'note')
  tag.textContent = COMMIT ? `${WORDS} · ${COMMIT}` : WORDS
  tag.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'z-index:2147483647',
    'padding:2px 6px', 'font:600 12px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    'letter-spacing:0.02em', 'color:#000', 'background:#fff',
    'border:2px dashed #B00020', 'border-top:0', 'border-left:0', 'border-bottom-right-radius:4px',
    'pointer-events:none', 'user-select:none', 'white-space:nowrap',
  ].join(';')
  doc.body.appendChild(tag)

  // Keep the tab title prefixed, even when the app changes the title later.
  const fix = () => {
    if (!doc.title.startsWith(TITLE_PREFIX)) doc.title = TITLE_PREFIX + doc.title
  }
  fix()
  const head = doc.querySelector('head')
  if (head && win.MutationObserver) {
    new win.MutationObserver(fix).observe(head, { subtree: true, childList: true, characterData: true })
  }
  return true
}
