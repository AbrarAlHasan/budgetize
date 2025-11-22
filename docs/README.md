# Onboarding System Documentation

## Overview
This is a beautiful, animated onboarding system for Budgetize that appears only on the first app launch. It features smooth animations, intuitive navigation, and a modern design.

## Features
- ✨ Smooth, complex animations using React Native Reanimated
- 📱 Responsive design for all screen sizes
- 🎨 Beautiful UI with custom colors per step
- 👆 Swipe navigation between steps
- 🔄 Easily scalable (add/remove steps)
- 💾 Persistent storage (shows only once)
- ⏭️ Skip functionality
- 🎯 Dynamic button states

## File Structure
```
components/onboarding/
  ├── onboarding-screen.tsx    # Main onboarding component
  └── README.md                # This file

constants/
  └── onboarding-data.ts       # Onboarding content configuration

storage/
  └── onboarding.ts            # Storage utilities
```

## How It Works

### 1. First Launch Detection
The app checks MMKV storage for an `onboarding_completed` flag:
- If `false` or doesn't exist → Show onboarding
- If `true` → Skip to main app

### 2. Storage Management
Located in `storage/onboarding.ts`:

```typescript
onboardingStorage.isCompleted()  // Check if completed
onboardingStorage.setCompleted() // Mark as completed
onboardingStorage.reset()        // Reset for testing
```

### 3. Integration
The onboarding is integrated at the root level in `app/_layout.tsx`:
- Checks completion status on mount
- Shows onboarding or main app accordingly
- Updates storage when user completes onboarding

## Adding/Removing Steps

### To Add a New Step:
Edit `constants/onboarding-data.ts`:

```typescript
export const ONBOARDING_STEPS: OnboardingStep[] = [
  // ... existing steps
  {
    id: 4,  // Increment ID
    title: "Your New\nFeature Title",
    description: "Description of your new feature",
    icon: "star",  // Any Ionicons name
    color: "#F59E0B",  // Primary color
    backgroundColor: "#FEF3C7",  // Light background
    features: [
      { icon: "checkmark", text: "Feature point 1" },
      { icon: "heart", text: "Feature point 2" },
      { icon: "trophy", text: "Feature point 3" },
    ],
  },
];
```

### To Remove a Step:
Simply delete the step object from the `ONBOARDING_STEPS` array. The system will automatically adjust.

## Customization

### Colors
Each step has its own color scheme defined in `onboarding-data.ts`:
- `color`: Primary color (icons, buttons, accents)
- `backgroundColor`: Screen background color

### Icons
Uses Expo's Ionicons. Browse available icons:
https://icons.expo.fyi/

### Animations
All animations are in `onboarding-screen.tsx`:
- **Icon animations**: Scale, rotation, translateY
- **Text animations**: Fade in/out, translateY
- **Dot pagination**: Width expansion for active dot
- **Button**: Color change on last slide

## Testing

### Reset Onboarding for Testing
Add this to any screen (e.g., Settings) temporarily:

```typescript
import { onboardingStorage } from '@/storage/onboarding';
import { Alert } from 'react-native';

// In your component:
const handleResetOnboarding = () => {
  onboardingStorage.reset();
  Alert.alert('Success', 'Onboarding reset! Restart the app to see it again.');
};

// Add a button:
<TouchableOpacity onPress={handleResetOnboarding}>
  <Text>Reset Onboarding (Dev Only)</Text>
</TouchableOpacity>
```

### Or use the development helper:
```typescript
// In your terminal or directly in code:
import { onboardingStorage } from './storage/onboarding';
onboardingStorage.reset();
```

## Performance Optimization

The onboarding uses:
1. **Reanimated 2**: All animations run on the UI thread
2. **ScrollView with paging**: Native performance
3. **Shared values**: Efficient animation synchronization
4. **Lazy rendering**: Only visible slides are fully rendered

## Animations Breakdown

### Slide Transitions
- **Icon**: Scales from 0.5 → 1 → 0.5, rotates ±45°
- **Title**: Fades and translates vertically
- **Description**: Fades with slight vertical movement
- **Features**: Synchronized fade with description

### Interactive Elements
- **Pagination dots**: Expand when active (8px → 32px width)
- **Button**: Changes color on last slide (blue → green)
- **Skip button**: Hides on last slide

### Decorative Elements
- **Background circles**: Static but positioned per slide
- **Icon container**: Rotating 3D effect while scrolling

## Accessibility

✅ High contrast text
✅ Clear visual hierarchy
✅ Touch targets > 44x44px
✅ Descriptive button labels
✅ Skip option available

## Troubleshooting

### Onboarding not showing?
```typescript
// Check storage value
import { onboardingStorage } from '@/storage/onboarding';
console.log(onboardingStorage.isCompleted()); // Should be false

// Force reset
onboardingStorage.reset();
```

### Animations laggy?
- Ensure React Native Reanimated is properly installed
- Check if running on physical device (not simulator)
- Verify Hermes is enabled

### Icon not found?
- Verify icon name exists in Ionicons
- Check spelling (case-sensitive)
- Visit https://icons.expo.fyi/ for valid names

## Future Enhancements

Potential improvements:
- [ ] Video backgrounds
- [ ] Lottie animations
- [ ] Haptic feedback
- [ ] Sound effects
- [ ] A/B testing different content
- [ ] Analytics tracking
- [ ] Gesture-based navigation (swipe up/down)
- [ ] Interactive tutorials

## Best Practices

1. **Keep it short**: 3-5 slides max
2. **Focus on benefits**: Not features
3. **Use real data**: Show actual UI previews
4. **Make it skippable**: Don't force users
5. **Test on devices**: Not just simulators
6. **Update regularly**: Keep content fresh

## Credits

Built with:
- React Native
- Expo
- React Native Reanimated
- Ionicons
- MMKV Storage

