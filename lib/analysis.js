// Content-type classification is about FORMAT, not topic. This has to
// work the same whether someone posts about Arc constantly or never
// mentions it. Topic scoring lives in scoring.js and never touches this.

function classifyPost(text) {
  const lower = text.toLowerCase();
  if (lower.includes("?")) return "question";
  if (/https?:\/\//.test(lower)) return "link share";
  if (/(unpopular opinion|hot take|imo|controversial)/.test(lower)) return "hot take";
  if (/(launched|shipped|excited to announce|introducing|just released)/.test(lower)) {
    return "announcement";
  }
  if (text.length > 180) return "long-form thought";
  return "quick update";
}

function weightedEngagement(post) {
  return (post.likes || 0) + (post.reposts || 0) * 2 + (post.replies || 0) * 1.5;
}

function hourBucket(dateIso) {
  const hour = new Date(dateIso).getUTCHours();
  if (hour < 6) return "late night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function isWeekend(dateIso) {
  const day = new Date(dateIso).getUTCDay();
  return day === 0 || day === 6;
}

function average(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function analyzeContent(tweets) {
  if (!tweets || tweets.length === 0) {
    return {
      hasData: false,
      workingWell: [],
      needsImprovement: [],
      suggestions: ["No posts found in this window, so there is nothing to analyze yet."]
    };
  }

  const byType = {};
  const byWindow = {};
  const weekdayEngagement = [];
  const weekendEngagement = [];
  const allEngagements = [];

  const sorted = [...tweets].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  for (const post of sorted) {
    const type = classifyPost(post.textForClassification || post.text);
    const engagement = weightedEngagement(post);
    allEngagements.push(engagement);

    if (!byType[type]) byType[type] = { count: 0, total: 0 };
    byType[type].count += 1;
    byType[type].total += engagement;

    const window = hourBucket(post.createdAt);
    if (!byWindow[window]) byWindow[window] = { count: 0, total: 0 };
    byWindow[window].count += 1;
    byWindow[window].total += engagement;

    if (isWeekend(post.createdAt)) weekendEngagement.push(engagement);
    else weekdayEngagement.push(engagement);
  }

  const typeStats = Object.entries(byType)
    .map(([type, v]) => ({
      type,
      count: v.count,
      share: pct(v.count, tweets.length),
      avgEngagement: Math.round(v.total / v.count)
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const windowStats = Object.entries(byWindow)
    .map(([window, v]) => ({
      window,
      count: v.count,
      avgEngagement: Math.round(v.total / v.count)
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const overallAvg = Math.round(average(allEngagements));
  const bestType = typeStats[0];
  const worstType = typeStats[typeStats.length - 1];
  const bestWindow = windowStats[0];

  const avgWeekday = Math.round(average(weekdayEngagement));
  const avgWeekend = Math.round(average(weekendEngagement));

  const midpoint = new Date(
    (new Date(sorted[0].createdAt).getTime() +
      new Date(sorted[sorted.length - 1].createdAt).getTime()) /
      2
  );
  const firstHalfCount = sorted.filter((p) => new Date(p.createdAt) < midpoint).length;
  const secondHalfCount = sorted.length - firstHalfCount;

  let longestGapDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (new Date(sorted[i].createdAt) - new Date(sorted[i - 1].createdAt)) / 86400000;
    longestGapDays = Math.max(longestGapDays, gap);
  }

  const topPost = sorted.reduce(
    (best, p) => (weightedEngagement(p) > weightedEngagement(best) ? p : best),
    sorted[0]
  );

  const { workingWell, needsImprovement, suggestions } = buildBullets({
    tweets,
    bestType,
    worstType,
    bestWindow,
    overallAvg,
    avgWeekday,
    avgWeekend,
    firstHalfCount,
    secondHalfCount,
    longestGapDays,
    topPost
  });

  return {
    hasData: true,
    typeStats,
    windowStats,
    bestType: bestType?.type,
    bestWindow: bestWindow?.window,
    overallAvg,
    workingWell,
    needsImprovement,
    suggestions
  };
}

function buildBullets(stats) {
  const {
    bestType,
    worstType,
    bestWindow,
    avgWeekday,
    avgWeekend,
    firstHalfCount,
    secondHalfCount,
    longestGapDays,
    topPost
  } = stats;

  const workingWell = [];
  const needsImprovement = [];
  const suggestions = [];

  if (bestType && bestType.count >= 2) {
    workingWell.push(
      `"${bestType.type}" posts are your strongest format, averaging ${bestType.avgEngagement} engagement across ${bestType.count} posts.`
    );
    suggestions.push(
      `Post more "${bestType.type}" content. It is already outperforming everything else you post.`
    );
  }

  if (bestWindow) {
    workingWell.push(`Posts you put out in the ${bestWindow.window} consistently get the most engagement.`);
    suggestions.push(`Save your best content for the ${bestWindow.window}, that is your strongest window.`);
  }

  if (avgWeekday > 0 && avgWeekend > 0) {
    const stronger = avgWeekday >= avgWeekend ? "weekdays" : "weekends";
    workingWell.push(`You perform better on ${stronger} than the rest of the week.`);
  }

  if (secondHalfCount > firstHalfCount) {
    workingWell.push("Your posting pace has picked up recently compared to earlier in this window.");
  }

  if (topPost) {
    const preview = topPost.text.length > 60 ? `${topPost.text.slice(0, 60)}...` : topPost.text;
    workingWell.push(`Your standout post: "${preview}"`);
  }

  if (worstType && worstType.type !== bestType?.type && worstType.count >= 2) {
    needsImprovement.push(
      `"${worstType.type}" posts are your weakest format, averaging only ${worstType.avgEngagement} engagement.`
    );
    suggestions.push(`Cut back on "${worstType.type}" posts or pair them with a stronger hook.`);
  }

  if (secondHalfCount < firstHalfCount) {
    needsImprovement.push("Your posting pace has slowed down recently.");
    suggestions.push("Pick the pace back up. Consistency is part of what is being scored.");
  }

  if (longestGapDays >= 5) {
    needsImprovement.push(
      `There was a stretch of ${Math.round(longestGapDays)} days with no posts at all.`
    );
    suggestions.push("Avoid long silent gaps. Even a short low effort post beats going quiet.");
  }

  if (needsImprovement.length === 0) {
    needsImprovement.push("Nothing major standing out as a weak point right now.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Keep doing what you are doing and stay consistent.");
  }

  return { workingWell, needsImprovement, suggestions };
}

module.exports = { analyzeContent, classifyPost };
