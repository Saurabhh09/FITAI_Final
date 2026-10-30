import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { todayISO, type DayCalorieSummary, type DayRingStatus } from "../dashboard-domain";

type WeeklyCalendarStripProps = {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  daySummaries?: Record<string, DayCalorieSummary>;
  onOpenRingColorsModal?: () => void;
};

type DayItem = {
  dateISO: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  isTouchable: boolean;
  status: DayRingStatus;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyCalendarStrip({
  selectedDate,
  onSelectDate,
  daySummaries,
  onOpenRingColorsModal,
}: WeeklyCalendarStripProps) {
  const days: DayItem[] = useMemo(() => {
    const today = todayISO();
    const todayDate = new Date(today + "T12:00:00Z");
    const result: DayItem[] = [];

    // Show 7 days strictly anchored on today:
    // Past 5 days (-5 to -1), Today (0), Tomorrow (+1).
    // All days after tomorrow (+2 and beyond) are NOT visible.
    for (let offset = -5; offset <= 1; offset++) {
      const d = new Date(todayDate);
      d.setUTCDate(d.getUTCDate() + offset);
      const iso = d.toISOString().split("T")[0];
      const dayName = DAY_NAMES[d.getUTCDay()];
      const dayNumber = String(d.getUTCDate()).padStart(2, "0");
      const isToday = iso === today;
      const isFuture = iso > today;
      // Past 5 days and today are accessible/touchable; tomorrow is not touchable until it becomes today
      const isTouchable = !isFuture;
      const status: DayRingStatus =
        daySummaries?.[iso]?.status || (isFuture ? "future" : "dotted");

      result.push({
        dateISO: iso,
        dayName,
        dayNumber,
        isToday,
        isSelected: iso === selectedDate,
        isFuture,
        isTouchable,
        status,
      });
    }

    return result;
  }, [selectedDate, daySummaries]);

  function getRingStyle(status: DayRingStatus) {
    switch (status) {
      case "on_target":
        return styles.ringGreen;
      case "yellow":
        return styles.ringYellow;
      case "red":
        return styles.ringRed;
      case "dotted":
        return styles.ringDotted;
      case "future":
      default:
        return styles.ringFuture;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.daysRow}>
        {days.map((item) => (
          <Pressable
            key={item.dateISO}
            disabled={!item.isTouchable}
            onPress={() => {
              if (item.isTouchable) {
                onSelectDate(item.dateISO);
              }
            }}
            onLongPress={onOpenRingColorsModal}
            delayLongPress={350}
            style={[
              styles.dayColumn,
              item.isSelected && styles.selectedDayPill,
              !item.isTouchable && styles.nonTouchableDayColumn,
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ disabled: !item.isTouchable }}
            accessibilityLabel={`${item.dayName} ${item.dayNumber}, status: ${item.status}${
              !item.isTouchable ? " (upcoming, not yet accessible)" : ""
            }`}
          >
            <Text
              style={[
                styles.dayLabel,
                item.isSelected && styles.selectedDayLabel,
                !item.isTouchable && styles.futureDayLabel,
              ]}
            >
              {item.dayName}
            </Text>
            <View
              style={[
                styles.circleBase,
                getRingStyle(item.status),
                item.isSelected && styles.circleSelectedBorder,
                !item.isTouchable && styles.futureCircleBase,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  item.isSelected ? styles.selectedDayNumber : styles.unselectedDayNumber,
                  !item.isTouchable && styles.futureDayNumber,
                ]}
              >
                {item.dayNumber}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 24,
    minWidth: 46,
  },
  selectedDayPill: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 6,
  },
  selectedDayLabel: {
    color: "#111111",
    fontWeight: "800",
  },
  circleBase: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  circleSelectedBorder: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ringGreen: {
    borderWidth: 2.5,
    borderColor: "#4ADE80",
    borderStyle: "solid",
    backgroundColor: "#FFFFFF",
  },
  ringYellow: {
    borderWidth: 2.5,
    borderColor: "#FB923C",
    borderStyle: "solid",
    backgroundColor: "#FFFFFF",
  },
  ringRed: {
    borderWidth: 2.5,
    borderColor: "#F87171",
    borderStyle: "solid",
    backgroundColor: "#FFFFFF",
  },
  ringDotted: {
    borderWidth: 2,
    borderColor: "#9CA3AF",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  ringFuture: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  dayNumber: {
    fontSize: 13,
  },
  unselectedDayNumber: {
    color: "#3A3A3C",
    fontWeight: "600",
  },
  selectedDayNumber: {
    color: "#111111",
    fontWeight: "800",
  },
  nonTouchableDayColumn: {
    opacity: 0.65,
  },
  futureDayLabel: {
    color: "#AEAEB2",
  },
  futureCircleBase: {
    opacity: 0.8,
  },
  futureDayNumber: {
    color: "#8E8E93",
    fontWeight: "500",
  },
});
