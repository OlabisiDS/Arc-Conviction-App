const { countArcMentions } = require("./arcKeywords");

const WEIGHTS = {
  keywordFrequency: 0.35,
  consistency: 0.3,
  engagement: 0.35
};

const TIERS = [
  { name: "arc builder", min: 0, max: 40 },
  { name: "arc core", min: 41, max: 75 },
  { name: "arc legend", min: 76, max: 100 }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function daysBetween(dateA, dateB) {
  return Math.floor(Math.abs(dateA - dateB) / 86400000);
}

function scorePosts(tweets) {
  if (!tweets || tweets.length === 0) {
    return {
      score: 0,
      tier: TIERS[0].name,
      streakDays: 0,
      topKeywords: [],
      breakdown: { keywordFrequency: 0, consistency: 0, engagement: 0 }
    };
  }

  const now = new Date();
  const keywordHits = new Map();
  let arcPostCount = 0;
  let totalArcMentions = 0;
  let arcEngagement = 0;
  const postDays = new Set();
  const arcPostDates = [];

  for (const post of tweets) {
    const { count, matched } = countArcMentions(post.text);
    const createdAt = new Date(post.createdAt);
    postDays.add(Math.floor((now - createdAt) / 86400000));

    if (count > 0) {
      arcPostCount += 1;
      totalArcMentions += count;
      arcEngagement += (post.likes || 0) + (post.reposts || 0) * 2 + (post.replies || 0) * 1.5;
      arcPostDates.push(createdAt);
      for (const keyword of matched) {
        keywordHits.set(keyword, (keywordHits.get(keyword) || 0) + 1);
      }
    }
  }

  // 1. Keyword frequency, average Arc mentions per post, scaled so
  //    ~0.6 mentions/post already reads as full conviction.
  const avgMentionsPerPost = totalArcMentions / tweets.length;
  const keywordFrequencyScore = clamp((avgMentionsPerPost / 0.6) * 100, 0, 100);

  // 2. Consistency, how many distinct days (of the last 30) had an Arc
  //    post, not just raw volume. Spread beats a single burst.
  const distinctArcDays = new Set(
    arcPostDates.map((d) => Math.floor((now - d) / 86400000))
  ).size;
  const consistencyScore = clamp((distinctArcDays / 20) * 100, 0, 100); // 20+ active days = full score

  // 3. Engagement, average engagement per Arc post, scaled against a
  //    reasonable "healthy" baseline of 40 weighted engagement actions.
  const avgArcEngagement = arcPostCount > 0 ? arcEngagement / arcPostCount : 0;
  const engagementScore = clamp((avgArcEngagement / 40) * 100, 0, 100);

  const finalScore = Math.round(
    keywordFrequencyScore * WEIGHTS.keywordFrequency +
      consistencyScore * WEIGHTS.consistency +
      engagementScore * WEIGHTS.engagement
  );

  const tier = TIERS.find((t) => finalScore >= t.min && finalScore <= t.max) || TIERS[0];

  // Posting streak, longest run of consecutive days with at least one
  // Arc-related post, anywhere in the window (not just starting today,
  // since "today" being quiet doesn't erase a real streak).
  const sortedDaysAgo = Array.from(
    new Set(arcPostDates.map((d) => Math.floor((now - d) / 86400000)))
  ).sort((a, b) => a - b);
  let streakDays = sortedDaysAgo.length > 0 ? 1 : 0;
  let currentRun = 1;
  for (let i = 1; i < sortedDaysAgo.length; i++) {
    if (sortedDaysAgo[i] === sortedDaysAgo[i - 1] + 1) {
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
      keywordFrequency: Math.round(keywordFrequencyScore),
      consistency: Math.round(consistencyScore),
      engagement: Math.round(engagementScore)
    }
  };
}

module.exports = { scorePosts, TIERS, WEIGHTS };
