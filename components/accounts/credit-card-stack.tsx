import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { DecryptedAccount } from '@/db/schema/types';
import { useSettingsStore } from '@/store/settings-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 220;
const SWIPE_THRESHOLD = 100;
const CARD_OFFSET = 20; // Vertical offset between stacked cards
const MAX_VISIBLE_CARDS = 3;

interface CreditCardStackProps {
  accounts: DecryptedAccount[];
  accountBalances?: Map<number, number>; // Optional: accountId -> balance
}

// Colorful gradient colors for different account types
const getCardGradient = (type: DecryptedAccount['type'], index: number) => {
  const gradients = {
    debit: [
      ['#667eea', '#764ba2'], // Purple gradient
      ['#f093fb', '#f5576c'], // Pink gradient
      ['#4facfe', '#00f2fe'], // Blue gradient
    ],
    credit: [
      ['#fa709a', '#fee140'], // Pink to yellow
      ['#30cfd0', '#330867'], // Cyan to purple
      ['#a8edea', '#fed6e3'], // Light blue to pink
    ],
    borrowed: [
      ['#ff9a9e', '#fecfef'], // Pink to light pink
      ['#ffecd2', '#fcb69f'], // Peach gradient
      ['#ff6e7f', '#bfe9ff'], // Red to blue
    ],
    lent: [
      ['#a1c4fd', '#c2e9fb'], // Light blue gradient
      ['#d299c2', '#fef9d7'], // Purple to yellow
      ['#89f7fe', '#66a6ff'], // Cyan to blue
    ],
  };

  const typeGradients = gradients[type] || gradients.debit;
  return typeGradients[index % typeGradients.length];
};

export function CreditCardStack({ accounts, accountBalances }: CreditCardStackProps) {
  const { settings } = useSettingsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardAnimatingBehind, setIsCardAnimatingBehind] = useState(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const startY = useSharedValue(0);
  const currentIndexShared = useSharedValue(0);
  const accountsLengthShared = useSharedValue(0);
  const canSwipeShared = useSharedValue(false);
  const isAnimatingBehind = useSharedValue(false); // Track if card is animating behind

  // Update shared values when accounts or currentIndex changes
  useEffect(() => {
    currentIndexShared.value = currentIndex;
    if (accounts && accounts.length > 0) {
      accountsLengthShared.value = accounts.length;
      canSwipeShared.value = accounts.length > 1;
    }
    // Reset animation values when index changes
    translateY.value = 0;
    opacity.value = 1;
    scale.value = 1;
  }, [currentIndex, accounts, currentIndexShared, accountsLengthShared, canSwipeShared, translateY, opacity, scale]);

  // Helper function to move to next card (must be before early return)
  const moveToNextCard = useCallback((nextIndex: number) => {
    // Wait for animation to complete (200ms up + 300ms down = 500ms total)
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setIsCardAnimatingBehind(false); // Reset animation state
    }, 500);
  }, []);

  // Animated style for top card (must be before early return as it's a hook)
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }, // Uniform scale (no squash, just scale down as it goes behind)
      ],
      opacity: opacity.value,
    };
  });

  // Animated styles for stacked cards (behind the top card) - create fixed number at top level
  const stackedCardStyle1 = useAnimatedStyle(() => {
    const stackIndex = 1;
    const baseOffset = stackIndex * CARD_OFFSET;
    const baseScale = 1 - (stackIndex * 0.05);
    const baseOpacity = 1 - (stackIndex * 0.3);
    
    // When top card is going up (negative) or coming down behind (positive), next card moves forward
    const topCardY = translateY.value;
    let progress = 0;
    
    if (topCardY < 0) {
      // Card is going up - next card starts moving forward
      progress = Math.min(Math.abs(topCardY) / 200, 1);
    } else if (topCardY > 0) {
      // Card is coming down behind - next card is fully forward
      progress = 1;
    }
    
    const additionalOffset = progress * -CARD_OFFSET; // Move up to top position
    const scaleUp = 1 + (progress * 0.05); // Scale up to full size
    const opacityUp = progress * 0.3; // Fade in to full opacity
    
    return {
      transform: [
        { translateY: baseOffset + additionalOffset },
        { scale: baseScale * scaleUp },
      ],
      opacity: Math.min(baseOpacity + opacityUp, 1),
    };
  });

  const stackedCardStyle2 = useAnimatedStyle(() => {
    const stackIndex = 2;
    const baseOffset = stackIndex * CARD_OFFSET;
    const baseScale = 1 - (stackIndex * 0.05);
    const baseOpacity = 1 - (stackIndex * 0.3);
    
    const topCardY = translateY.value;
    let progress = 0;
    
    if (topCardY < 0) {
      progress = Math.min(Math.abs(topCardY) / 200, 1);
    } else if (topCardY > 0) {
      progress = 1;
    }
    
    const additionalOffset = progress * -CARD_OFFSET;
    const scaleUp = 1 + (progress * 0.05);
    const opacityUp = progress * 0.3;
    
    return {
      transform: [
        { translateY: baseOffset + additionalOffset },
        { scale: baseScale * scaleUp },
      ],
      opacity: Math.min(baseOpacity + opacityUp, 1),
    };
  });

  // Array of stacked card styles for easy access
  const stackedCardStyles = [stackedCardStyle1, stackedCardStyle2];

  // Early return after all hooks
  if (!accounts || accounts.length === 0) {
    return null;
  }

  // If only one card, don't show swipe functionality
  const canSwipe = accounts.length > 1;

  const panGesture = Gesture.Pan()
    .enabled(canSwipe)
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow upward swipes
      if (event.translationY < 0) {
        translateY.value = startY.value + event.translationY;
        // Slight scale up as user drags up (preparing to throw)
        const progress = Math.min(Math.abs(event.translationY) / SWIPE_THRESHOLD, 1);
        scale.value = 1 + progress * 0.05; // Slight scale up
        opacity.value = 1; // Stay fully visible
      }
    })
    .onEnd((event) => {
      'worklet';
      const canSwipeValue = canSwipeShared.value;
      if (!canSwipeValue) {
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
        scale.value = withSpring(1);
        return;
      }

      const currentIdx = currentIndexShared.value;
      const accountsLength = accountsLengthShared.value;
      if (event.translationY < -SWIPE_THRESHOLD) {
        // Swipe up successful - card goes up, then comes down behind the stack
        const upDistance = -200; // Move up first
        const behindDistance = CARD_OFFSET * accountsLength; // Final position behind all cards
        
        // Stage 1: Move up (keep opacity at 1 - fully visible throughout up motion)
        opacity.value = 1;
        translateY.value = withTiming(upDistance, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        }, () => {
          // Stage 2: Come down behind all cards
          runOnJS(setIsCardAnimatingBehind)(true); // Mark as animating behind (this changes visible accounts)
          translateY.value = withTiming(behindDistance, {
            duration: 300,
            easing: Easing.in(Easing.quad),
          });
          // Only slightly reduce opacity when behind (keep it clearly visible)
          opacity.value = withTiming(0.8, {
            duration: 300,
            easing: Easing.in(Easing.quad),
          });
        });
        
        // Scale: slightly larger when going up, then smaller when behind
        scale.value = withTiming(1.05, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        }, () => {
          scale.value = withTiming(0.85, {
            duration: 300,
            easing: Easing.in(Easing.quad),
          });
        });

        // Calculate next index (circular: wrap around to 0 when reaching the end)
        const nextIndex = (currentIdx + 1) % accountsLength;
        // Move to next card after animation completes
        runOnJS(moveToNextCard)(nextIndex);
      } else {
        // Spring back
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        opacity.value = 1; // Keep at 1
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  // Get visible accounts with circular wrapping
  // If card is animating behind, show next card as top and swiped card at last position
  const getVisibleAccounts = () => {
    const visible: typeof accounts = [];
    
    if (isCardAnimatingBehind) {
      // Card is animating behind - show next card as top, swiped card at end
      const nextIndex = (currentIndex + 1) % accounts.length;
      
      // Add cards starting from nextIndex (the new top card)
      for (let i = 0; i < Math.min(MAX_VISIBLE_CARDS - 1, accounts.length - 1); i++) {
        const index = (nextIndex + i) % accounts.length;
        visible.push(accounts[index]);
      }
      
      // Add the swiped card at the end (last position, behind all)
      visible.push(accounts[currentIndex]);
    } else {
      // Normal state - show cards starting from currentIndex
      for (let i = 0; i < Math.min(MAX_VISIBLE_CARDS, accounts.length); i++) {
        const index = (currentIndex + i) % accounts.length;
        visible.push(accounts[index]);
      }
    }
    
    return visible;
  };

  const visibleAccounts = getVisibleAccounts();
  const currentAccount = accounts[currentIndex];
  const balance = accountBalances?.get(currentAccount.id) ?? 0;


  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.stackContainer}>
        {visibleAccounts.map((account, stackIndex) => {
          // Check if this is the current card (the one being swiped)
          const isCurrentCard = account.id === accounts[currentIndex].id;
          // Check if this is the swiped card that's animating behind
          const isSwipedCard = isCurrentCard && isCardAnimatingBehind;
          // Top card is the first visible card that's NOT the swiped card
          const isTopCard = !isSwipedCard && stackIndex === 0;
          
          // Calculate the actual index in the accounts array (with circular wrapping)
          let actualIndex: number;
          if (isCurrentCard) {
            actualIndex = currentIndex; // Current card keeps its original index
          } else if (isCardAnimatingBehind) {
            // When animating, other cards are the next ones
            const nextIndex = (currentIndex + 1) % accounts.length;
            actualIndex = (nextIndex + stackIndex) % accounts.length;
          } else {
            actualIndex = (currentIndex + stackIndex) % accounts.length;
          }
          const gradient = getCardGradient(account.type, actualIndex);
          const cardBalance = accountBalances?.get(account.id) ?? 0;

          return (
            <Animated.View
              key={`${account.id}-${actualIndex}-${currentIndex}`}
              style={[
                styles.cardWrapper,
                isCurrentCard
                  ? animatedStyle // Current card (being swiped) uses animated style
                  : isTopCard 
                    ? {} // New top card has no animation
                    : (stackedCardStyles[stackIndex - 1] || {}), // Other stacked cards
                { 
                  zIndex: isSwipedCard
                    ? 1 // Swiped card should be behind all (lowest z-index) when coming down
                    : isCurrentCard && !isSwipedCard
                      ? 1000 // Current card (being swiped up) should be on top
                      : isTopCard 
                        ? 1000 
                        : MAX_VISIBLE_CARDS - stackIndex 
                },
              ]}
            >
              {isCurrentCard && !isSwipedCard ? (
                <GestureDetector gesture={panGesture}>
                  <Animated.View style={styles.cardContainer}>
                    <CreditCard
                      account={account}
                      balance={cardBalance}
                      gradient={gradient}
                      currency={settings.currency}
                      canSwipe={canSwipe}
                    />
                  </Animated.View>
                </GestureDetector>
              ) : (
                <View style={styles.cardContainer}>
                  <CreditCard
                    account={account}
                    balance={cardBalance}
                    gradient={gradient}
                    currency={settings.currency}
                    canSwipe={false}
                  />
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

interface CreditCardProps {
  account: DecryptedAccount;
  balance: number;
  gradient: string[];
  currency: string;
  canSwipe: boolean;
}

function CreditCard({ account, balance, gradient, currency, canSwipe }: CreditCardProps) {
  // Generate a masked card number based on account ID
  const generateCardNumber = (accountId: number) => {
    // Create a consistent card number based on account ID
    const firstFour = String(accountId).padStart(4, '0').slice(0, 4);
    const lastFour = String(accountId * 7).padStart(4, '0').slice(-4);
    return `${firstFour} **** **** ${lastFour}`;
  };

  // Generate expiration date (default to 2 years from now)
  const generateExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  };

  // Determine card network based on account type or ID
  const getCardNetwork = () => {
    const networks = ['VISA', 'MASTERCARD'];
    return networks[account.id % networks.length];
  };

  // Format cardholder name (use account name, uppercase)
  const cardholderName = account.name.toUpperCase().slice(0, 20);

  const cardNumber = generateCardNumber(account.id);
  const expiryDate = generateExpiryDate();
  const cardNetwork = getCardNetwork();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/accounts/${account.id}`)}
      style={styles.cardTouchable}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTypeLabel}>
            {account.type === 'debit' ? 'DEBIT CARD' : 
             account.type === 'credit' ? 'CREDIT CARD' : 
             account.type.toUpperCase()}
          </Text>
          {/* Contactless Payment Symbol */}
          <View style={styles.contactlessContainer}>
            <View style={styles.contactlessWave} />
            <View style={[styles.contactlessWave, { marginLeft: -8 }]} />
            <View style={[styles.contactlessWave, { marginLeft: -16 }]} />
          </View>
        </View>

        {/* Card Number */}
        <View style={styles.cardNumberContainer}>
          <Text style={styles.cardNumber}>{cardNumber}</Text>
        </View>

        {/* Cardholder Name */}
        <View style={styles.cardholderContainer}>
          <Text style={styles.cardholderName} numberOfLines={1}>
            {cardholderName}
          </Text>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardDetails}>
            <View>
              <Text style={styles.expiryLabel}>Expires</Text>
              <Text style={styles.expiryDate}>{expiryDate}</Text>
            </View>
            <View style={styles.cvvContainer}>
              <Text style={styles.cvvLabel}>CVV</Text>
              <Text style={styles.cvvValue}>***</Text>
            </View>
          </View>
          {/* Card Network Logo */}
          <View style={styles.cardNetworkContainer}>
            <Text style={styles.cardNetwork}>{cardNetwork}</Text>
          </View>
        </View>

        {/* Balance Display (overlay) */}
        <View style={styles.balanceOverlay}>
          <Text style={styles.balanceText}>
            {getCurrencySymbol(currency)}{Math.abs(balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {/* Swipe Indicator - Only show if there are multiple cards */}
        {canSwipe && (
          <View style={styles.swipeIndicator}>
            <Ionicons name="chevron-up" size={16} color="#FFFFFF" style={{ opacity: 0.5 }} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CARD_HEIGHT + (MAX_VISIBLE_CARDS - 1) * CARD_OFFSET,
    marginVertical: 20,
  },
  stackContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTypeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  contactlessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  contactlessWave: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.8,
  },
  cardNumberContainer: {
    marginBottom: 24,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  cardholderContainer: {
    marginBottom: 20,
  },
  cardholderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.95,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  expiryLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  expiryDate: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cvvContainer: {
    alignItems: 'flex-start',
  },
  cvvLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cvvValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardNetworkContainer: {
    alignItems: 'flex-end',
  },
  cardNetwork: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.95,
  },
  balanceOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
});

