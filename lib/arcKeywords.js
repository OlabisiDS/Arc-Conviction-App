// Every term here counts toward "Arc conviction". Add or remove freely,
// this list is the single place that defines what counts as an Arc mention.
const ARC_KEYWORDS = [
  "arc",
  "arc network",
  "arc testnet",
  "arc mainnet",
  "circle",
  "usdc",
  "eurc",
  "cctp",
  "malachite",
  "arcsentry",
  "arcpact",
  "stablecoin",
  "stablechain",
  "economic os",
  "arc house",
  "arc builder"
];

// Words that are too generic on their own (avoid false-positive matches
// inside unrelated words, e.g. "arc" inside "march" or "search")
const WORD_BOUNDARY_KEYWORDS = new Set(["arc", "usdc", "eurc", "cctp"]);

function normalize(text) {
  return text.toLowerCase();
}

function countArcMentions(text) {
  const normalized = normalize(text);
  let count = 0;
  const matched = new Set();

  for (const keyword of ARC_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = WORD_BOUNDARY_KEYWORDS.has(keyword)
      ? new RegExp(`\\b${escaped}\\b`, "g")
      : new RegExp(escaped, "g");

    const matches = normalized.match(pattern);
    if (matches) {
      count += matches.length;
      matched.add(keyword);
    }
  }

  return { count, matched: Array.from(matched) };
}

module.exports = { ARC_KEYWORDS, countArcMentions };
