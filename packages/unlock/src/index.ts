import type { Category, UnlockState } from "@blocksite/core";
import { MIN_UNLOCK_MINUTES, MAX_UNLOCK_MINUTES } from "@blocksite/core";
import { unlockState as unlockRepo } from "@blocksite/storage";
import { verifyCategoryPassword } from "@blocksite/auth";
import { emitter } from "@blocksite/event-bus";

function defaultState(category: Category): UnlockState {
  return {
    category,
    unlockedUntil: null,
    lockCount: 0,
    lockDate: today(),
    allowUnlock: true,
    unlockDuration: 5,
    maxDailyUnlocks: 5,
  };
}

function today(): string {
  return new Date().toLocaleDateString("zh-CN");
}

async function getState(category: Category): Promise<UnlockState> {
  const state = await unlockRepo.get(category);
  if (state === undefined) return defaultState(category);

  // Reset daily count if day changed
  const currentDate = today();
  if (state.lockDate !== currentDate) {
    const reset: UnlockState = {
      ...state,
      lockCount: 0,
      lockDate: currentDate,
    };
    // Check if an unlock from yesterday has expired
    if (state.unlockedUntil !== null && Date.now() >= state.unlockedUntil) {
      reset.unlockedUntil = null;
    }
    await unlockRepo.put(reset);
    return reset;
  }

  // Check if unlock has expired
  if (state.unlockedUntil !== null && Date.now() >= state.unlockedUntil) {
    const expired: UnlockState = { ...state, unlockedUntil: null };
    await unlockRepo.put(expired);
    return expired;
  }

  return state;
}

export async function canUnlock(
  category: Category,
): Promise<{ allowed: boolean; reason?: string }> {
  const state = await getState(category);
  if (!state.allowUnlock) return { allowed: false, reason: "Unlock disabled for this category" };
  if (state.lockCount >= state.maxDailyUnlocks) {
    return { allowed: false, reason: `Daily unlock limit (${state.maxDailyUnlocks}) reached` };
  }
  if (state.unlockedUntil !== null) {
    return { allowed: false, reason: "Already unlocked" };
  }
  return { allowed: true };
}

export async function unlock(
  category: Category,
  password: string,
  durationMinutes?: number,
): Promise<{ success: boolean; error?: string; until?: number }> {
  // Verify password
  const valid = await verifyCategoryPassword(category, password);
  if (!valid) {
    return { success: false, error: "Incorrect password" };
  }

  // Check unlock eligibility
  const check = await canUnlock(category);
  if (!check.allowed) {
    return { success: false, error: check.reason ?? "Unlock not allowed" };
  }

  // Validate duration
  const duration = Math.max(MIN_UNLOCK_MINUTES, Math.min(MAX_UNLOCK_MINUTES, durationMinutes ?? 5));
  const until = Date.now() + duration * 60 * 1000;

  const state = await getState(category);
  const updated: UnlockState = {
    ...state,
    unlockedUntil: until,
    lockCount: state.lockCount + 1,
  };
  await unlockRepo.put(updated);

  emitter.emit("unlock:granted", { category, until });
  return { success: true, until };
}

export async function extendUnlock(
  category: Category,
  password: string,
  additionalMinutes?: number,
): Promise<{ success: boolean; error?: string; until?: number }> {
  const state = await getState(category);
  if (state.unlockedUntil === null) {
    return { success: false, error: "No active unlock to extend" };
  }

  const valid = await verifyCategoryPassword(category, password);
  if (!valid) {
    return { success: false, error: "Incorrect password" };
  }

  const additional = Math.max(
    MIN_UNLOCK_MINUTES,
    Math.min(MAX_UNLOCK_MINUTES, additionalMinutes ?? 5),
  );
  const until = state.unlockedUntil + additional * 60 * 1000;

  const updated: UnlockState = { ...state, unlockedUntil: until };
  await unlockRepo.put(updated);

  emitter.emit("unlock:extended", { category, until });
  return { success: true, until };
}

export async function checkExpiry(
  category: Category,
): Promise<{ active: boolean; until: number | null; warning: boolean }> {
  const state = await getState(category);
  if (state.unlockedUntil === null) return { active: false, until: null, warning: false };

  const remaining = state.unlockedUntil - Date.now();
  if (remaining <= 0) {
    const expired: UnlockState = { ...state, unlockedUntil: null };
    await unlockRepo.put(expired);
    emitter.emit("unlock:expired", { category });
    return { active: false, until: null, warning: false };
  }

  const warningThreshold = 60 * 1000; // 1 minute
  return { active: true, until: state.unlockedUntil, warning: remaining <= warningThreshold };
}

export async function setUnlockConfig(
  category: Category,
  config: { allowUnlock?: boolean; unlockDuration?: number; maxDailyUnlocks?: number },
): Promise<void> {
  const state = await getState(category);
  const updated: UnlockState = { ...state, ...config };
  await unlockRepo.put(updated);
}

export async function getRemainingUnlocks(category: Category): Promise<number> {
  const state = await getState(category);
  return Math.max(0, state.maxDailyUnlocks - state.lockCount);
}

export async function getUnlockState(
  category?: Category,
): Promise<UnlockState | UnlockState[] | undefined> {
  if (category !== undefined) return getState(category);
  const all = await unlockRepo.getAll();
  const results: UnlockState[] = [];
  for (const cat of all) {
    results.push(await getState(cat.category));
  }
  return results;
}
