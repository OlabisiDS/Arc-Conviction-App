import { NextResponse } from "next/server";
import { getUserProfileAndTweets } from "../../../lib/twitterApi";
import { scorePosts } from "../../../lib/scoring";
import { analyzeContent } from "../../../lib/analysis";
import { getCachedScan, saveScan, cooldownRemainingMs } from "../../../lib/cache";
import { getReaction } from "../../../lib/reactions";
import { detectLanguage } from "../../../lib/language";
import { withTranslations } from "../../../lib/translate";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const handle = (body.handle || "").trim().replace(/^@/, "");

  if (!handle) {
    return NextResponse.json({ error: "Enter a handle to scan." }, { status: 400 });
  }

  const cached = await getCachedScan(handle);
  if (cached && cached.isFresh) {
    return NextResponse.json({
      ...cached.result,
      reaction: getReaction(cached.result.conviction.tier),
      cached: true,
      scannedAt: cached.scannedAt,
      cooldownRemainingMs: cooldownRemainingMs(cached.scannedAt)
    });
  }

  try {
    const { profile, tweets } = await getUserProfileAndTweets(handle);

    const tweetsWithLang = await Promise.all(
      tweets.map(async (t) => ({ ...t, lang: await detectLanguage(t.text) }))
    );
    const translatedTweets = await withTranslations(tweetsWithLang);

    const conviction = scorePosts(translatedTweets);
    const analysis = analyzeContent(translatedTweets);

    const result = { profile, conviction, analysis, postCount: tweets.length };
    await saveScan(handle, result);

    return NextResponse.json({
      ...result,
      reaction: getReaction(conviction.tier),
      cached: false,
      scannedAt: Date.now(),
      cooldownRemainingMs: cooldownRemainingMs(Date.now())
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Scan failed. Try again in a moment." },
      { status: 500 }
    );
  }
}

