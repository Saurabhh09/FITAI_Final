import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { DashboardScreen } from "../dashboard/dashboard-screen";
import { CameraScreen } from "../camera/camera-screen";
import { ProgressScreen } from "../progress/progress-screen";
import { ProfileScreen } from "../profile/profile-screen";
import { FloatingTabDock, type TabType } from "./floating-tab-dock";
import { AddFoodModal } from "../food-logging/add-food-modal";
import { todayISO } from "../dashboard/dashboard-domain";
import { useTheme } from "../../lib/theme-context";

export function MainTabShell() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleFoodAdded() {
    setIsAddFoodModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Tab Screen Content */}
      <View style={styles.content}>
        {activeTab === "home" && (
          <DashboardScreen
            key={`dashboard-${refreshTrigger}`}
            showFloatingButton={false}
          />
        )}
        {activeTab === "camera" && (
          <CameraScreen
            onOpenManualLog={() => setIsAddFoodModalOpen(true)}
            onMealLogged={() => {
              setRefreshTrigger((prev) => prev + 1);
              setActiveTab("home");
            }}
          />
        )}
        {activeTab === "progress" && (
          <ProgressScreen key={`progress-${refreshTrigger}`} />
        )}
        {activeTab === "profile" && (
          <ProfileScreen
            onProfileUpdated={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
      </View>

      {/* Floating Bottom Tab Dock with + Action Button */}
      <FloatingTabDock
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab)}
        onPlusPress={() => setIsAddFoodModalOpen(true)}
      />

      {/* Global Quick Add Food Modal */}
      <AddFoodModal
        visible={isAddFoodModalOpen}
        initialMealType="Breakfast"
        selectedDate={selectedDate}
        onClose={() => setIsAddFoodModalOpen(false)}
        onSuccess={handleFoodAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  content: {
    flex: 1,
  },
});
