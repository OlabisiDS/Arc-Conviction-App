const { ARC_KEYWORDS } = require("./arcKeywords");

const MAX_POSTS_PER_SCAN = 100; // hard cap, keeps per-user cost fixed and known
const WINDOW_DAYS = 30; // the card and analysis are always framed as "last 30 days"
const FETCH_TIMEOUT_MS = 8000; // no single network call is allowed to hang the whole scan
const MAX_PAGES = 6; // hard ceiling on pagination loops, regardless of what any API returns

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

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

  const userRes = await fetchWithTimeout(
    `https://api.getxapi.com/twitter/user/info?userName=${encodeURIComponent(handle)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!userRes.ok) throw new Error(`GetXAPI user lookup failed: ${userRes.status}`);
  const userJson = await userRes.json();
  const userData = userJson.data || {};
  const pinnedIds = new Set(userData.pinnedTweetIds || []);

  const windowCutoff = Date.now() - WINDOW_DAYS * 86400000;

  // Each call returns ~20 tweets, newest first. Page through with the
  // cursor until we hit MAX_POSTS_PER_SCAN, run out of posts, or cross
  // the 30-day window, whichever comes first (also saves cost, since we
  // stop calling the API the moment results go stale).
  const tweets = [];
  let cursor = null;
  let pageCount = 0;

  while (tweets.length < MAX_POSTS_PER_SCAN && pageCount < MAX_PAGES) {
    pageCount += 1;
    const url = new URL("https://api.getxapi.com/twitter/user/tweets");
    url.searchParams.set("userName", handle);
    if (cursor) url.searchParams.set("cursor", cursor);

    const tweetsRes = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!tweetsRes.ok) throw new Error(`GetXAPI tweet fetch failed: ${tweetsRes.status}`);
    const page = await tweetsRes.json();

    let hitWindowEdge = false;
    for (const t of page.tweets || []) {
      if (pinnedIds.has(t.id)) continue; // pinned posts skew "recent activity", exclude them

      const createdAtMs = new Date(t.createdAt).getTime();
      if (createdAtMs < windowCutoff) {
        hitWindowEdge = true;
        break;
      }

      tweets.push({
        text: t.text || "",
        createdAt: t.createdAt,
        likes: t.likeCount || 0,
        reposts: t.retweetCount || 0,
        replies: t.replyCount || 0
      });
    }

    if (hitWindowEdge || !page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }

  return {
    profile: {
      handle,
      displayName: userData.name || handle,
      profileImageUrl: userData.profilePicture || null
    },
    tweets
  };
}

async function fetchFromTwitterApiIo(handle) {
  const key = process.env.TWITTERAPI_IO_KEY;
  if (!key) throw new Error("TWITTERAPI_IO_KEY is not set in .env.local");

  const userRes = await fetchWithTimeout(
    `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(handle)}`,
    { headers: { "X-API-Key": key } }
  );
  if (!userRes.ok) throw new Error(`TwitterAPI.io user lookup failed: ${userRes.status}`);
  const userData = await userRes.json();

  const tweetsRes = await fetchWithTimeout(
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

  // Belt-and-suspenders window filter, applies regardless of provider,
  // so "last 30 days" is always actually true, not just a label.
  const windowCutoff = Date.now() - WINDOW_DAYS * 86400000;
  result.tweets = result.tweets.filter((t) => new Date(t.createdAt).getTime() >= windowCutoff);

  // Enforce the cap regardless of provider, so cost never depends on how
  // active a single account is.
  result.tweets = result.tweets.slice(0, MAX_POSTS_PER_SCAN);
  return result;
}

module.exports = { getUserProfileAndTweets, MAX_POSTS_PER_SCAN, WINDOW_DAYS };
