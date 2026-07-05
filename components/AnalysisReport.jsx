export default function AnalysisReport({ analysis }) {
  if (!analysis.hasData) {
    return (
      <div style={panelStyle}>
        <p style={{ margin: 0, color: "#b9c7d6" }}>{analysis.suggestions[0]}</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <p style={{ fontSize: 12, color: "#7f92a6", margin: "0 0 4px", letterSpacing: "0.03em" }}>
        PROFILE ANALYSIS
      </p>
      <p
        style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 20,
          margin: "0 0 20px",
          color: "#f6cf9a"
        }}
      >
        what your account is showing right now
      </p>

      <Section title="what's working" color="#7fd6a3" items={analysis.workingWell} />
      <Section title="needs improvement" color="#e8956a" items={analysis.needsImprovement} />
      <Section title="suggestion" color="#e8a355" items={analysis.suggestions} last />
    </div>
  );
}

function Section({ title, color, items, last }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color, margin: "0 0 8px", letterSpacing: "0.03em" }}>
        {title.toUpperCase()}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 14, lineHeight: 1.55, color: "#c9d4de" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const panelStyle = {
  width: 360,
  background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 20,
  padding: 24,
  marginTop: 20,
  backdropFilter: "blur(20px)",
  boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)"
};
