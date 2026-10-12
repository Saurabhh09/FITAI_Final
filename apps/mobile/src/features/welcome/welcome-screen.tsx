import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export type WelcomeScreenProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

// Original image dimensions: 512 x 1024 (aspect ratio 1:2)
const IMAGE_ASPECT_RATIO = 512 / 1024;
const NATIVE_IMAGE_WIDTH = 512;
const NATIVE_IMAGE_HEIGHT = 1024;

// Precise coordinate bounds measured directly from apps/mobile/assets/welcome-screen.png:
// 1. "Get Started" pill button:
//    top: 906, bottom: 959, left: 33, right: 478 (width: 445, height: 53)
const BUTTON_TOP_RATIO = 906 / NATIVE_IMAGE_HEIGHT;
const BUTTON_LEFT_RATIO = 33 / NATIVE_IMAGE_WIDTH;
const BUTTON_WIDTH_RATIO = 445 / NATIVE_IMAGE_WIDTH;
const BUTTON_HEIGHT_RATIO = 53 / NATIVE_IMAGE_HEIGHT;

// 2. "Already have an account? Sign In" prompt line:
//    top: 970, height: 40 (envelopes prompt line and "Sign In" text with comfortable touch target)
const SIGNIN_TOP_RATIO = 970 / NATIVE_IMAGE_HEIGHT;
const SIGNIN_LEFT_RATIO = 100 / NATIVE_IMAGE_WIDTH;
const SIGNIN_WIDTH_RATIO = 312 / NATIVE_IMAGE_WIDTH;
const SIGNIN_HEIGHT_RATIO = 40 / NATIVE_IMAGE_HEIGHT;

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const safeWidth = Math.max(0, windowWidth - insets.left - insets.right);
  const safeHeight = Math.max(0, windowHeight - insets.top - insets.bottom);

  // Responsive scaling to adapt to various Android screen heights and widths:
  // On standard tall devices (18:9, 19.5:9, 20:9), the image fits safeHeight.
  // We constrain containerWidth to safeWidth and containerHeight to safeHeight
  // while strictly preserving the 1:2 aspect ratio.
  const minScrollableHeight = 540;

  let containerHeight: number;
  let containerWidth: number;

  if (safeHeight >= safeWidth * 2) {
    // Taller than 1:2 -> width is the constraint
    containerWidth = safeWidth;
    containerHeight = safeWidth * 2;
  } else if (safeHeight >= minScrollableHeight) {
    // Shorter than 1:2 but comfortably tall -> height is the constraint
    containerHeight = safeHeight;
    containerWidth = safeHeight * IMAGE_ASPECT_RATIO;
  } else {
    // Very short/landscape -> enforce comfortable minimum and enable scroll
    containerHeight = minScrollableHeight;
    containerWidth = minScrollableHeight * IMAGE_ASPECT_RATIO;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.imageContainer,
            {
              width: containerWidth,
              height: containerHeight,
            },
          ]}
        >
          <Image
            source={require("../../../assets/welcome-screen.png")}
            style={styles.image}
            resizeMode="contain"
            accessible
            accessibilityLabel="FitAI Meal Scanner - Calorie tracking made easy. Scan meals, track calories and build healthy habits with AI."
          />

          {/* Interactive Get Started Button Overlay */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            onPress={onGetStarted}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.getStartedButton,
              {
                top: containerHeight * BUTTON_TOP_RATIO,
                left: containerWidth * BUTTON_LEFT_RATIO,
                width: containerWidth * BUTTON_WIDTH_RATIO,
                height: containerHeight * BUTTON_HEIGHT_RATIO,
                borderRadius: containerHeight * (BUTTON_HEIGHT_RATIO / 2),
              },
              pressed && styles.getStartedPressed,
            ]}
          />

          {/* Interactive Sign In Button Overlay */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            onPress={onSignIn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.signInButton,
              {
                top: containerHeight * SIGNIN_TOP_RATIO,
                left: containerWidth * SIGNIN_LEFT_RATIO,
                width: containerWidth * SIGNIN_WIDTH_RATIO,
                height: containerHeight * SIGNIN_HEIGHT_RATIO,
              },
              pressed && styles.signInPressed,
            ]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  getStartedButton: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  getStartedPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  signInButton: {
    position: "absolute",
    backgroundColor: "transparent",
    borderRadius: 8,
  },
  signInPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },
});
