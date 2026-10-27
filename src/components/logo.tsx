export function LogoMark({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="12" className={inverted ? "fill-soft" : "fill-deep"} />
      <path
        d="M11 19.5 20 12l9 7.5V29a1 1 0 0 1-1 1h-5v-6h-6v6h-5a1 1 0 0 1-1-1z"
        className={inverted ? "fill-deep" : "fill-soft"}
      />
      <rect x="17" y="24" width="6" height="6" className="fill-mid" />
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold tracking-tight">MyPlace</span>
    </span>
  );
}
