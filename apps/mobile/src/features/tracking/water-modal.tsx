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
  calculateWaterProgress,
  QUICK_WATER_AMOUNTS_ML,
  validateWaterAmount,
} from "./tracking-domain";
import { logWaterApi } from "./tracking-api";

type WaterModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: string;
  currentConsumedMl: number;
  targetWaterMl: number;
};

export function WaterModal({
  visible,
  onClose,
  onSuccess,
  selectedDate,
  currentConsumedMl,
  targetWaterMl,
}: WaterModalProps) {
  const { session } = useAuth();
  const [customAmount, setCustomAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const progress = calculateWaterProgress(currentConsumedMl, targetWaterMl);

  async function handleAddWater(amountToAdd: number) {
    if (!session?.access_token) {
      setErrorMessage("Authentication session required to log water.");
      return;
    }

    const validation = validateWaterAmount(amountToAdd);
    if (!validation.ok) {
      setErrorMessage(validation.error);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const newTotal = currentConsumedMl + validation.volumeMl;
    const res = await logWaterApi(selectedDate, newTotal, session.access_token);
    setSaving(false);

    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }

    setCustomAmount("");
    onSuccess();
  }

  async function handleCustomAdd() {
    const trimmed = customAmount.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a custom water amount.");
      return;
    }
    const val = Number(trimmed);
    await handleAddWater(val);
  }

  async function handleResetWater() {
    if (!session?.access_token) return;
    setSaving(true);
    setErrorMessage(null);

    const res = await logWaterApi(selectedDate, 0, session.access_token);
    setSaving(false);

    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }

    setCustomAmount("");
    onSuccess();
  }

  function handleDismiss() {
    if (saving) return;
    setErrorMessage(null);
    setCustomAmount("");
    onClose();
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
              <Text style={styles.title}>Track Water Intake</Text>
              <Text style={styles.subtitle}>Date: {selectedDate}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close water tracker"
              onPress={handleDismiss}
              disabled={saving}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Progress & Current Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>TODAY'S INTAKE</Text>
                  <Text style={styles.summaryValue}>
                    {progress.consumedMl} <Text style={styles.summaryUnit}>ml</Text>
                  </Text>
                </View>
                <View style={styles.targetCol}>
                  <Text style={styles.targetLabel}>Target: {progress.targetMl} ml</Text>
                  <Text style={styles.remainingLabel}>
                    {progress.isOverTarget
                      ? `Goal met (+${progress.consumedMl - progress.targetMl} ml)`
                      : progress.remainingMl === 0
                      ? "Daily goal reached! 🎉"
                      : `${progress.remainingMl} ml remaining`}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, progress.percentage)}%`,
                      backgroundColor: progress.isGoalMet ? "#78B887" : "#739BCB",
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressCaption}>
                {progress.percentage}% of daily hydration target
              </Text>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Quick Add Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK ADD</Text>
              <View style={styles.quickGrid}>
                {QUICK_WATER_AMOUNTS_ML.map((amount) => (
                  <Pressable
                    key={amount}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${amount} milliliters`}
                    disabled={saving}
                    onPress={() => handleAddWater(amount)}
                    style={({ pressed }) => [
                      styles.quickButton,
                      pressed && styles.pressed,
                      saving && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.quickIcon}>💧</Text>
                    <Text style={styles.quickAmount}>+{amount} ml</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CUSTOM AMOUNT</Text>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  keyboardType="numeric"
                  placeholder="e.g. 400"
                  placeholderTextColor="#9CA3AF"
                  value={customAmount}
                  onChangeText={(val) => {
                    setCustomAmount(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!saving}
                  accessibilityLabel="Custom water amount in milliliters"
                />
                <Text style={styles.customUnit}>ml</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add custom amount"
                  disabled={saving || !customAmount.trim()}
                  onPress={handleCustomAdd}
                  style={({ pressed }) => [
                    styles.customAddBtn,
                    (saving || !customAmount.trim()) && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.customAddBtnText}>Add Water</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Reset day total if needed */}
            {currentConsumedMl > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset water for today"
                disabled={saving}
                onPress={handleResetWater}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset Today's Total to 0 ml</Text>
              </Pressable>
            ) : null}
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
  summaryCard: {
    backgroundColor: "#F0F7FD",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9E8F6",
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2B6CB0",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E4E80",
    marginTop: 2,
  },
  summaryUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B6CB0",
  },
  targetCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  remainingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B6CB0",
  },
  progressBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressCaption: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "right",
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
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickButton: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  quickIcon: {
    fontSize: 16,
  },
  quickAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  customUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  customAddBtn: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  resetButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  resetButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
