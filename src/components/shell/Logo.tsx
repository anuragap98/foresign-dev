export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="gel inline-flex shrink-0 items-center justify-center rounded-[11px]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3.5" y="4.5" width="17" height="15" rx="5" />
        <path d="M3.5 11.5c3 1.6 6 2 8.5 2s5.5-.4 8.5-2" strokeLinecap="round" />
      </svg>
    </span>
  )
}
