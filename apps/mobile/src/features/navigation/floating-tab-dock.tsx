import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type TabType = "home" | "camera" | "progress" | "profile";

type FloatingTabDockProps = {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  onPlusPress: () => void;
};

// 1. Vector House Icon for Home
function HomeIcon({ active }: { active: boolean }) {
  const color = active ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)";
  return (
    <View style={styles.homeContainer}>
      {/* Roof */}
      <View
        style={[
          styles.roof,
          {
            borderBottomColor: color,
          },
        ]}
      />
      {/* House Body */}
      <View style={[styles.houseBody, { backgroundColor: color }]}>
        <View style={styles.houseDoor} />
      </View>
    </View>
  );
}

// 2. Vector Camera Icon (Matching reference image silhouette)
function CameraIcon({ active }: { active: boolean }) {
  const color = active ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)";
  const cutoutColor = "rgba(18, 24, 30, 0.9)";

  return (
    <View style={styles.cameraContainer}>
      {/* Top Shutter Notch & Prism */}
      <View style={styles.cameraTopRow}>
        <View style={[styles.cameraShutter, { backgroundColor: color }]} />
        <View style={[styles.cameraPrism, { backgroundColor: color }]} />
      </View>

      {/* Camera Body */}
      <View style={[styles.cameraBody, { backgroundColor: color }]}>
        {/* Sensor Dot */}
        <View style={[styles.cameraSensorDot, { backgroundColor: cutoutColor }]} />
        {/* Center Circular Lens */}
        <View style={[styles.cameraLens, { borderColor: cutoutColor }]}>
          <View style={[styles.cameraLensInner, { backgroundColor: cutoutColor }]} />
        </View>
      </View>
    </View>
  );
}

// 3. Vector Bar Chart Icon for Progress
function ProgressIcon({ active }: { active: boolean }) {
  const color = active ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)";
  return (
    <View style={styles.progressContainer}>
      <View style={[styles.bar, { height: 10, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 16, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 13, backgroundColor: color }]} />
    </View>
  );
}

// 4. Vector Profile Icon (Matching circular outline style)
function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)";
  return (
    <View style={[styles.profileCircle, { borderColor: color }]}>
      <View style={[styles.profileHead, { backgroundColor: color }]} />
      <View style={[styles.profileBody, { backgroundColor: color }]} />
    </View>
  );
}

export function FloatingTabDock({
  activeTab,
  onTabPress,
  onPlusPress,
}: FloatingTabDockProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Frosted Glassmorphism Pill Dock */}
      <View style={styles.pillContainer}>
        {/* Home Tab */}
        <Pressable
          style={[styles.tabItem, activeTab === "home" && styles.tabItemActive]}
          onPress={() => onTabPress("home")}
          hitSlop={4}
        >
          <HomeIcon active={activeTab === "home"} />
          <Text style={[styles.tabLabel, activeTab === "home" && styles.tabLabelActive]}>
            Home
          </Text>
        </Pressable>

        {/* Camera Tab (Between Home and Progress) */}
        <Pressable
          style={[styles.tabItem, activeTab === "camera" && styles.tabItemActive]}
          onPress={() => onTabPress("camera")}
          hitSlop={4}
        >
          <CameraIcon active={activeTab === "camera"} />
          <Text style={[styles.tabLabel, activeTab === "camera" && styles.tabLabelActive]}>
            Camera
          </Text>
        </Pressable>

        {/* Progress Tab */}
        <Pressable
          style={[styles.tabItem, activeTab === "progress" && styles.tabItemActive]}
          onPress={() => onTabPress("progress")}
          hitSlop={4}
        >
          <ProgressIcon active={activeTab === "progress"} />
          <Text style={[styles.tabLabel, activeTab === "progress" && styles.tabLabelActive]}>
            Progress
          </Text>
        </Pressable>

        {/* Profile Tab */}
        <Pressable
          style={[styles.tabItem, activeTab === "profile" && styles.tabItemActive]}
          onPress={() => onTabPress("profile")}
          hitSlop={4}
        >
          <ProfileIcon active={activeTab === "profile"} />
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Matching Glassmorphic Circular Plus Button */}
      <Pressable
        style={({ pressed }) => [styles.plusBtn, pressed && styles.plusBtnPressed]}
        onPress={onPlusPress}
        hitSlop={8}
      >
        <Text style={styles.plusSymbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 22,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 99,
  },
  pillContainer: {
    flex: 1,
    height: 68,
    backgroundColor: "rgba(18, 24, 30, 0.88)",
    borderRadius: 34,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginRight: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginHorizontal: 3,
  },
  tabItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  plusBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(18, 24, 30, 0.94)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  plusBtnPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: "rgba(35, 42, 50, 0.96)",
  },
  plusSymbol: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "300",
    lineHeight: 38,
    marginTop: -2,
  },

  // House icon styles
  homeContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 18,
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  houseBody: {
    width: 14,
    height: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  houseDoor: {
    width: 4,
    height: 5,
    backgroundColor: "rgba(18, 24, 30, 0.9)",
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // Camera icon styles (matching user's reference image)
  cameraContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 18,
  },
  cameraTopRow: {
    width: 20,
    height: 3,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 1,
  },
  cameraShutter: {
    width: 3.5,
    height: 2,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    marginRight: 2,
  },
  cameraPrism: {
    width: 9,
    height: 3,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
  cameraBody: {
    width: 21,
    height: 13,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cameraSensorDot: {
    position: "absolute",
    top: 2,
    right: 2.5,
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.4,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraLensInner: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },

  // Progress Bar Chart styles
  progressContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 18,
    gap: 2.5,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },

  // Profile icon styles (outline circle matching glassmorphic design)
  profileCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileHead: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    marginBottom: 1,
  },
  profileBody: {
    width: 11,
    height: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
});
