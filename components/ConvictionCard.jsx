"use client";

import { forwardRef } from "react";

const TIER_STYLES = {
  "arc builder": { color: "#5c8ab8", label: "arc builder" },
  "arc core": { color: "#8fc0e6", label: "arc core" },
  "arc legend": { color: "#e8a355", label: "arc legend" }
};

function TierFrame({ tier, initials, profileImageUrl }) {
  const style = TIER_STYLES[tier] || TIER_STYLES["arc builder"];

  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      <defs>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {tier === "arc legend" ? (
        <g stroke={style.color} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#softGlow)">
          <path d="M 52 8 A 44 44 0 0 1 90 32" />
          <path d="M 96 44 A 44 44 0 0 1 96 56" />
          <path d="M 90 68 A 44 44 0 0 1 52 92" />
          <path d="M 12 92 A 44 44 0 0 1 6 68" />
          <path d="M 6 32 A 44 44 0 0 1 12 8" />
        </g>
      ) : tier === "arc core" ? (
        <>
          <circle cx="52" cy="52" r="44" fill="none" stroke={style.color} strokeWidth="3" />
          <circle cx="52" cy="52" r="49" fill="none" stroke={style.color} strokeWidth="1.5" strokeDasharray="2 5" />
        </>
      ) : (
        <circle cx="52" cy="52" r="44" fill="none" stroke={style.color} strokeWidth="4" />
      )}

      {profileImageUrl ? (
        <>
          <defs>
            <clipPath id="avatarClip">
              <circle cx="52" cy="52" r="36" />
            </clipPath>
          </defs>
          <image
            href={profileImageUrl}
            x="16"
            y="16"
            width="72"
            height="72"
            clipPath="url(#avatarClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <>
          <circle cx="52" cy="52" r="36" fill="#0a1830" />
          <text x="52" y="59" textAnchor="middle" fontSize="19" fontWeight="600" fill="#f5f8fb" fontFamily="Space Grotesk, sans-serif">
            {initials}
          </text>
        </>
      )}
    </svg>
  );
}

const ConvictionCard = forwardRef(function ConvictionCard({ profile, conviction, postCount }, ref) {
  const style = TIER_STYLES[conviction.tier] || TIER_STYLES["arc builder"];
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
        background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: 24,
        color: "#f5f8fb",
        fontFamily: "'Space Grotesk', sans-serif",
        backdropFilter: "blur(20px)",
        boxShadow: `0 24px 60px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.02), 0 0 40px -10px ${style.color}33`
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8593a3", marginBottom: 18, letterSpacing: "0.03em" }}>
        <span>ARC CONVICTION CARD</span>
        <span>LAST {postCount} POSTS</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <TierFrame tier={conviction.tier} initials={initials} profileImageUrl={profile.profileImageUrl} />
        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: "12px 0 0" }}>
          {profile.displayName}
        </p>
        <p style={{ fontSize: 13, color: "#8593a3", margin: "2px 0 0" }}>@{profile.handle}</p>
        <div
          style={{
            background: `${style.color}20`,
            color: style.color,
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 16px",
            borderRadius: 999,
            marginTop: 12,
            letterSpacing: "0.02em"
          }}
        >
          {style.label}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 16,
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
  );
});

function StatBox({ label, value, small, accent }) {
  return (
    <div style={{ background: "rgba(6,15,28,0.55)", borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
      <p style={{ fontSize: 11, color: "#7f92a6", margin: "0 0 5px", letterSpacing: "0.02em" }}>{label}</p>
      <p style={{ fontFamily: small ? "inherit" : "'Fraunces', serif", fontSize: small ? 14 : 22, fontWeight: 600, margin: 0, color: accent || "#f5f8fb" }}>
        {value}
      </p>
    </div>
  );
}

export default ConvictionCard;
