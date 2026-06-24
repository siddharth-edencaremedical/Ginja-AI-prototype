import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";

export type FeatureFlagState = Record<string, boolean>;

export interface FeatureFlagsProviderProps {
  children: ReactNode;
  flags?: FeatureFlagState;
}

export const defaultFeatureFlags: FeatureFlagState = {
  claims: true,
  finance: true
};

const FeatureFlagsContext =
  createContext<FeatureFlagState>(defaultFeatureFlags);

export function FeatureFlagsProvider({
  children,
  flags = defaultFeatureFlags
}: FeatureFlagsProviderProps) {
  return createElement(FeatureFlagsContext.Provider, { value: flags }, children);
}

export function useFeatureFlags(): FeatureFlagState {
  return useContext(FeatureFlagsContext);
}

export function useFeatureFlag(flag: string): boolean {
  return Boolean(useFeatureFlags()[flag]);
}

export function hasEveryFeatureFlag(
  flags: FeatureFlagState,
  requiredFlags: readonly string[] = []
): boolean {
  return requiredFlags.every((flag) => Boolean(flags[flag]));
}
