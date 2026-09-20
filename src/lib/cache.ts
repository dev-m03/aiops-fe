import { loadSettings } from "./settings";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  userId: string;
  sizeBytes: number;
}

const CACHE_PREFIX = "aiops_cache_";

// In-memory tracker to know if a fresh network fetch was performed after page load/refresh
let hasRefetchedThisSession = false;

export function markSessionRefetched() {
  hasRefetchedThisSession = true;
}

export function isSessionRefreshed(): boolean {
  return !hasRefetchedThisSession;
}

export function resetSessionRefetchState() {
  hasRefetchedThisSession = false;
}

function calculateByteSize(str: string): number {
  try {
    return new Blob([str]).size;
  } catch {
    return str.length;
  }
}

export function getCachedData<T>(userId: string, key: string): T | null {
  if (typeof window === "undefined" || !userId) return null;

  const settings = loadSettings();
  if (!settings.offlineMode) {
    return null;
  }

  try {
    const fullKey = `${CACHE_PREFIX}${userId}_${key}`;
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Verify user ownership to prevent cross-account cache leakage
    if (entry.userId !== userId) {
      localStorage.removeItem(fullKey);
      return null;
    }

    // Verify expiration based on duration
    const now = Date.now();
    if (now > entry.expiresAt) {
      localStorage.removeItem(fullKey);
      return null;
    }

    return entry.data;
  } catch (err) {
    console.warn(`Failed to read cache for ${key}:`, err);
    return null;
  }
}

export function setCachedData<T>(userId: string, key: string, data: T): void {
  if (typeof window === "undefined" || !userId) return;

  const settings = loadSettings();
  if (!settings.offlineMode) return;

  try {
    const now = Date.now();
    const durationMs = (settings.cacheDurationMinutes || 60) * 60 * 1000;
    const expiresAt = now + durationMs;

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      userId,
      sizeBytes: 0,
    };

    const serialized = JSON.stringify(entry);
    const sizeBytes = calculateByteSize(serialized);
    entry.sizeBytes = sizeBytes;

    // Check if single payload or total exceeds allowed cache size
    if (sizeBytes > settings.cacheSizeBytes) {
      console.warn(`Payload size exceeds configured limit`);
      return;
    }

    // Clean up expired or oversized entries for this user before storing
    enforceUserCacheQuota(userId, sizeBytes, settings.cacheSizeBytes);

    const fullKey = `${CACHE_PREFIX}${userId}_${key}`;
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (err) {
    console.warn(`Failed to write cache for ${key}:`, err);
  }
}

function enforceUserCacheQuota(userId: string, incomingBytes: number, maxBytes: number) {
  try {
    let totalBytes = 0;
    const userKeys: { key: string; timestamp: number; size: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}${userId}_`)) {
        const val = localStorage.getItem(key);
        if (val) {
          const size = calculateByteSize(val);
          totalBytes += size;
          try {
            const parsed = JSON.parse(val);
            userKeys.push({ key, timestamp: parsed.timestamp || 0, size });
          } catch {
            userKeys.push({ key, timestamp: 0, size });
          }
        }
      }
    }

    // If total + incoming exceeds max limit, remove oldest entries
    if (totalBytes + incomingBytes > maxBytes) {
      userKeys.sort((a, b) => a.timestamp - b.timestamp);
      while (userKeys.length > 0 && totalBytes + incomingBytes > maxBytes) {
        const oldest = userKeys.shift();
        if (oldest) {
          localStorage.removeItem(oldest.key);
          totalBytes -= oldest.size;
        }
      }
    }
  } catch (err) {
    console.warn("Error enforcing cache quota:", err);
  }
}

export function clearUserCache(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        if (!userId || key.startsWith(`${CACHE_PREFIX}${userId}_`)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Failed to clear user cache:", err);
  }
}

export function clearAllCache(): void {
  clearUserCache();
}

