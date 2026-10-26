/** 原創旋塗標記：同心圓弧、膜厚曲線與端點，僅作裝飾。 */
export function BrandMark() {
  return <span data-testid="header-logo" className="brand-mark-frame" aria-hidden="true">
    <svg data-testid="brand-mark" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--color-brand)" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M34.5 12.5A16 16 0 1 0 39.2 29" />
      <path d="M31.2 17A10.5 10.5 0 1 0 34.4 25.8" />
      <path d="M27.5 21A5.6 5.6 0 1 0 29.2 26" />
      <path d="M8 38C15 38 18 32 22 28S33 15 41 11" stroke="var(--color-brand-accent)" strokeWidth="2.2" />
      <circle cx="41" cy="11" r="2.5" fill="var(--color-brand)" stroke="none" />
    </svg>
  </span>;
}
