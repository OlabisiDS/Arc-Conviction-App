"use client";

import { forwardRef } from "react";

const TIER_STYLES = {
  "arc builder": {
    color: "#5c8ab8",
    label: "arc builder",
    glow: "rgba(92,138,184,0.35)",
    rank: 1,
    tagline: "finding their footing",
    background: "radial-gradient(120% 90% at 50% 0%, #16324f 0%, #0d2038 45%, #060f1c 100%)"
  },
  "arc core": {
    color: "#8fc0e6",
    label: "arc core",
    glow: "rgba(143,192,230,0.35)",
    rank: 2,
    tagline: "consistently building",
    background: "radial-gradient(120% 90% at 50% 0%, #1c3f5e 0%, #0d2038 45%, #060f1c 100%)"
  },
  "arc legend": {
    color: "#e8a355",
    label: "arc legend",
    glow: "rgba(232,163,85,0.5)",
    rank: 3,
    tagline: "maximum conviction",
    background:
      "radial-gradient(130% 100% at 50% -10%, #3d2c18 0%, #2a2438 30%, #14243a 60%, #060f1c 100%)"
  }
};

function RankDots({ rank, color }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: i <= rank ? color : "transparent",
            border: `1px solid ${i <= rank ? color : "rgba(255,255,255,0.25)"}`
          }}
        />
      ))}
    </div>
  );
}

function Sparkles({ color }) {
  const points = [
    [30, 40], [330, 60], [24, 260], [336, 300], [50, 340], [310, 150]
  ];
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {points.map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x} ${y - 4} L ${x + 1.5} ${y - 1.5} L ${x + 4} ${y} L ${x + 1.5} ${y + 1.5} L ${x} ${y + 4} L ${x - 1.5} ${y + 1.5} L ${x - 4} ${y} L ${x - 1.5} ${y - 1.5} Z`}
          fill={color}
          opacity={0.25 + (i % 3) * 0.12}
        />
      ))}
    </svg>
  );
}

function TierFrame({ tier, initials, profileImageUrl }) {
  const style = TIER_STYLES[tier] || TIER_STYLES["arc builder"];

  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <defs>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {tier === "arc legend" ? (
        <g stroke={style.color} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#softGlow)">
          <path d="M 56 10 A 46 46 0 0 1 96 35" />
          <path d="M 102 47 A 46 46 0 0 1 102 59" />
          <path d="M 96 71 A 46 46 0 0 1 56 96" />
          <path d="M 16 96 A 46 46 0 0 1 10 71" />
          <path d="M 10 35 A 46 46 0 0 1 16 10" />
        </g>
      ) : tier === "arc core" ? (
        <>
          <circle cx="56" cy="56" r="46" fill="none" stroke={style.color} strokeWidth="3" filter="url(#softGlow)" />
          <circle cx="56" cy="56" r="51" fill="none" stroke={style.color} strokeWidth="1.5" strokeDasharray="2 5" />
        </>
      ) : (
        <circle cx="56" cy="56" r="46" fill="none" stroke={style.color} strokeWidth="4" filter="url(#softGlow)" />
      )}

      {profileImageUrl ? (
        <>
          <defs>
            <clipPath id="avatarClip">
              <circle cx="56" cy="56" r="37" />
            </clipPath>
          </defs>
          <image
            href={profileImageUrl}
            x="19"
            y="19"
            width="74"
            height="74"
            clipPath="url(#avatarClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <>
          <circle cx="56" cy="56" r="37" fill="#0a1830" />
          <text x="56" y="63" textAnchor="middle" fontSize="20" fontWeight="600" fill="#f5f8fb" fontFamily="Space Grotesk, sans-serif">
            {initials}
          </text>
        </>
      )}
    </svg>
  );
}

const ConvictionCard = forwardRef(function ConvictionCard({ profile, conviction }, ref) {
  const style = TIER_STYLES[conviction.tier] || TIER_STYLES["arc builder"];
  const isLegend = conviction.tier === "arc legend";
  const initials = (profile.displayName || profile.handle || "??")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={ref}
      style={{
        width: 360,
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        padding: 24,
        color: "#f5f8fb",
        fontFamily: "'Space Grotesk', sans-serif",
        background: style.background,
        boxShadow: isLegend
          ? `0 30px 80px -20px rgba(232,163,85,0.3), 0 0 0 1px rgba(232,163,85,0.15)`
          : `0 30px 70px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)`
      }}
    >
      {/* Decorative arch watermark, echoes Arc's own mark, purely atmospheric */}
      <svg
        width="340"
        height="240"
        viewBox="0 0 340 240"
        style={{
          position: "absolute",
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: isLegend ? 0.26 : 0.16,
          pointerEvents: "none"
        }}
      >
        <path
          d="M 90 220 L 90 110 A 80 80 0 0 1 250 110 L 250 220"
          stroke={style.color}
          strokeWidth="34"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {isLegend && <Sparkles color={style.color} />}

      {/* Soft glow behind the avatar, tier colored */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${style.glow} 0%, transparent 70%)`,
          pointerEvents: "none"
        }}
      />

      {/* Fine grain texture for a premium, non-flat surface */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#8fa3b8",
            marginBottom: 20,
            letterSpacing: "0.03em"
          }}
        >
          <span>ARC CONVICTION CARD</span>
          <span>LAST 30 DAYS</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <TierFrame tier={conviction.tier} initials={initials} profileImageUrl={profile.profileImageUrl} />
          <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: "14px 0 0" }}>
            {profile.displayName}
          </p>
          <p style={{ fontSize: 13, color: "#8fa3b8", margin: "2px 0 0" }}>@{profile.handle}</p>
          <div
            style={{
              background: `${style.color}22`,
              color: style.color,
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 18px",
              borderRadius: 999,
              marginTop: 14,
              letterSpacing: "0.02em",
              border: `1px solid ${style.color}44`,
              whiteSpace: "nowrap",
              display: "inline-block",
              width: "fit-content"
            }}
          >
            {style.label}
          </div>
          <p style={{ fontSize: 12, color: "#8fa3b8", fontStyle: "italic", margin: "8px 0 0" }}>{style.tagline}</p>
          <RankDots rank={style.rank} color={style.color} />
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10
          }}
        >
          <StatBox label="conviction score" value={`${conviction.score}%`} accent={style.color} />
          <StatBox label="longest streak" value={`${conviction.streakDays}d`} accent={style.color} />
          <div style={{ gridColumn: "span 2" }}>
            <StatBox
              label="most mentioned (arc terms only)"
              value={conviction.topKeywords.length ? conviction.topKeywords.join(" · ") : "none yet"}
              small
            />
          </div>
        </div>
      </div>
    </div>
  );
});

function StatBox({ label, value, small, accent }) {
  return (
    <div
      style={{
        background: "rgba(4,10,20,0.55)",
        borderRadius: 14,
        padding: 13,
        border: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <p style={{ fontSize: 11, color: "#8fa3b8", margin: "0 0 5px", letterSpacing: "0.02em" }}>{label}</p>
      <p
        style={{
          fontFamily: small ? "inherit" : "'Fraunces', serif",
          fontSize: small ? 14 : 23,
          fontWeight: 600,
          margin: 0,
          color: accent || "#f5f8fb"
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default ConvictionCard;
