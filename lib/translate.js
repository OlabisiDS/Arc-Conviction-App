// Translates non-English posts into English before they hit the content
// classifier, so someone posting in Turkish, Chinese, Portuguese, or
// anything else still gets an accurate breakdown, not just "quick
// update" for everything because the classifier couldn't read it.
//
// This only runs if ANTHROPIC_API_KEY is set. Without a key, posts pass
// through untranslated and classification falls back to punctuation-only
// checks (question marks, links still work in any language), so nothing
// breaks, you just lose the finer categories for non-English posts.

const MODEL = "claude-haiku-4-5-20251001"; // cheapest current model, plenty for translation

async function translateBatch(posts) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || posts.length === 0) return null;

  const numbered = posts.map((p, i) => `${i}: ${p.text}`).join("\n");

  const prompt = `Translate each numbered post into English. Reply with ONLY a JSON array of strings, one translation per post, in the same order, nothing else.\n\n${numbered}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    console.error("Translation call failed:", res.status);
    return null;
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Takes the full tweet list, finds the non-English ones, translates only
 * those in a single batched call (not one call per post), and returns
 * the same tweets with a `textForClassification` field added. English
 * posts get textForClassification === text, no API call needed for them.
 */
async function withTranslations(tweetsWithLang) {
  const nonEnglish = tweetsWithLang.filter((t) => t.lang !== "eng");

  if (nonEnglish.length === 0) {
    return tweetsWithLang.map((t) => ({ ...t, textForClassification: t.text }));
  }

  const translations = await translateBatch(nonEnglish);

  let translationIndex = 0;
  return tweetsWithLang.map((t) => {
    if (t.lang === "eng") return { ...t, textForClassification: t.text };
    const translated = translations?.[translationIndex];
    translationIndex += 1;
    return { ...t, textForClassification: translated || t.text };
  });
}

module.exports = { translateBatch, withTranslations };
