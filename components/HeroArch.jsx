export default function HeroArch() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 480 340"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#e8a355" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e8a355" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="archFill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f6cf9a" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#c9d4de" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c9d4de" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="archFillOuter" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#e8a355" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8a355" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="240" cy="230" r="200" fill="url(#glow)" />

      <path
        d="M 130 300 L 130 165 A 110 110 0 0 1 350 165 L 350 300"
        stroke="url(#archFillOuter)"
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 160 300 L 160 165 A 80 80 0 0 1 320 165 L 320 300"
        stroke="url(#archFill)"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
