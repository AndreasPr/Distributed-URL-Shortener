export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect
        width="40"
        height="40"
        rx="12"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M11 15h11a5 5 0 0 1 0 10H11m0 0 5-5m-5 5 5 5M29 15l-5-5m5 5-5 5"
        stroke="currentColor"
        className="text-primary-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
