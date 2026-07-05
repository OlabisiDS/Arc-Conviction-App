const TIERS = [
  { name: "arc builder", color: "#5c8ab8" },
  { name: "arc core", color: "#8fc0e6" },
  { name: "arc legend", color: "#e8a355" }
];

export default function TierLadder({ activeTier }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 8px" }}>
      {TIERS.map((tier, i) => {
        const isActive = activeTier === tier.name;
        return (
          <div key={tier.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${isActive ? tier.color : "rgba(255,255,255,0.12)"}`,
                background: isActive ? `${tier.color}18` : "rgba(255,255,255,0.03)",
                boxShadow: isActive ? `0 0 20px -4px ${tier.color}66` : "none",
                transition: "all 0.2s ease"
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: tier.color,
                  opacity: isActive ? 1 : 0.5
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#f5f8fb" : "#8593a3"
                }}
              >
                {tier.name}
              </span>
            </div>
            {i < TIERS.length - 1 && <span style={{ color: "#4a5a6b", fontSize: 13 }}>&rarr;</span>}
          </div>
        );
      })}
    </div>
  );
}
