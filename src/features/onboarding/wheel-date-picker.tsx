"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ITEM_HEIGHT = 48; // px per item
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240px
const PADDING_OFFSET = (PICKER_HEIGHT - ITEM_HEIGHT) / 2; // 96px

export type WheelDateValue = {
  month: number; // 1 - 12
  day: number;   // 1 - 31
  year: number;  // e.g. 2001
};

interface WheelColumnProps<T> {
  items: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  formatLabel: (item: T) => string;
  ariaLabel: string;
}

function WheelColumn<T>({
  items,
  selectedValue,
  onSelect,
  formatLabel,
  ariaLabel
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const lastReportedValueRef = useRef<T | null>(selectedValue);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = useMemo(() => {
    const idx = items.indexOf(selectedValue);
    return idx >= 0 ? idx : 0;
  }, [items, selectedValue]);

  const [activeIdx, setActiveIdx] = useState(selectedIndex);

  // Synchronize DOM scrollTop with selectedIndex
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If selectedValue changed because of our own user-scroll settling, skip resetting scrollTop
    if (lastReportedValueRef.current === selectedValue && mountedRef.current) {
      setActiveIdx(selectedIndex);
      return;
    }

    const target = selectedIndex * ITEM_HEIGHT;
    container.scrollTop = target;
    setActiveIdx(selectedIndex);
    lastReportedValueRef.current = selectedValue;

    if (!mountedRef.current) {
      // Allow DOM layout to complete before accepting scroll events
      requestAnimationFrame(() => {
        mountedRef.current = true;
      });
    }
  }, [selectedIndex, items, selectedValue]);

  // Handle native wheel / touchpad / touch scrolling
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || !mountedRef.current) return;

    const scrollTop = container.scrollTop;
    const currentIdx = Math.max(0, Math.min(items.length - 1, Math.round(scrollTop / ITEM_HEIGHT)));
    setActiveIdx(currentIdx);

    // Debounce scroll settling to commit selection
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const finalIdx = Math.max(
        0,
        Math.min(items.length - 1, Math.round(containerRef.current.scrollTop / ITEM_HEIGHT))
      );
      setActiveIdx(finalIdx);

      const settledItem = items[finalIdx];
      if (settledItem !== undefined && settledItem !== selectedValue) {
        lastReportedValueRef.current = settledItem;
        onSelect(settledItem);
      }
    }, 80);
  };

  // Clicking an item smoothly scrolls it to the center and commits selection
  const handleItemClick = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    setActiveIdx(index);
    const target = index * ITEM_HEIGHT;
    container.scrollTo({ top: target, behavior: "smooth" });

    const item = items[index];
    if (item !== undefined && item !== selectedValue) {
      lastReportedValueRef.current = item;
      onSelect(item);
    }
  };

  return (
    <div className="wheel-column">
      <div
        ref={containerRef}
        className="wheel-scroll-container"
        onScroll={handleScroll}
        tabIndex={0}
        role="listbox"
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = Math.max(0, selectedIndex - 1);
            handleItemClick(prev);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.min(items.length - 1, selectedIndex + 1);
            handleItemClick(next);
          }
        }}
      >
        <div style={{ height: PADDING_OFFSET }} aria-hidden="true" />
        {items.map((item, index) => {
          const isSelected = index === activeIdx;
          const distance = Math.abs(index - activeIdx);
          const opacity = isSelected ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.22 : 0.08;

          return (
            <div
              key={index}
              className={`wheel-item ${isSelected ? "selected" : ""}`}
              style={{
                height: ITEM_HEIGHT,
                opacity
              }}
              onClick={() => handleItemClick(index)}
              role="option"
              aria-selected={isSelected}
            >
              {formatLabel(item)}
            </div>
          );
        })}
        <div style={{ height: PADDING_OFFSET }} aria-hidden="true" />
      </div>
    </div>
  );
}

export function WheelDatePicker({
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

  const handleMonthSelect = useCallback(
    (m: number) => {
      const nextMax = new Date(value.year, m, 0).getDate();
      const clampedDay = Math.min(value.day, nextMax);
      onChange({ ...value, month: m, day: clampedDay });
    },
    [value, onChange]
  );

  const handleDaySelect = useCallback(
    (d: number) => {
      onChange({ ...value, day: d });
    },
    [value, onChange]
  );

  const handleYearSelect = useCallback(
    (y: number) => {
      const nextMax = new Date(y, value.month, 0).getDate();
      const clampedDay = Math.min(value.day, nextMax);
      onChange({ ...value, year: y, day: clampedDay });
    },
    [value, onChange]
  );

  return (
    <div className="wheel-date-picker-wrapper">
      {/* Centered selection highlight pill bar */}
      <div className="wheel-selection-highlight" aria-hidden="true" />

      {/* Top & bottom gradient overlay masks */}
      <div className="wheel-gradient-top" aria-hidden="true" />
      <div className="wheel-gradient-bottom" aria-hidden="true" />

      {/* 3 distinct columns: Month, Day, Year */}
      <div className="wheel-columns">
        <WheelColumn
          items={months}
          selectedValue={value.month}
          onSelect={handleMonthSelect}
          formatLabel={(m) => MONTHS[m - 1]}
          ariaLabel="Select birth month"
        />
        <WheelColumn
          items={days}
          selectedValue={value.day}
          onSelect={handleDaySelect}
          formatLabel={(d) => String(d).padStart(2, "0")}
          ariaLabel="Select birth day"
        />
        <WheelColumn
          items={years}
          selectedValue={value.year}
          onSelect={handleYearSelect}
          formatLabel={(y) => String(y)}
          ariaLabel="Select birth year"
        />
      </div>
    </div>
  );
}
