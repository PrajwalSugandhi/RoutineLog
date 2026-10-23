import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type GestureResponderHandlers } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarView } from '@/utils/calendar';

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

type HomeHeaderProps = {
  title: string;
  detail?: string;
  view: CalendarView;
  reviewDetail: string;
  swipeHint: string;
  swipeHandlers: GestureResponderHandlers;
  onChangeView: (view: CalendarView) => void;
  onReview: () => void;
  onToday?: () => void;
  trailingInset?: number;
};

type MenuKind = 'view' | 'more';

export function HomeHeader({
  title,
  detail,
  view,
  reviewDetail,
  swipeHint,
  swipeHandlers,
  onChangeView,
  onReview,
  onToday,
  trailingInset = 0,
}: HomeHeaderProps) {
  const theme = useTheme();
  const actionsRef = useRef<View>(null);
  const [menu, setMenu] = useState<MenuKind | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const viewLabel = VIEWS.find((option) => option.value === view)?.label ?? 'Week';

  function openMenu(next: MenuKind) {
    actionsRef.current?.measureInWindow((_x, y, _width, height) => {
      setMenuTop(y + height + Spacing.two);
      setMenu(next);
    });
  }

  function choose(action: () => void) {
    setMenu(null);
    action();
  }

  return (
    <View style={[styles.row, trailingInset > 0 && { paddingRight: trailingInset }]}>
      <View
        accessibilityRole="header"
        accessibilityHint={swipeHint}
        style={styles.titleBlock}
        {...swipeHandlers}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>

      <View ref={actionsRef} collapsable={false} style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change view, ${viewLabel}`}
          accessibilityHint="Opens week and month"
          onPress={() => openMenu('view')}
          hitSlop={4}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <ViewIcon view={view} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => openMenu('more')}
          hitSlop={4}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <View style={styles.dots}>
            <Dot color={theme.text} />
            <Dot color={theme.text} />
            <Dot color={theme.text} />
          </View>
        </Pressable>
      </View>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close menu" style={styles.backdrop} onPress={() => setMenu(null)} />
          <View
            onStartShouldSetResponder={() => true}
            style={[
              styles.menu,
              {
                top: menuTop,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            {menu === 'view'
              ? VIEWS.map((option) => (
                  <MenuRow
                    key={option.value}
                    label={option.label}
                    selected={option.value === view}
                    onPress={() => choose(() => onChangeView(option.value))}
                  />
                ))
              : null}
            {menu === 'more' ? (
              <>
                <MenuRow
                  label="Review this day"
                  detail={reviewDetail}
                  onPress={() => choose(onReview)}
                />
                {onToday ? <MenuRow label="Go to today" onPress={() => choose(onToday)} /> : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <View style={styles.menuCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {selected ? <ThemedText style={{ color: theme.accent }}>✓</ThemedText> : null}
    </Pressable>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function ViewIcon({ view, color }: { view: CalendarView; color: string }) {
  if (view === 'day') {
    return (
      <View style={styles.listIcon}>
        <View style={[styles.listLine, { backgroundColor: color }]} />
        <View style={[styles.listLine, { backgroundColor: color }]} />
        <View style={[styles.listLine, { backgroundColor: color }]} />
      </View>
    );
  }

  if (view === 'month') {
    return (
      <View style={styles.gridIcon}>
        {Array.from({ length: 9 }, (_, index) => (
          <View key={index} style={[styles.gridDot, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.calendarIcon, { borderColor: color }]}>
      <View style={[styles.calendarBand, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.half,
    justifyContent: 'center',
    minHeight: 44,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  dots: {
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  listIcon: {
    width: 18,
    gap: 4,
  },
  listLine: {
    height: 2,
    borderRadius: 1,
  },
  gridIcon: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  gridDot: {
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  calendarBand: {
    height: 6,
  },
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  menu: {
    position: 'absolute',
    right: Spacing.three,
    minWidth: 220,
    maxWidth: 300,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.one,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  menuRow: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  menuCopy: {
    flex: 1,
    gap: Spacing.half,
  },
});
