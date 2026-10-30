import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240
const PADDING_OFFSET = (PICKER_HEIGHT - ITEM_HEIGHT) / 2; // 96

export type WheelDateValue = {
  month: number; // 1 - 12
  day: number;   // 1 - 31
  year: number;  // e.g. 2008
};

interface WheelColumnProps<T> {
  items: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  formatLabel: (item: T) => string;
  flex?: number;
  accessibilityLabel: string;
}

function WheelColumn<T>({
  items,
  selectedValue,
  onSelect,
  formatLabel,
  flex = 1,
  accessibilityLabel
}: WheelColumnProps<T>) {
  const listRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  const selectedIndex = useMemo(() => {
    const idx = items.indexOf(selectedValue);
    return idx >= 0 ? idx : 0;
  }, [items, selectedValue]);

  const [activeIdx, setActiveIdx] = useState(selectedIndex);

  useEffect(() => {
    setActiveIdx(selectedIndex);
    if (!isScrolling.current) {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false
      });
    }
  }, [selectedIndex, items]);

  const onMomentumScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      setActiveIdx(clampedIndex);
      if (items[clampedIndex] !== undefined && items[clampedIndex] !== selectedValue) {
        onSelect(items[clampedIndex]);
      }
    },
    [items, onSelect, selectedValue]
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityY = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(velocityY) < 0.1) {
        isScrolling.current = false;
        const offsetY = e.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
        setActiveIdx(clampedIndex);
        if (items[clampedIndex] !== undefined && items[clampedIndex] !== selectedValue) {
          onSelect(items[clampedIndex]);
        }
      }
    },
    [items, onSelect, selectedValue]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      setActiveIdx(clampedIndex);
    },
    [items]
  );

  return (
    <View style={[styles.column, { flex }]}>
      {/* Individual selection pill inside each column */}
      <View style={styles.columnPill} pointerEvents="none" />

      <FlatList
        ref={listRef}
        data={items}
        style={styles.list}
        keyExtractor={(_, idx) => String(idx)}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={selectedIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: info.index * ITEM_HEIGHT,
              animated: false
            });
          }, 50);
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index
        })}
        onScrollBeginDrag={() => {
          isScrolling.current = true;
        }}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        ListHeaderComponent={<View style={{ height: PADDING_OFFSET }} />}
        ListFooterComponent={<View style={{ height: PADDING_OFFSET }} />}
        accessibilityLabel={accessibilityLabel}
        renderItem={({ item, index }) => {
          const isSelected = index === activeIdx;
          const distance = Math.abs(index - activeIdx);
          const opacity = isSelected ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.2 : 0.08;
          return (
            <Pressable
              style={styles.item}
              onPress={() => {
                isScrolling.current = false;
                listRef.current?.scrollToOffset({
                  offset: index * ITEM_HEIGHT,
                  animated: true
                });
                setActiveIdx(index);
                if (items[index] !== undefined && items[index] !== selectedValue) {
                  onSelect(items[index]);
                }
              }}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                  { opacity }
                ]}
              >
                {formatLabel(item)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export function MobileWheelDatePicker({
  value,
  onChange
}: {
  value: WheelDateValue;
  onChange: (next: WheelDateValue) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 85; y <= currentYear - 10; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const maxDays = useMemo(() => {
    return new Date(value.year, value.month, 0).getDate();
  }, [value.year, value.month]);

  const days = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= maxDays; d++) {
      list.push(d);
    }
    return list;
  }, [maxDays]);

  const months = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  const handleMonthSelect = useCallback((m: number) => {
    const nextMax = new Date(value.year, m, 0).getDate();
    const clampedDay = Math.min(value.day, nextMax);
    onChange({ ...value, month: m, day: clampedDay });
  }, [value, onChange]);

  const handleDaySelect = useCallback((d: number) => {
    onChange({ ...value, day: d });
  }, [value, onChange]);

  const handleYearSelect = useCallback((y: number) => {
    const nextMax = new Date(y, value.month, 0).getDate();
    const clampedDay = Math.min(value.day, nextMax);
    onChange({ ...value, year: y, day: clampedDay });
  }, [value, onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.columns}>
        <WheelColumn
          items={months}
          selectedValue={value.month}
          onSelect={handleMonthSelect}
          formatLabel={(m) => MONTHS[m - 1]}
          flex={1.45}
          accessibilityLabel="Select birth month"
        />
        <WheelColumn
          items={days}
          selectedValue={value.day}
          onSelect={handleDaySelect}
          formatLabel={(d) => String(d).padStart(2, "0")}
          flex={0.85}
          accessibilityLabel="Select birth day"
        />
        <WheelColumn
          items={years}
          selectedValue={value.year}
          onSelect={handleYearSelect}
          formatLabel={(y) => String(y)}
          flex={1.15}
          accessibilityLabel="Select birth year"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    marginVertical: 12
  },
  columns: {
    flexDirection: "row",
    height: "100%",
    paddingHorizontal: 8,
    gap: 8,
    zIndex: 2
  },
  column: {
    height: "100%",
    position: "relative"
  },
  columnPill: {
    position: "absolute",
    top: PADDING_OFFSET,
    left: 2,
    right: 2,
    height: ITEM_HEIGHT,
    backgroundColor: "#EBE9EE",
    borderRadius: 14,
    zIndex: 0,
    elevation: 0
  },
  list: {
    flex: 1,
    zIndex: 10
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    color: "#7E7A85",
    fontWeight: "500"
  },
  itemTextSelected: {
    fontSize: 18,
    color: "#111014",
    fontWeight: "700"
  }
});
