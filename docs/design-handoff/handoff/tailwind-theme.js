/**
 * Raseed — design tokens as a Tailwind theme fragment.
 *
 * Optional. Use only if the app is already on Tailwind; otherwise bind
 * `handoff/raseed.css` directly. The values mirror `raseed.css` exactly — that
 * file is the source of truth. If the two ever disagree, fix this file.
 *
 * Usage (tailwind.config.js, Tailwind v3):
 *   import { raseedTheme } from './handoff/tailwind-theme.js';
 *   export default { content: [<your app source glob>], theme: raseedTheme };
 *
 * CJS alternative: replace the `export` below with `module.exports = { raseedTheme }`.
 */

export const raseedTheme = {
  extend: {
    colors: {
      /* six locked tokens */
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      fg: 'var(--fg)',
      muted: 'var(--muted)',
      border: 'var(--border)',
      accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)' },
      /* brand secondary — graphic fill only, never a white-text button fill */
      warm: 'var(--warm)',

      /* StatusPill pairs — the only permitted status colouring.
         Use exactly as `text-ok-fg bg-ok-bg`, never mixed across tones. */
      ok: { fg: 'var(--ok-fg)', bg: 'var(--ok-bg)' },
      info: { fg: 'var(--info-fg)', bg: 'var(--info-bg)' },
      warn: { fg: 'var(--warn-fg)', bg: 'var(--warn-bg)' },
      bad: { fg: 'var(--bad-fg)', bg: 'var(--bad-bg)' },
      neu: { fg: 'var(--neu-fg)', bg: 'var(--neu-bg)' },
    },

    fontFamily: {
      display: 'var(--font-display)',
      sans: 'var(--font-body)',
      body: 'var(--font-body)',
      mono: 'var(--font-mono)',
    },

    fontSize: {
      meta: 'var(--fs-meta)',
    },

    borderRadius: {
      DEFAULT: 'var(--radius)',
      lg: 'var(--radius-lg)',
    },

    /* Working area on --bg, chrome on --surface. */
    backgroundColor: {
      canvas: 'var(--bg)',
    },
  },
};

/**
 * Status label -> pill tone. One label maps to exactly one tone on both the
 * office and the booker surface. Anything not in this map does not get a pill.
 *
 * Money that is outstanding is always "To collect" (warn). `bad` is reserved
 * for terminal-negative states only.
 */
export const labelTone = {
  /* ok */
  paid: 'ok',
  confirmed: 'ok',
  'in stock': 'ok',
  collected: 'ok',
  delivered: 'ok',
  'up to date': 'ok',
  'on track': 'ok',
  active: 'ok',
  /* info */
  scheduled: 'info',
  /* warn */
  'to collect': 'warn',
  'awaiting confirm': 'warn',
  low: 'warn',
  /* bad */
  cancelled: 'bad',
  out: 'bad',
  /* neu */
  draft: 'neu',
  inactive: 'neu',
  'not shipped': 'neu',
};

/** Filter-bar vocabularies (the `data-f` values each list ships with). */
export const filterSets = {
  orders: ['', 'scheduled', 'confirmed', 'awaiting', 'draft'],
  invoices: ['', 'to collect', 'paid', 'draft'],
  products: ['', 'rice', 'oil', 'grocery', 'pulses'],
  'booker-orders': ['', 'scheduled', 'to collect', 'collected'],
};
