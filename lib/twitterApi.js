const { ARC_KEYWORDS } = require("./arcKeywords");

const MAX_POSTS_PER_SCAN = 100; // hard cap, keeps per-user cost fixed and known

/**
 * Every provider implements the same shape:
 *   { profile: { handle, displayName, profileImageUrl }, tweets: [{ text, createdAt, likes, reposts, replies }] }
 *
 * To add a new provider, write one function here and add it to the
 * PROVIDERS map at the bottom. Nothing else in the app needs to change.
 */

async function fetchFromGetXAPI(handle) {
  const key = process.env.GETXAPI_KEY;
  if (!key) throw new Error("GETXAPI_KEY is not set in .env.local");

  const userRes = await fetch(
    `https://api.getxapi.com/twitter/user/info?username=${encodeURIComponent(handle)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!userRes.ok) throw new Error(`GetXAPI user lookup failed: ${userRes.status}`);
  const userData = await userRes.json();

  const tweetsRes = await fetch(
    `https://api.getxapi.com/twitter/user/last_tweets?username=${encodeURIComponent(
      handle
    )}&count=${MAX_POSTS_PER_SCAN}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!tweetsRes.ok) throw new Error(`GetXAPI tweet fetch failed: ${tweetsRes.status}`);
  const tweetsData = await tweetsRes.json();

  return {
    profile: {
      handle,
      displayName: userData.name || handle,
      profileImageUrl: userData.profile_image_url || null
    },
    tweets: (tweetsData.tweets || []).map((t) => ({
      text: t.text || "",
      createdAt: t.created_at,
      likes: t.like_count || 0,
      reposts: t.retweet_count || 0,
      replies: t.reply_count || 0
    }))
  };
}

async function fetchFromTwitterApiIo(handle) {
  const key = process.env.TWITTERAPI_IO_KEY;
  if (!key) throw new Error("TWITTERAPI_IO_KEY is not set in .env.local");

  const userRes = await fetch(
    `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(handle)}`,
    { headers: { "X-API-Key": key } }
  );
  if (!userRes.ok) throw new Error(`TwitterAPI.io user lookup failed: ${userRes.status}`);
  const userData = await userRes.json();

  const tweetsRes = await fetch(
    `https://api.twitterapi.io/twitter/user/last_tweets?userName=${encodeURIComponent(
      handle
    )}&count=${MAX_POSTS_PER_SCAN}`,
    { headers: { "X-API-Key": key } }
  );
  if (!tweetsRes.ok) throw new Error(`TwitterAPI.io tweet fetch failed: ${tweetsRes.status}`);
  const tweetsData = await tweetsRes.json();

  return {
    profile: {
      handle,
      displayName: userData.name || handle,
      profileImageUrl: userData.profile_image_url || null
    },
    tweets: (tweetsData.tweets || []).map((t) => ({
      text: t.text || "",
      createdAt: t.createdAt,
      likes: t.likeCount || 0,
      reposts: t.retweetCount || 0,
      replies: t.replyCount || 0
    }))
  };
}

// Deterministic mock so the same handle always gets the same demo result,
// lets you test the whole app (scoring, card, cache, cooldown) before any
// API key exists.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return function next() {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

async function fetchFromMock(handle) {
  const rand = seededRandom(handle.toLowerCase());
  const postCount = Math.floor(rand() * 60) + 10; // 10-70 posts, realistic 30-day range
  const arcTerms = ARC_KEYWORDS;
  const fillerTopics = [
    "morning coffee thoughts",
    "just shipped a small fix",
    "watching the match tonight",
    "grateful for this community",
    "debugging until 3am again",
    "video editing session done",
    "GM everyone",
    "learning something new today"
  ];

  const tweets = Array.from({ length: postCount }).map((_, i) => {
    const isArcPost = rand() < 0.55; // mock accounts skew Arc-active for a good demo
    const daysAgo = Math.floor(rand() * 30);
    const text = isArcPost
      ? `${arcTerms[Math.floor(rand() * arcTerms.length)]} update: ${
          fillerTopics[Math.floor(rand() * fillerTopics.length)]
        }`
      : fillerTopics[Math.floor(rand() * fillerTopics.length)];

    return {
      text,
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      likes: Math.floor(rand() * 200),
      reposts: Math.floor(rand() * 40),
      replies: Math.floor(rand() * 25)
    };
  });

  return {
    profile: {
      handle,
      displayName: handle,
      profileImageUrl: null
    },
    tweets
  };
}

const PROVIDERS = {
  getxapi: fetchFromGetXAPI,
  twitterapi: fetchFromTwitterApiIo,
  mock: fetchFromMock
};

async function getUserProfileAndTweets(handle) {
  const provider = process.env.TWITTER_API_PROVIDER || "mock";
  const fetcher = PROVIDERS[provider];
  if (!fetcher) {
    throw new Error(
      `Unknown TWITTER_API_PROVIDER "${provider}". Use "mock", "getxapi", or "twitterapi".`
    );
  }
  const result = await fetcher(handle);
  // Enforce the cap regardless of provider, so cost never depends on how
  // active a single account is.
  result.tweets = result.tweets.slice(0, MAX_POSTS_PER_SCAN);
  return result;
}

module.exports = { getUserProfileAndTweets, MAX_POSTS_PER_SCAN };
