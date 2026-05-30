/** Iridescent palette inspired by Apple Intelligence / Gemini accents */
export const AI_GRADIENT = ['#4285F4', '#7C4DFF', '#E040FB', '#FF6D00'] as const;

export const AI_GRADIENT_SOFT = [
  'rgba(66, 133, 244, 0.35)',
  'rgba(124, 77, 255, 0.35)',
  'rgba(224, 64, 251, 0.3)',
  'rgba(255, 109, 0, 0.25)',
] as const;

export const AI_GLOW_SHADOW = {
  shadowColor: '#7C4DFF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 12,
  elevation: 8,
} as const;
