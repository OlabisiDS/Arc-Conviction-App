const fs = require("fs");
const path = require("path");

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scans.json");

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---- File-based fallback (no setup required, works out of the box) ----

function readFileStore() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeFileStore(store) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

async function getCachedScanFromFile(handle) {
  const store = readFileStore();
  const record = store[handle.toLowerCase()];
  if (!record) return null;
  return { ...record, isFresh: Date.now() - record.scannedAt < COOLDOWN_MS };
}

async function saveScanToFile(handle, result) {
  const store = readFileStore();
  store[handle.toLowerCase()] = { result, scannedAt: Date.now() };
  writeFileStore(store);
}

// ---- Supabase (used automatically once SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set, same function names either way) ----
//
// Run this once in the Supabase SQL editor before using it:
//
// create table scans (
//   handle text primary key,
//   result jsonb not null,
//   scanned_at bigint not null
// );

async function getCachedScanFromSupabase(handle) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("scans")
    .select("result, scanned_at")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;

  return {
    result: data.result,
    scannedAt: data.scanned_at,
    isFresh: Date.now() - data.scanned_at < COOLDOWN_MS
  };
}

async function saveScanToSupabase(handle, result) {
  const supabase = getSupabaseClient();
  await supabase.from("scans").upsert({
    handle: handle.toLowerCase(),
    result,
    scanned_at: Date.now()
  });
}

// ---- Public interface, picks the backend automatically ----

async function getCachedScan(handle) {
  return isSupabaseConfigured()
    ? getCachedScanFromSupabase(handle)
    : getCachedScanFromFile(handle);
}

async function saveScan(handle, result) {
  return isSupabaseConfigured()
    ? saveScanToSupabase(handle, result)
    : saveScanToFile(handle, result);
}

function cooldownRemainingMs(scannedAt) {
  return Math.max(0, COOLDOWN_MS - (Date.now() - scannedAt));
}

module.exports = { getCachedScan, saveScan, cooldownRemainingMs, COOLDOWN_MS, isSupabaseConfigured };
