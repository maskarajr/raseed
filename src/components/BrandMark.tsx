export function BrandMark({
  compact = false,
  className,
  title = "Raseed",
}: {
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g fill="currentColor">
        {compact ? (
          <>
            <rect x="1.5" y="6.35" width="21" height="3.4" rx="1.7" />
            <rect x="4.15" y="9.75" width="2.8" height="3.4" rx="1.4" />
            <rect x="17.05" y="9.75" width="2.8" height="3.4" rx="1.4" />
            <rect x="1.5" y="13.15" width="8.1" height="4.4" rx="2.2" />
            <rect x="14.4" y="13.15" width="8.1" height="4.4" rx="2.2" />
          </>
        ) : (
          <>
            <rect x="2" y="5.4" width="20" height="2.8" rx="1.4" />
            <rect x="4.4" y="8.2" width="2.8" height="3.4" rx="1.4" />
            <rect x="16.8" y="8.2" width="2.8" height="3.4" rx="1.4" />
            <rect x="2" y="11.6" width="7.6" height="3.4" rx="1.7" />
            <rect x="14.4" y="11.6" width="7.6" height="3.4" rx="1.7" />
            <rect x="10.6" y="8.2" width="2.8" height="7.6" rx="1.4" />
            <rect x="6.3" y="15.8" width="11.4" height="2.8" rx="1.4" />
          </>
        )}
      </g>
    </svg>
  );
}

export function BrandLockup() {
  return (
    <span className="rbrand">
      <BrandMark compact className="rmark" />
      Raseed
    </span>
  );
}
