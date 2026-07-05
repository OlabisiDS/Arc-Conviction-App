# Arc conviction card

Type any handle, get a scored "Arc conviction" card plus a content analysis
report, both from a single scan. Runs fully on mock data right now, no
API key needed to test it.

## Run it locally

```
npm install
npm run dev
```

Open http://localhost:3000, type any handle, hit scan.

## What's already built

- **Scoring formula** (`lib/scoring.js`), 40% keyword frequency, 35%
  posting consistency, 25% engagement on Arc related posts. Tiers: arc
  builder (0-40), arc core (41-75), arc legend (76-100).
- **Tier ladder**, always visible, shows the rank order and lights up
  the person's own tier after a scan.
- **Tier reaction message**, a short line reacting to the tier, shown
  separately from the card so it does not clutter the shareable image.
- **100-post hard cap** on every scan, enforced regardless of provider,
  keeps cost per person fixed and predictable.
- **3-day cooldown and cache** (`lib/cache.js`), a handle scanned in the
  last 3 days returns its saved result instantly instead of rescanning.
  Works out of the box with a local file, and automatically switches to
  Supabase the moment `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
  set, same function names either way, nothing else to change.
- **Profile analysis** (`lib/analysis.js`), organized as three bullet
  sections: what's working, needs improvement, suggestion. Every bullet
  comes from real computed stats on that account's actual posts, not a
  template.
- **Multilingual support**, see below.
- **Card UI** (`components/ConvictionCard.jsx`), tier colored frame,
  downloadable as a PNG.
- **Save and mint buttons**, save works right now with zero setup. Mint
  needs Circle configured, see the Circle section below.

## Multilingual profile analysis

Posts in Turkish, Chinese, Portuguese, or anything else are detected
automatically (`lib/language.js`, offline, free, no API call) and, if
`ANTHROPIC_API_KEY` is set, translated into English before hitting the
content classifier (`lib/translate.js`). This is one batched call per
scan, not one call per post, so cost stays low.

Without a key, non-English posts still get scanned and scored (the Arc
keyword matching in `lib/scoring.js` is unaffected either way, since
crypto terms usually stay in Latin script regardless of language), they
just fall back to punctuation-only classification (questions and links
still detect correctly in any language, the finer categories like "hot
take" or "announcement" only work reliably once translated).

Cost if you turn it on: translation uses Claude Haiku, the cheapest
current model. A typical batch of non-English posts in one scan runs
a fraction of a cent, translation only happens for the posts that need
it, English posts skip this step entirely.

## Going live, what you still need to do

1. **Pick a Twitter data provider and get a key.** Sign up for GetXAPI
   or TwitterAPI.io (start with GetXAPI, it's the cheaper one at your
   volume).
2. **Update `.env.local`** (copy `.env.example`):
   ```
   TWITTER_API_PROVIDER=getxapi
   GETXAPI_KEY=your_key_here
   ```
3. **Add Supabase**, so cached scans survive redeploys and work across
   multiple server instances (the file-based fallback only works for a
   single server). Create a free project at supabase.com, then in the
   SQL editor run:
   ```sql
   create table scans (
     handle text primary key,
     result jsonb not null,
     scanned_at bigint not null
   );
   ```
   Then add to `.env.local`:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   Both values are on your project's Settings > API page. The app
   switches over automatically, no code changes needed.
4. **Deploy** to Vercel or Netlify.
5. **Circle setup**, for the mint button, see below.

## Circle setup, for the mint button

The mint flow uses two real Circle products: Circle Wallets (so each
person gets their own wallet with just a PIN, no seed phrase) and
Circle Contracts (an audited NFT template, not custom Solidity).

**Part 1, Circle Wallets:**

1. Create a Circle developer account and get an API key from the
   [Circle Developer Console](https://console.circle.com).
2. In the console, set up a User-Controlled Wallets configuration and
   copy your **App ID**.
3. Add both to `.env.local`:
   ```
   CIRCLE_API_KEY=your_key_here
   CIRCLE_APP_ID=your_app_id_here
   ```

That's it for wallets. `lib/circleWallet.js` handles creating a Circle
user per handle, starting the PIN setup challenge, and later fetching
the wallet address once it exists.

**Part 2, Circle Contracts (the badge itself):**

1. In the Circle Console, go to the **Templates** tab and deploy the
   ERC-721 NFT template on **ARC-TESTNET**. Circle recommends this
   Console path over the API for a first deployment, it needs fewer
   prerequisites. You'll need a Developer-Controlled wallet as the
   deploying/admin wallet, the console walks you through creating one
   if you don't have it yet.
2. Once deployed, copy the contract address and your admin wallet ID.
3. Generate and register an entity secret (the console links to this
   step, it's a one-time setup for Developer-Controlled Wallets).
4. Add all three to `.env.local`:
   ```
   CIRCLE_ENTITY_SECRET=your_entity_secret_here
   CIRCLE_BADGE_CONTRACT_ADDRESS=0x_your_deployed_contract_address
   CIRCLE_ADMIN_WALLET_ID=your_admin_wallet_id
   ```

Once both parts are in place, clicking "mint on testnet" will:

1. Create a Circle wallet for that handle (first time only) and pop up
   Circle's own PIN setup UI, this is the actual wallet popup, not a
   placeholder.
2. Once confirmed, fetch that new wallet's address.
3. Mint the badge NFT to it, paid for by your admin wallet, using
   Circle's audited ERC-721 template rather than custom code.

If any of the mint API calls throw an unexpected error, the exact SDK
method names (`listWallets`, `createUserToken`, `createUserPinWithWallets`)
are worth double checking against Circle's current docs, since SDKs do
evolve. The `createContractExecutionTransaction` call is confirmed
directly from Circle's own interact-with-a-contract quickstart, so that
one should be solid as written.

## Notes

- The 100-tweet cap lives in `lib/twitterApi.js` (`MAX_POSTS_PER_SCAN`).
- Arc's real brand colors (navy `#143453`, white, warm amber accent) are
  applied throughout `app/globals.css` and the card component.
- No em dashes anywhere in this app, on purpose.
