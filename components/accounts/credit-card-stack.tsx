import { DecryptedAccount } from "@/db/schema/types";
import { useAccountMonthlyData } from "@/hooks/queries/use-account-monthly-data";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 220;
const SWIPE_THRESHOLD = 100;
const CARD_OFFSET = 20; // Vertical offset between stacked cards
const MAX_VISIBLE_CARDS = 3;

interface CreditCardStackProps {
  accounts: DecryptedAccount[];
  accountBalances?: Map<number, number>; // Optional: accountId -> balance
  onCurrentAccountChange?: (accountId: number) => void; // Callback when current account changes
}

// Colorful gradient colors for different account types
const getCardGradient = (type: DecryptedAccount["type"], index: number): [string, string] => {
  const gradients = {
    debit: [
      ["#667eea", "#764ba2"] as [string, string], // Purple gradient
      ["#f093fb", "#f5576c"] as [string, string], // Pink gradient
      ["#4facfe", "#00f2fe"] as [string, string], // Blue gradient
    ],
    credit: [
      ["#fa709a", "#fee140"] as [string, string], // Pink to yellow
      ["#30cfd0", "#330867"] as [string, string], // Cyan to purple
      ["#a8edea", "#fed6e3"] as [string, string], // Light blue to pink
    ],
    borrowed: [
      ["#ff9a9e", "#fecfef"] as [string, string], // Pink to light pink
      ["#ffecd2", "#fcb69f"] as [string, string], // Peach gradient
      ["#ff6e7f", "#bfe9ff"] as [string, string], // Red to blue
    ],
    lent: [
      ["#a1c4fd", "#c2e9fb"] as [string, string], // Light blue gradient
      ["#d299c2", "#fef9d7"] as [string, string], // Purple to yellow
      ["#89f7fe", "#66a6ff"] as [string, string], // Cyan to blue
    ],
  };

  const typeGradients = gradients[type] || gradients.debit;
  return typeGradients[index % typeGradients.length];
};

export function CreditCardStack({
  accounts,
  accountBalances,
  onCurrentAccountChange,
}: CreditCardStackProps) {
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
      // Notify parent of current account change
      if (onCurrentAccountChange) {
        onCurrentAccountChange(accounts[currentIndex].id);
      }
    }
    // Reset animation values when index changes
    translateY.value = 0;
    opacity.value = 1;
    scale.value = 1;
  }, [
    currentIndex,
    accounts,
    currentIndexShared,
    accountsLengthShared,
    canSwipeShared,
    translateY,
    opacity,
    scale,
    onCurrentAccountChange,
  ]);

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
    const baseScale = 1 - stackIndex * 0.05;
    const baseOpacity = 1 - stackIndex * 0.3;

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
    const scaleUp = 1 + progress * 0.05; // Scale up to full size
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
    const baseScale = 1 - stackIndex * 0.05;
    const baseOpacity = 1 - stackIndex * 0.3;

    const topCardY = translateY.value;
    let progress = 0;

    if (topCardY < 0) {
      progress = Math.min(Math.abs(topCardY) / 200, 1);
    } else if (topCardY > 0) {
      progress = 1;
    }

    const additionalOffset = progress * -CARD_OFFSET;
    const scaleUp = 1 + progress * 0.05;
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
        const progress = Math.min(
          Math.abs(event.translationY) / SWIPE_THRESHOLD,
          1
        );
        scale.value = 1 + progress * 0.05; // Slight scale up
        opacity.value = 1; // Stay fully visible
      }
    })
    .onEnd((event) => {
      "worklet";
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
        translateY.value = withTiming(
          upDistance,
          {
            duration: 200,
            easing: Easing.out(Easing.quad),
          },
          () => {
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
          }
        );

        // Scale: slightly larger when going up, then smaller when behind
        scale.value = withTiming(
          1.05,
          {
            duration: 200,
            easing: Easing.out(Easing.quad),
          },
          () => {
            scale.value = withTiming(0.85, {
              duration: 300,
              easing: Easing.in(Easing.quad),
            });
          }
        );

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
      for (
        let i = 0;
        i < Math.min(MAX_VISIBLE_CARDS - 1, accounts.length - 1);
        i++
      ) {
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
                  : stackedCardStyles[stackIndex - 1] || {}, // Other stacked cards
                {
                  zIndex: isSwipedCard
                    ? 1 // Swiped card should be behind all (lowest z-index) when coming down
                    : isCurrentCard && !isSwipedCard
                    ? 1000 // Current card (being swiped up) should be on top
                    : isTopCard
                    ? 1000
                    : MAX_VISIBLE_CARDS - stackIndex,
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
  gradient: [string, string];
  currency: string;
  canSwipe: boolean;
}

function CreditCard({
  account,
  balance,
  gradient,
  currency,
  canSwipe,
}: CreditCardProps) {
  const { data: monthlyData } = useAccountMonthlyData(account.id);

  // Format account name
  const accountName = account.name.toUpperCase().slice(0, 20);

  // Format numbers with currency symbol
  const formatAmount = (amount: number) => {
    return `${getCurrencySymbol(currency)}${Math.abs(amount).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    )}`;
  };

  // Compact format for large numbers
  const formatCompactAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `${getCurrencySymbol(currency)}${(absAmount / 10000000).toFixed(
        1
      )}Cr`;
    } else if (absAmount >= 100000) {
      return `${getCurrencySymbol(currency)}${(absAmount / 100000).toFixed(
        1
      )}L`;
    } else if (absAmount >= 1000) {
      return `${getCurrencySymbol(currency)}${(absAmount / 1000).toFixed(1)}k`;
    }
    return formatAmount(amount);
  };

  const currentMonthExpenses = monthlyData?.currentMonthExpenses ?? 0;
  const todayExpenses = monthlyData?.todayExpenses ?? 0;

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
            {account.type === "debit"
              ? "DEBIT CARD"
              : account.type === "credit"
              ? "CREDIT CARD"
              : account.type.toUpperCase()}
          </Text>
          {/* Account Name Badge */}
          <View style={styles.accountNameBadge}>
            <Text style={styles.accountNameText} numberOfLines={1}>
              {accountName}
            </Text>
          </View>
        </View>

        {/* Total Spend This Month - Main */}
        <View style={styles.balanceMainContainer}>
          <Text style={styles.balanceLabel}>Total Spend This Month</Text>
          <Text style={styles.balanceMainText}>
            {formatCompactAmount(currentMonthExpenses)}
          </Text>
        </View>

        {/* Total Spent Today */}
        <View style={styles.todaySpendContainer}>
          <View style={styles.statItem}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#FFFFFF"
              style={{ opacity: 0.9 }}
            />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Spent Today</Text>
              <Text style={styles.statValue}>
                {formatCompactAmount(todayExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Swipe Indicator - Only show if there are multiple cards */}
        {canSwipe && (
          <View style={styles.swipeIndicator}>
            <Ionicons
              name="chevron-up"
              size={16}
              color="#FFFFFF"
              style={{ opacity: 0.5 }}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: CARD_HEIGHT + (MAX_VISIBLE_CARDS - 1) * CARD_OFFSET,
    marginVertical: 20,
  },
  stackContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    alignItems: "center",
  },
  cardWrapper: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardContainer: {
    width: "100%",
    height: "100%",
  },
  cardTouchable: {
    width: "100%",
    height: "100%",
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  cardTypeLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  contactlessContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  contactlessWave: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    opacity: 0.8,
  },
  accountNameBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  accountNameText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  balanceMainContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.8,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  balanceMainText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  todaySpendContainer: {
    marginBottom: 20,
  },
  monthlyStatsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.8,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerInfo: {
    alignItems: "flex-start",
  },
  footerLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    opacity: 0.7,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  footerValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  swipeIndicator: {
    position: "absolute",
    bottom: 16,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.6,
  },
});
