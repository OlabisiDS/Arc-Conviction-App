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
  const debug = Boolean(body.debug);

  if (!handle) {
    return NextResponse.json({ error: "Enter a handle to scan." }, { status: 400 });
  }

  // Debug mode always does a fresh pull, no point inspecting stale
  // cached data when the whole point is checking what's live right now.
  if (!debug) {
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

    const response = {
      ...result,
      reaction: getReaction(conviction.tier),
      cached: false,
      scannedAt: Date.now(),
      cooldownRemainingMs: cooldownRemainingMs(Date.now())
    };

    if (debug) {
      const { countArcMentions } = require("../../../lib/arcKeywords");
      response.debugPosts = translatedTweets.map((t) => {
        const { count, matched } = countArcMentions(t.text);
        return {
          createdAt: t.createdAt,
          textPreview: t.text.slice(0, 100),
          arcMentionCount: count,
          matchedKeywords: matched,
          likes: t.likes,
          reposts: t.reposts,
          replies: t.replies,
          isRetweet: /^rt @/i.test(t.text.trim())
        };
      });
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Scan failed. Try again in a moment." },
      { status: 500 }
    );
  }
}

