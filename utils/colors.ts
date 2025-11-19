/**
 * Tailwind color utilities matching NativeWind's color system
 * These values match Tailwind CSS default color palette
 */

export const tailwindColors = {
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

/**
 * Get background color based on theme
 * Matches: bg-white dark:bg-black (pitch black)
 */
export const getBackgroundColor = (isDark: boolean) => {
  return isDark ? '#000000' : tailwindColors.white; // Pitch black (#000000) for dark mode
};

/**
 * Get handle indicator color based on theme
 * Matches: bg-gray-300 dark:bg-gray-600
 */
export const getHandleIndicatorColor = (isDark: boolean) => {
  return isDark ? tailwindColors.gray[600] : tailwindColors.gray[300];
};

