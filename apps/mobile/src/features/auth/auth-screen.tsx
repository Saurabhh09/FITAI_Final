import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./auth-context";

export type AuthScreenProps = {
  initialMode?: "signin" | "signup";
  onBack?: () => void;
};

export function AuthScreen({ initialMode = "signin", onBack }: AuthScreenProps = {}) {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy) return;
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const res = await signIn(trimmedEmail, password);
        if (!res.ok) {
          setError(res.error || "Email or password is incorrect.");
        }
      } else {
        const res = await signUp(trimmedEmail, password, displayName);
        if (!res.ok) {
          setError(res.error || "Could not create account. Please check your details.");
        } else if (res.requiresEmailConfirmation) {
          setMessage("Account created. Please check your email for a confirmation link before signing in.");
          setMode("signin");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.headerRow}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={onBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <Text style={styles.backButtonArrow}>‹</Text>
              </Pressable>
            ) : null}
            <View style={styles.brandRow} accessibilityLabel="FITAI">
              <View style={styles.brandMark} accessible accessibilityLabel="FITAI mark">
                <Text style={styles.brandLetter}>F</Text>
              </View>
              <Text style={styles.brandName}>FITAI</Text>
            </View>
          </View>

          {/* Card Container */}
          <View style={styles.card}>
            <View style={styles.tabRow}>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel="Sign in tab"
                accessibilityState={{ selected: mode === "signin" }}
                onPress={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
                style={[styles.tabButton, mode === "signin" && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, mode === "signin" && styles.tabButtonTextActive]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel="Create account tab"
                accessibilityState={{ selected: mode === "signup" }}
                onPress={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
                style={[styles.tabButton, mode === "signup" && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, mode === "signup" && styles.tabButtonTextActive]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>
                {mode === "signin" ? "Welcome back." : "Start your journey."}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "signin"
                  ? "Sign in to access your personalized nutrition plan."
                  : "Create a secure account with your email and password."}
              </Text>
            </View>

            {!configured && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Configuration Required</Text>
                <Text style={styles.warningBody}>
                  Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {message && (
              <View style={styles.messageBox} accessibilityRole="summary">
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            <View style={styles.form}>
              {mode === "signup" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#A09DA5"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    editable={!busy}
                    accessibilityLabel="Full name input"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#A09DA5"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!busy}
                  accessibilityLabel="Email input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder={mode === "signup" ? "At least 12 characters" : "Password"}
                  placeholderTextColor="#A09DA5"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!busy}
                  accessibilityLabel="Password input"
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mode === "signin" ? "Sign in button" : "Create account button"}
                disabled={busy}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  busy && styles.buttonDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "signin" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F7FB",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonArrow: {
    fontSize: 26,
    lineHeight: 28,
    color: "#211F25",
    fontWeight: "300",
    marginTop: -2,
  },
  brandRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#211F25",
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  brandName: {
    color: "#211F25",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F4F3F7",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#77747C",
  },
  tabButtonTextActive: {
    color: "#211F25",
    fontWeight: "700",
  },
  header: {
    marginBottom: 20,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#211F25",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: "#77747C",
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFE082",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  warningTitle: {
    color: "#8D6E00",
    fontSize: 13,
    fontWeight: "700",
  },
  warningBody: {
    color: "#8D6E00",
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: "#FDF2F2",
    borderColor: "#FBD5D5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#9B1C1C",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  messageBox: {
    backgroundColor: "#EDF8F1",
    borderColor: "#DEF7EC",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    color: "#03543F",
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#211F25",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#211F25",
    backgroundColor: "#FAFAFC",
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#211F25",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
