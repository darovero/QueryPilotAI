export type SavedConnection = {
  dbType: string;
  dbLabel: string;
  mode: "basic" | "odbc";
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  odbcConnectionString?: string;
  tested: boolean;
  testedAt?: string;
};

export type OnboardingState = {
  organizationName?: string;
  connection?: SavedConnection;
};

const STORAGE_KEY = "insightforge.onboarding";

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return {};
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateOnboardingState(partial: Partial<OnboardingState>): OnboardingState {
  const current = readOnboardingState();
  const next = { ...current, ...partial };
  writeOnboardingState(next);
  return next;
}