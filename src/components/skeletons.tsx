"use client";

/**
 * Spec D rev 2 (Figmi loading-motion.md). R1 — the ghost IS the node: real
 * class chain + a sample string, transparent ink, fill painted on; geometry
 * is inherited, so zero reflow is structural, not verified. R2 — chrome
 * renders real at t=0 (thead, section labels, Rs captions, dt labels); only
 * fetched values ghost. No inline width:%/height:px sizing survives.
 */

export const GS = {
  money: "88,888", // under a live `Rs ` caption → "Rs 88,888"
  money7: "8,888,888", // hero / invoice totals — 7-figure days are real
  figure: "88",
  code: "ORD-88888",
  codeInv: "INV-88888", // same 9-char footprint, distinct prefix — §8 blind
  // test must be able to name invoice surfaces from the ghost alone
  sku: "8888",
  name: "Raseed Traders",
  person: "AR",
  date: "28 Sep 2026",
  time: "28 Sep, 4:30 PM",
  addr: "Shop 8, Main Bazaar",
  word: "8888 8888",
} as const;

export type Role =
  | "code"
  | "codeinv"
  | "sku"
  | "name"
  | "word"
  | "person"
  | "figure"
  | "money"
  | "money7"
  | "status"
  | "date"
  | "line";

/* 1,2,5 — character-stepped numeric ghost (money digits, figures, codes) */
export function GNum({ s, cls = "" }: { s: string; cls?: string }) {
  return (
    <span className={`num g g-num ${cls}`.trim()} aria-hidden="true">
      {s}
    </span>
  );
}

/* Money lockup: live `Rs` caption (chrome) + digit-block ghost, right-pinned
   by the real `.r`. big = hero/invoice-total width class. */
export function GMoney({ big = false }: { big?: boolean }) {
  return (
    <span className="money r">
      <span className="muted">Rs&nbsp;</span>
      <GNum s={big ? GS.money7 : GS.money} />
    </span>
  );
}

/* 6 — proportional text bar sized by its own sample */
export function GLine({ s, cls = "" }: { s: string; cls?: string }) {
  return (
    <span className={`g g-line ${cls}`.trim()} aria-hidden="true">
      {s}
    </span>
  );
}

/* 3 — status pill OUTLINE in the tone it will likely land (inset ring) */
export function GPill({ tone = "neu" }: { tone?: string }) {
  return (
    <span className={`status s-${tone} g g-pill`} aria-hidden="true">
      {GS.word}
    </span>
  );
}

/* 4 — real .person tree: avatar disc + name line + meta line */
export function GPerson() {
  return (
    <span className="person">
      <span className="avatar g-disc" aria-hidden="true">
        {GS.person}
      </span>
      <span>
        <GLine s={GS.name} cls="pname" />
        <br />
        <GLine s={GS.addr} cls="pmeta" />
      </span>
    </span>
  );
}

/* 7 — real button geometry, ghosted label bar inside */
export function GBtn({ label = GS.word }: { label?: string }) {
  return (
    <span className="btn-sec btn-sm g-btn" aria-hidden="true">
      <GLine s={label} />
    </span>
  );
}

/* 8 — real .spark box, fixed varied bar heights at ghost opacity */
export function GSpark() {
  const heights = [38, 55, 30, 68, 46, 60, 40];
  return (
    <div className="spark" aria-hidden="true">
      {heights.map((h, i) => (
        <i key={i} className="g-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function RoleCell({ role }: { role: Role }) {
  switch (role) {
    case "money":
      return <GMoney />;
    case "money7":
      return <GMoney big />;
    case "code":
      return <GNum s={GS.code} />;
    case "codeinv":
      return <GNum s={GS.codeInv} />;
    case "sku":
      return <GNum s={GS.sku} />;
    case "figure":
      return <GNum s={GS.figure} />;
    case "date":
      return <GNum s={GS.date} cls="meta" />;
    case "status":
      return <GPill />;
    case "person":
      return <GPerson />;
    case "name":
      return <GLine s={GS.name} />;
    case "word":
      return <GLine s={GS.word} />;
    default:
      return <GLine s={GS.addr} />;
  }
}

export function SkelRow({ cols }: { cols: { role: Role; r?: boolean }[] }) {
  return (
    <tr>
      {cols.map((c, i) => (
        <td key={i} className={c.r ? "r" : undefined}>
          <RoleCell role={c.role} />
        </td>
      ))}
    </tr>
  );
}

export function SkelRows({
  rows = 6,
  cols,
}: {
  rows?: number;
  cols: { role: Role; r?: boolean }[];
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, k) => (
        <SkelRow key={k} cols={cols} />
      ))}
    </>
  );
}

/** §2b — booker order cards: person + money + likely-tone pill + action box. */
export function SkelCards({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <div key={k} className="pcard">
          <div className="rowb">
            <GPerson />
            <GPill tone="warn" />
          </div>
          <div className="rowb" style={{ marginTop: 10 }}>
            <GMoney />
            <GBtn label="888888" />
          </div>
        </div>
      ))}
    </>
  );
}

/** §2b — stat tiles: real labels (chrome) + breathing numeric values. */
export function SkelTiles({ labels }: { labels?: string[] } = {}) {
  const labs = labels ?? ["Booked", "Collected", "To collect"];
  return (
    <>
      {labs.map((l) => (
        <div className="pstat" key={l}>
          <p className="pstat-lab">{l}</p>
          <p className="pstat-val num g g-num g-breathe" aria-hidden="true">
            {GS.money}
          </p>
        </div>
      ))}
    </>
  );
}

/** Rail stat lines: real label text + money ghost, right-pinned. */
export function SkelStatLines({ labels }: { labels: string[] }) {
  return (
    <div className="stat-list">
      {labels.map((l) => (
        <div className="stat-line" key={l}>
          <span className="l">{l}</span>
          <GMoney />
        </div>
      ))}
    </div>
  );
}

/** Pipeline ghost: dots + label stubs (office hero band). */
export function SkelPipeline({ steps = 4 }: { steps?: number }) {
  return (
    <div className="pipe" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} className="pipe-step" style={{ display: "contents" }}>
          {i > 0 && <span className="pipe-line" style={{ ["--i" as string]: i }} />}
          <span className="pipe-dot" />
          <span className="pipe-lab g g-line">{GS.word}</span>
          <span className="pipe-n num g g-num">{GS.figure}</span>
        </span>
      ))}
    </div>
  );
}

/** §2b — detail (order / invoice, both surfaces): real section titles, real
 * dl dt labels, real thead, hollow timeline rings; ghost only the values. */
export function SkelDetail({ noun }: { noun: string }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading {noun}…</span>
      <div className="pcard stack">
        <div className="rowb">
          <GLine s={noun === "invoice" ? GS.codeInv : GS.code} cls="pname" />
          <GPill />
        </div>
        <dl className="dl" style={{ marginTop: 12 }}>
          <div>
            <dt>Customer</dt>
            <dd>
              <GPerson />
            </dd>
          </div>
          <div>
            <dt>Placed</dt>
            <dd>
              <GNum s={GS.time} />
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>
              <GMoney />
            </dd>
          </div>
        </dl>
      </div>
      <div className="pcard" style={{ marginTop: 12 }}>
        <p className="ptitle-s">Line items</p>
        <table className="tbl store" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="r">Qty</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody className="g-band">
            <SkelRows
              rows={3}
              cols={[
                { role: "sku" },
                { role: "name" },
                { role: "figure", r: true },
                { role: "money", r: true },
              ]}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
