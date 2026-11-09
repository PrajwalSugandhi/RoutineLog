import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RowActionSheetProps = {
  name: string;
  onHide: () => void;
  onDelete: () => void;
};

export function RowActionSheet({ name, onHide, onDelete }: RowActionSheetProps) {
  const theme = useTheme();
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [menuRight, setMenuRight] = useState<number>(Spacing.three);

  function openMenu() {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get('window');
      const belowTop = y + height + Spacing.two;
      const menuHeight = 48 * 2 + Spacing.two;
      const top = belowTop + menuHeight > screen.height - Spacing.three ? y - menuHeight - Spacing.two : belowTop;
      setMenuTop(Math.max(Spacing.three, top));
      setMenuRight(Math.max(Spacing.three, screen.width - (x + width)));
      setOpen(true);
    });
  }

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More options for ${name}`}
          onPress={openMenu}
          hitSlop={4}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <View style={styles.dots}>
            <Dot color={theme.text} />
            <Dot color={theme.text} />
            <Dot color={theme.text} />
          </View>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close menu" style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            onStartShouldSetResponder={() => true}
            style={[
              styles.menu,
              {
                top: menuTop,
                right: menuRight,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <MenuRow label="Hide" onPress={() => choose(onHide)} />
            <MenuRow label="Delete" danger onPress={() => choose(onDelete)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuRow({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={danger ? { color: theme.danger } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.55,
  },
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  menu: {
    position: 'absolute',
    minWidth: 220,
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
    justifyContent: 'center',
  },
});
