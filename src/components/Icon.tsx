type IconName =
  | "home"
  | "chart"
  | "orders"
  | "invoice"
  | "box"
  | "people"
  | "user"
  | "ledger"
  | "gear"
  | "plus"
  | "edit"
  | "logout"
  | "search";

const PATHS: Record<IconName, string[]> = {
  home: ["M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"],
  chart: ["M4 19h16M7 16V9m5 7V5m5 11v-4"],
  orders: ["M6 7h12v12H6zM9 7V5h6v2"],
  invoice: ["M7 4h10v16H7zM9 8h6M9 12h6M9 16h4"],
  box: ["M4 7h16v11H4zM4 7l8 4 8-4"],
  people: [
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 19a4 4 0 0 1 8 0m8 0a4 4 0 0 0-8 0",
  ],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0"],
  ledger: ["M6 4h12v16H6zM9 8h6M9 12h6M9 16h3"],
  gear: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM4 12h2m12 0h2M12 4v2m0 12v2"],
  plus: ["M12 5v14M5 12h14"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  logout: [
    "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3",
    "M10 16l-4-4 4-4M6 12h9",
  ],
  search: ["m20 20-3.5-3.5"],
};

export function Icon({
  name,
  className = "ic",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      {name === "search" ? <circle cx="11" cy="11" r="7" /> : null}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
