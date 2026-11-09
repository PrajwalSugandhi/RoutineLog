import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDurationLabel, MAX_DURATION_MINUTES, parseDateKey } from '@/utils/date';

type TimeLog = {
  dateKey: string;
  minutes: number;
};

type HabitTimeChartProps = {
  startDate: string;
  today: string;
  logs: readonly TimeLog[];
};

type ChartPad = { left: number; right: number; top: number; bottom: number };

const PREVIEW_HEIGHT = 220;
const PREVIEW_PAD: ChartPad = { left: 76, right: 16, top: 16, bottom: 36 };
const PREVIEW_DAY_WIDTH = 28;

export function HabitTimeChart({ startDate, today, logs }: HabitTimeChartProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const points = useChartPoints(startDate, today, logs);

  if (points.length === 0) {
    return <ThemedText themeColor="textSecondary">Log how long you spent to see it on the graph.</ThemedText>;
  }

  const fullHeight = Math.max(320, windowHeight - insets.top - insets.bottom - 132);
  const fullPad: ChartPad = {
    left: 76,
    right: showNumbers ? 36 : 20,
    top: showNumbers ? 32 : 20,
    bottom: 40,
  };

  return (
    <>
      <ChartCanvas
        startDate={startDate}
        today={today}
        points={points}
        height={PREVIEW_HEIGHT}
        pad={PREVIEW_PAD}
        dayWidth={PREVIEW_DAY_WIDTH}
        showNumbers={false}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <ThemedView style={styles.screen}>
          <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close graph"
                onPress={() => setOpen(false)}
                style={styles.headerButton}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </Pressable>
              <ThemedText type="smallBold">Minutes</ThemedText>
              <View style={styles.headerButton} />
            </View>
            <View style={styles.toolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: showNumbers }}
                accessibilityLabel={showNumbers ? 'Hide numbers on points' : 'Show numbers on points'}
                onPress={() => setShowNumbers((current) => !current)}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: showNumbers ? theme.accent : theme.backgroundElement,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: showNumbers ? theme.onAccent : theme.text }}>
                  {showNumbers ? 'Hide numbers' : 'Show numbers'}
                </ThemedText>
              </Pressable>
            </View>
            <ChartCanvas
              startDate={startDate}
              today={today}
              points={points}
              height={fullHeight}
              pad={fullPad}
              dayWidth={showNumbers ? 72 : 40}
              showNumbers={showNumbers}
            />
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </>
  );
}

type ChartPoint = {
  dateKey: string;
  minutes: number;
};

function ChartCanvas({
  startDate,
  today,
  points,
  height,
  pad,
  dayWidth,
  showNumbers,
  onPress,
}: {
  startDate: string;
  today: string;
  points: ChartPoint[];
  height: number;
  pad: ChartPad;
  dayWidth: number;
  showNumbers: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const dayCount = Math.max(daysBetween(startDate, today) + 1, 1);
  const plotWidth = Math.max(dayCount - 1, 1) * dayWidth;
  const width = pad.left + plotWidth + pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const scale = yScale(points.map((point) => point.minutes));
  const placed = points.map((point) => ({
    ...point,
    x: pad.left + daysBetween(startDate, point.dateKey) * dayWidth,
    y: yFor(point.minutes, scale, innerHeight, pad),
  }));
  const segments = lineSegments(placed);
  const yTicks = [...new Set([scale.max, Math.round((scale.min + scale.max) / 2), scale.min])];
  const xTicks = dateTicks(startDate, today, dayCount);
  const label = `Minutes graph from ${startDate} to ${today}, ${points.length} logged ${points.length === 1 ? 'day' : 'days'}`;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [dayCount, dayWidth, points.length]);

  const chart = (
    <View accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height}>
        {yTicks.map((minutes, index) => {
          const y = yFor(minutes, scale, innerHeight, pad);
          return (
            <Line
              key={`grid-${index}`}
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke={theme.border}
              strokeWidth={1}
            />
          );
        })}
        {yTicks.map((minutes, index) => (
          <SvgText
            key={`y-${index}`}
            x={pad.left - 8}
            y={yFor(minutes, scale, innerHeight, pad) + 4}
            fill={theme.textSecondary}
            fontSize={11}
            textAnchor="end">
            {formatDurationLabel(minutes)}
          </SvgText>
        ))}
        {segments.map((segment, index) => (
          <Polyline
            key={`line-${index}`}
            points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {placed.map((point) => (
          <Circle key={point.dateKey} cx={point.x} cy={point.y} r={showNumbers ? 5 : 4} fill={theme.accent} />
        ))}
        {showNumbers
          ? placed.map((point) => (
              <SvgText
                key={`n-${point.dateKey}`}
                x={point.x}
                y={point.y - 12}
                fill={theme.text}
                fontSize={12}
                fontWeight="700"
                textAnchor="middle">
                {String(point.minutes)}
              </SvgText>
            ))
          : null}
        {xTicks.map((dateKey) => (
          <SvgText
            key={dateKey}
            x={pad.left + daysBetween(startDate, dateKey) * dayWidth}
            y={height - 12}
            fill={theme.textSecondary}
            fontSize={11}
            textAnchor="middle">
            {shortDate(dateKey)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open graph full screen" onPress={onPress}>
          {chart}
        </Pressable>
      ) : (
        chart
      )}
    </ScrollView>
  );
}

function useChartPoints(startDate: string, today: string, logs: readonly TimeLog[]): ChartPoint[] {
  return useMemo(() => {
    const byDate = new Map<string, number>();
    for (const log of logs) {
      if (log.dateKey < startDate || log.dateKey > today) continue;
      if (!Number.isInteger(log.minutes) || log.minutes < 0 || log.minutes > MAX_DURATION_MINUTES) continue;
      byDate.set(log.dateKey, log.minutes);
    }
    return [...byDate.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([dateKey, minutes]) => ({ dateKey, minutes }));
  }, [logs, startDate, today]);
}

type PlacedPoint = ChartPoint & { x: number; y: number };

function lineSegments(points: PlacedPoint[]): PlacedPoint[][] {
  const segments: PlacedPoint[][] = [];
  let current: PlacedPoint[] = [];
  for (const point of points) {
    const previous = current[current.length - 1];
    if (previous && addDays(previous.dateKey, 1) !== point.dateKey) {
      if (current.length > 1) segments.push(current);
      current = [point];
    } else {
      current.push(point);
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

function yScale(minutes: number[]): { min: number; max: number } {
  const peak = minutes.length === 0 ? 0 : Math.max(...minutes);
  return { min: 0, max: Math.max(30, Math.ceil(peak * 1.15)) };
}

function yFor(
  minutes: number,
  scale: { min: number; max: number },
  innerHeight: number,
  pad: ChartPad,
): number {
  const span = scale.max - scale.min || 1;
  return pad.top + (1 - (minutes - scale.min) / span) * innerHeight;
}

function dateTicks(start: string, today: string, dayCount: number): string[] {
  if (dayCount <= 1) return [start];
  const steps = Math.min(dayCount < 14 ? 3 : 4, dayCount);
  const ticks: string[] = [];
  for (let index = 0; index < steps; index += 1) {
    const dayIndex = Math.round((index * (dayCount - 1)) / (steps - 1));
    ticks.push(addDays(start, dayIndex));
  }
  return [...new Set(ticks)];
}

function daysBetween(start: string, end: string): number {
  const elapsed = parseDateKey(end).getTime() - parseDateKey(start).getTime();
  return Math.max(0, Math.round(elapsed / 86_400_000));
}

function shortDate(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseDateKey(dateKey));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    alignItems: 'flex-start',
  },
  toggle: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
