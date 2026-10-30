import React from "react";
import { StyleSheet, Text, View } from "react-native";

type IconProps = {
  color?: string;
  size?: number;
};

/**
 * 1. Personal Details Icon (Briefcase / ID card silhouette from reference image)
 */
export function PersonalDetailsIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {/* Handle */}
      <View
        style={{
          width: 8,
          height: 3,
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderRightWidth: 1.5,
          borderColor: color,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
          marginBottom: 1,
        }}
      />
      {/* Card/Bag Body */}
      <View
        style={{
          width: 16,
          height: 12,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 3,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 6, height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * 2. Preferences Icon (Gear outline)
 */
export function PreferencesIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {/* Outer gear ring */}
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Center hole */}
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: color,
          }}
        />
      </View>
      {/* Gear teeth notches */}
      <View style={[styles.notch, { top: 0, width: 2.5, height: 2, backgroundColor: color }]} />
      <View style={[styles.notch, { bottom: 0, width: 2.5, height: 2, backgroundColor: color }]} />
      <View style={[styles.notch, { left: 0, width: 2, height: 2.5, backgroundColor: color }]} />
      <View style={[styles.notch, { right: 0, width: 2, height: 2.5, backgroundColor: color }]} />
    </View>
  );
}

/**
 * 3. Language Icon (文A character icon)
 */
export function LanguageIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Text style={{ fontSize: 13, fontWeight: "700", color, letterSpacing: -1 }}>文A</Text>
    </View>
  );
}

/**
 * 4. Nutrition Goals Icon (Ring / target circle)
 */
export function NutritionGoalsIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 17,
          height: 17,
          borderRadius: 8.5,
          borderWidth: 2,
          borderColor: color,
          borderStyle: "dashed",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * 5. Goal & Current Weight Icon (Flag outline)
 */
export function GoalWeightIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size, alignItems: "flex-start", paddingLeft: 2 }]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Pole */}
        <View style={{ width: 2, height: 16, backgroundColor: color, borderRadius: 1 }} />
        {/* Flag pennant */}
        <View
          style={{
            width: 11,
            height: 9,
            backgroundColor: color,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            marginLeft: 0.5,
          }}
        />
      </View>
    </View>
  );
}

/**
 * 6. Weight History Icon (Clock with hands)
 */
export function WeightHistoryIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Clock Hands */}
        <View style={{ position: "absolute", top: 3.5, width: 1.5, height: 5, backgroundColor: color }} />
        <View style={{ position: "absolute", left: 7.5, width: 4.5, height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * 7. Ring Colors Explained Icon (Circular loop)
 */
export function RingColorsIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2.2,
          borderColor: color,
        }}
      />
    </View>
  );
}

/**
 * 8. Request a Feature Icon (Megaphone silhouette)
 */
export function RequestFeatureIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Text style={{ fontSize: 14, fontWeight: "600", color }}>📢</Text>
    </View>
  );
}

/**
 * 9. Support Email Icon (Envelope outline)
 */
export function SupportEmailIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 16,
          height: 12,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 2,
          justifyContent: "flex-start",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: 10,
            height: 6,
            borderBottomWidth: 1.5,
            borderLeftWidth: 1.5,
            borderRightWidth: 1.5,
            borderColor: color,
            transform: [{ rotate: "45deg" }],
            marginTop: -3,
          }}
        />
      </View>
    </View>
  );
}

/**
 * 10. Terms and Conditions Icon (Document page outline)
 */
export function TermsIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 13,
          height: 16,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 2,
          padding: 2,
          justifyContent: "space-around",
        }}
      >
        <View style={{ width: 6, height: 1.5, backgroundColor: color }} />
        <View style={{ width: 7, height: 1.5, backgroundColor: color }} />
        <View style={{ width: 5, height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * 11. Privacy Policy Icon (Shield outline)
 */
export function PrivacyIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 14,
          height: 16,
          borderWidth: 1.5,
          borderColor: color,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: 7,
          borderBottomRightRadius: 7,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 2, height: 6, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * 12. Logout Icon (In app theme black #111111 - door with exit arrow)
 */
export function LogoutIcon({ color = "#111111", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Door Frame */}
        <View
          style={{
            width: 10,
            height: 15,
            borderWidth: 1.5,
            borderColor: color,
            borderRightWidth: 0,
            borderTopLeftRadius: 2,
            borderBottomLeftRadius: 2,
          }}
        />
        {/* Arrow pointing right */}
        <Text style={{ fontSize: 13, fontWeight: "700", color, marginLeft: -1 }}>→</Text>
      </View>
    </View>
  );
}

/**
 * 13. Delete Account Icon (Red #E53935 silhouette)
 */
export function DeleteAccountIcon({ color = "#E53935", size = 20 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {/* Person silhouette */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginBottom: 1,
        }}
      />
      <View
        style={{
          width: 13,
          height: 6,
          backgroundColor: color,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        }}
      />
      {/* Minus badge */}
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 1,
          width: 6,
          height: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * 14. Pencil Edit Icon
 */
export function PencilEditIcon({ color = "#8E8E93", size = 14 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 10,
          height: 3,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

/**
 * 15. User Avatar Graphic (Header circle)
 */
export function UserAvatarIcon({ color = "#111111", size = 30 }: IconProps) {
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: color,
          marginBottom: 2,
        }}
      />
      <View
        style={{
          width: 20,
          height: 9,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notch: {
    position: "absolute",
    borderRadius: 1,
  },
});
