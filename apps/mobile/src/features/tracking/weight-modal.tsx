import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth/auth-context";
import {
  formatWeightDisplay,
  kgToLb,
  lbToKg,
  validateWeightInput,
  type WeightUnit,
} from "./tracking-domain";
import { logWeightApi } from "./tracking-api";

type WeightModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  latestWeightKg: number | null;
  baselineWeightKg: number;
  targetWeightKg: number | null;
};

export function WeightModal({
  visible,
  onClose,
  onSuccess,
  latestWeightKg,
  baselineWeightKg,
  targetWeightKg,
}: WeightModalProps) {
  const { session } = useAuth();
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [weightInput, setWeightInput] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute live conversion preview
  const numInput = Number(weightInput.trim());
  let livePreviewKg: number | null = null;
  if (weightInput.trim() !== "" && Number.isFinite(numInput) && numInput > 0) {
    livePreviewKg = unit === "lb" ? lbToKg(numInput) : numInput;
  }

  async function handleSaveWeight() {
    if (!session?.access_token) {
      setErrorMessage("Authentication session required to log weight.");
      return;
    }

    const validation = validateWeightInput(weightInput, unit);
    if (!validation.ok) {
      setErrorMessage(validation.error);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const recordedAt = new Date().toISOString();
    const res = await logWeightApi(
      validation.weightKg,
      recordedAt,
      session.access_token,
      note.trim() ? note.trim() : undefined
    );

    setSaving(false);

    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }

    setWeightInput("");
    setNote("");
    onSuccess();
  }

  function handleDismiss() {
    if (saving) return;
    setErrorMessage(null);
    setWeightInput("");
    setNote("");
    onClose();
  }

  function handleUnitSwitch(newUnit: WeightUnit) {
    if (newUnit === unit) return;
    setUnit(newUnit);
    // If user already typed a value, convert it seamlessly
    const currentNum = Number(weightInput.trim());
    if (weightInput.trim() !== "" && Number.isFinite(currentNum) && currentNum > 0) {
      if (newUnit === "lb") {
        setWeightInput(String(kgToLb(currentNum)));
      } else {
        setWeightInput(String(lbToKg(currentNum)));
      }
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Log Body Weight</Text>
              <Text style={styles.subtitle}>Record your daily weigh-in</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close weight logger"
              onPress={handleDismiss}
              disabled={saving}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Context Card */}
            <View style={styles.contextCard}>
              <View style={styles.contextRow}>
                <View style={styles.contextCol}>
                  <Text style={styles.contextLabel}>LATEST WEIGH-IN</Text>
                  <Text style={styles.contextValue}>
                    {latestWeightKg !== null ? formatWeightDisplay(latestWeightKg, unit) : "None yet"}
                  </Text>
                </View>
                <View style={styles.contextCol}>
                  <Text style={styles.contextLabel}>BASELINE</Text>
                  <Text style={styles.contextValue}>{formatWeightDisplay(baselineWeightKg, unit)}</Text>
                </View>
                {targetWeightKg !== null ? (
                  <View style={styles.contextCol}>
                    <Text style={styles.contextLabel}>TARGET</Text>
                    <Text style={styles.contextValue}>{formatWeightDisplay(targetWeightKg, unit)}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Unit Selector */}
            <View style={styles.unitSelector}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set unit to kilograms"
                disabled={saving}
                onPress={() => handleUnitSwitch("kg")}
                style={[styles.unitTab, unit === "kg" && styles.unitTabActive]}
              >
                <Text style={[styles.unitTabText, unit === "kg" && styles.unitTabTextActive]}>
                  Kilograms (kg)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set unit to pounds"
                disabled={saving}
                onPress={() => handleUnitSwitch("lb")}
                style={[styles.unitTab, unit === "lb" && styles.unitTabActive]}
              >
                <Text style={[styles.unitTabText, unit === "lb" && styles.unitTabTextActive]}>
                  Pounds (lb)
                </Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Input Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WEIGHT ({unit.toUpperCase()})</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.weightInput}
                  keyboardType="numeric"
                  placeholder={unit === "kg" ? "e.g. 78.5" : "e.g. 173.0"}
                  placeholderTextColor="#9CA3AF"
                  value={weightInput}
                  onChangeText={(val) => {
                    setWeightInput(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!saving}
                  accessibilityLabel={`Weight value in ${unit}`}
                />
                <Text style={styles.unitSuffix}>{unit}</Text>
              </View>

              {/* Conversion preview */}
              {livePreviewKg !== null ? (
                <Text style={styles.conversionPreview}>
                  Canonical database storage: {livePreviewKg} kg
                </Text>
              ) : null}
            </View>

            {/* Optional Note */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Morning empty stomach"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                editable={!saving}
                maxLength={100}
                accessibilityLabel="Optional note for this weigh-in"
              />
            </View>

            {/* Non-recalculation disclosure */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Weight entries track progress over time. Logging a new weight will not modify your nutrition targets.
              </Text>
            </View>

            {/* Save Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save body weight"
              disabled={saving || !weightInput.trim()}
              onPress={handleSaveWeight}
              style={({ pressed }) => [
                styles.saveButton,
                (saving || !weightInput.trim()) && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Weight</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  contextCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contextRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  contextCol: {
    alignItems: "center",
    gap: 2,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  unitSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  unitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  unitTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  unitTabTextActive: {
    color: "#111827",
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "500",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  weightInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 22,
    color: "#111827",
    fontWeight: "700",
  },
  unitSuffix: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
  conversionPreview: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
