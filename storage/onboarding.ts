import { mmkv } from './mmkv';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export const onboardingStorage = {
  isCompleted: (): boolean => {
    return mmkv.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
  },

  setCompleted: (): void => {
    mmkv.set(ONBOARDING_COMPLETED_KEY, true);
  },

  reset: (): void => {
    mmkv.remove(ONBOARDING_COMPLETED_KEY);
  },
};

