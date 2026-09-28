"use client";

/**
 * Spec D (Figmi loading-motion.md §2) shape helpers. Skeletons are static grey
 * fields mirroring the loaded layout — zero reflow on swap, no stagger, no
 * entrance animation. Only sizes live here; the one token (.skel) is CSS.
 */

type ColSpec = { w?: string; r?: boolean };

export function SkelRow({ cols }: { cols: ColSpec[] }) {
  return (
    <tr>
      {cols.map((c, i) => (
        <td key={i} className={c.r ? "r" : undefined}>
          <span
            className={`skel skel-line${c.r ? " sm" : ""}`}
            style={{ width: c.w ?? "60%", marginLeft: c.r ? "auto" : undefined }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkelRows({
  rows = 5,
  cols,
}: {
  rows?: number;
  cols: ColSpec[];
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, k) => (
        <SkelRow key={k} cols={cols} />
      ))}
    </>
  );
}

/** §2a — booker card list: 3 isomorphic .pcard skeletons. */
export function SkelCards({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <div key={k} className="pcard">
          <div className="rowb">
            <span className="skel skel-line" style={{ width: "55%" }} />
            <span className="skel skel-pill" />
          </div>
          <div className="rowb" style={{ marginTop: 12 }}>
            <span className="skel skel-line" style={{ width: "32%" }} />
            <span className="skel skel-line sm" style={{ width: "22%" }} />
          </div>
        </div>
      ))}
    </>
  );
}

/** §2b — .pstats strip while loading: tiles, never Rs 0 values. */
export function SkelTiles({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className="skel skel-tile" />
      ))}
    </>
  );
}

/** §2d — order/invoice detail: title+pill header, 4 meta lines, timeline
 * circles, 3 line-item rows. One record loading, static shapes. */
export function SkelDetail({
  tableCols,
}: {
  tableCols?: { w?: string; r?: boolean }[];
}) {
  return (
    <>
      <div className="row" style={{ gap: 16, alignItems: "stretch" }}>
        <div className="card2" style={{ flex: 1 }}>
          <span className="skel skel-title" style={{ display: "block" }} />
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="skel skel-line"
              style={{ display: "block", width: "60%", marginTop: 10 }}
            />
          ))}
        </div>
        <div className="card2" style={{ width: 250 }}>
          {[0, 1, 2].map((i) => (
            <div className="row" key={i} style={{ gap: 10, marginTop: i ? 12 : 0 }}>
              <span className="skel skel-circle" />
              <span className="grow">
                <span className="skel skel-line" style={{ display: "block", width: "70%" }} />
                <span className="skel skel-line sm" style={{ display: "block", width: "50%", marginTop: 6 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card2 grow">
        <table className="tbl store">
          <tbody>
            <SkelRows rows={3} cols={tableCols ?? [
              { w: "42%" },
              { w: "68%" },
              { w: "36px", r: true },
              { w: "52px", r: true },
              { w: "52px", r: true },
            ]} />
          </tbody>
        </table>
      </div>
    </>
  );
}
