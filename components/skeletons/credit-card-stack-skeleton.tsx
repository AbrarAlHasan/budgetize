import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBase } from "./skeleton-base";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 220;
const CARD_OFFSET = 20;
const MAX_VISIBLE_CARDS = 3;

/**
 * Skeleton loader for CreditCardStack component
 */
export function CreditCardStackSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.stackContainer}>
        {[0, 1, 2].slice(0, MAX_VISIBLE_CARDS).map((index) => (
          <View
            key={index}
            style={[
              styles.cardWrapper,
              {
                transform: [{ translateY: index * CARD_OFFSET }],
                zIndex: MAX_VISIBLE_CARDS - index,
              },
            ]}
          >
            <View style={styles.cardContainer}>
              <View style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <SkeletonBase width={100} height={12} borderRadius={4} />
                  <SkeletonBase width={80} height={20} borderRadius={8} />
                </View>

                {/* Balance Section */}
                <View style={styles.balanceContainer}>
                  <SkeletonBase width={150} height={12} borderRadius={4} className="mb-2" />
                  <SkeletonBase width={180} height={32} borderRadius={6} />
                </View>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <SkeletonBase width={16} height={16} borderRadius={8} />
                    <View style={styles.statContent}>
                      <SkeletonBase width={100} height={10} borderRadius={4} className="mb-1" />
                      <SkeletonBase width={80} height={14} borderRadius={4} />
                    </View>
                  </View>
                </View>

                {/* Swipe Indicator */}
                <View style={styles.swipeIndicator}>
                  <SkeletonBase width={16} height={16} borderRadius={8} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
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
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statContent: {
    flex: 1,
  },
  swipeIndicator: {
    position: "absolute",
    bottom: 16,
    right: 24,
  },
});

