// Offline language detection, no API call, no cost. Runs on every post
// to decide which ones need translation before classification.

async function detectLanguage(text) {
  if (!text || text.trim().length < 8) return "eng"; // too short to reliably detect
  const { franc } = await import("franc-min");
  const code = franc(text);
  return code === "und" ? "eng" : code; // "und" = undetermined, assume English
}

module.exports = { detectLanguage };
