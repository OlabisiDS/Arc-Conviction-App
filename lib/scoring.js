const { countArcMentions, ARC_KEYWORDS } = require("./arcKeywords");

const WEIGHTS = {
  presence: 0.3,
  depth: 0.35,
  resonance: 0.35
};

// No single post can contribute more engagement than this to the
// Resonance score. Without a cap, one lucky viral moment could carry an
// entire score even if someone only posted about Arc twice all month,
// that's luck, not conviction. Sustained decent engagement across many
// posts now beats one spike.
const ENGAGEMENT_CAP_PER_POST = 150;

const TIERS = [
  { name: "arc builder", min: 0, max: 40 },
  { name: "arc core", min: 41, max: 75 },
  { name: "arc legend", min: 76, max: 100 }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Real calendar-date bucketing, not "milliseconds since scan time"
// division. The old approach could split or merge the same real day's
// posts depending on what hour the scan happened to run, this doesn't.
function dayNumber(dateIso) {
  const d = new Date(dateIso);
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor(utcMidnight / 86400000);
}

function scorePosts(tweets) {
  if (!tweets || tweets.length === 0) {
    return {
      score: 0,
      tier: TIERS[0].name,
      streakDays: 0,
      topKeywords: [],
      breakdown: { presence: 0, depth: 0, resonance: 0 }
    };
  }

  const keywordHits = new Map();
  const uniqueKeywordsUsed = new Set();
  let arcPostCount = 0;
  let totalArcMentions = 0;
  let cappedEngagementTotal = 0;
  const arcPostDayNumbers = new Set();

  for (const post of tweets) {
    const { count, matched } = countArcMentions(post.text);

    if (count > 0) {
      arcPostCount += 1;
      totalArcMentions += count;

      const rawEngagement =
        (post.likes || 0) + (post.reposts || 0) * 2 + (post.replies || 0) * 1.5;
      cappedEngagementTotal += Math.min(rawEngagement, ENGAGEMENT_CAP_PER_POST);

      arcPostDayNumbers.add(dayNumber(post.createdAt));

      for (const keyword of matched) {
        keywordHits.set(keyword, (keywordHits.get(keyword) || 0) + 1);
        uniqueKeywordsUsed.add(keyword);
      }
    }
  }

  // 1. Presence, plainly the % of the last 30 days they showed up for
  //    Arc in some form. No curve, no early cap, just the honest number.
  const distinctArcDays = arcPostDayNumbers.size;
  const presenceScore = clamp((distinctArcDays / 30) * 100, 0, 100);

  // 2. Depth, blends how often they mention Arc (frequency) with how
  //    many distinct Arc topics they actually engage with (variety),
  //    so repeating one keyword scores lower than genuine range.
  const avgMentionsPerPost = totalArcMentions / tweets.length;
  const frequencyPart = clamp((avgMentionsPerPost / 0.6) * 100, 0, 100);
  const varietyPart = clamp((uniqueKeywordsUsed.size / Math.min(8, ARC_KEYWORDS.length)) * 100, 0, 100);
  const depthScore = frequencyPart * 0.6 + varietyPart * 0.4;

  // 3. Resonance, average CAPPED engagement per Arc post, scaled
  //    against a healthy baseline of 40 weighted engagement actions.
  const avgCappedEngagement = arcPostCount > 0 ? cappedEngagementTotal / arcPostCount : 0;
  const resonanceScore = clamp((avgCappedEngagement / 40) * 100, 0, 100);

  const finalScore = Math.round(
    presenceScore * WEIGHTS.presence +
      depthScore * WEIGHTS.depth +
      resonanceScore * WEIGHTS.resonance
  );

  const tier = TIERS.find((t) => finalScore >= t.min && finalScore <= t.max) || TIERS[0];

  // Longest streak, real calendar days, consecutive day-numbers.
  const sortedDayNumbers = Array.from(arcPostDayNumbers).sort((a, b) => a - b);
  let streakDays = sortedDayNumbers.length > 0 ? 1 : 0;
  let currentRun = 1;
  for (let i = 1; i < sortedDayNumbers.length; i++) {
    if (sortedDayNumbers[i] === sortedDayNumbers[i - 1] + 1) {
      currentRun += 1;
      streakDays = Math.max(streakDays, currentRun);
    } else {
      currentRun = 1;
    }
  }

  const topKeywords = Array.from(keywordHits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword);

  return {
    score: finalScore,
    tier: tier.name,
    streakDays,
    topKeywords,
    breakdown: {
      presence: Math.round(presenceScore),
      depth: Math.round(depthScore),
      resonance: Math.round(resonanceScore)
    }
  };
}

module.exports = { scorePosts, TIERS, WEIGHTS };
