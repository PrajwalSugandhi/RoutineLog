import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HabitMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HabitActionsModalProps = {
  visible: boolean;
  anchor: HabitMenuAnchor | null;
  onClose: () => void;
  onEdit: () => void;
  onReview: () => void;
};

const MENU_WIDTH = 168;
const MENU_HEIGHT = 96;

export function HabitActionsModal({ visible, anchor, onClose, onEdit, onReview }: HabitActionsModalProps) {
  const theme = useTheme();
  const frame = anchor ? menuFrame(anchor) : null;

  return (
    <Modal
      visible={visible && frame != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close habit menu"
          onPress={onClose}
          style={styles.scrim}
        />
        {frame ? (
          <View
            style={[
              styles.menu,
              {
                top: frame.top,
                left: frame.left,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit"
              onPress={onEdit}
              testID="habit-action-edit"
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <ThemedText type="smallBold">Edit</ThemedText>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review"
              onPress={onReview}
              testID="habit-action-review"
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <ThemedText type="smallBold">Review</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function menuFrame(anchor: HabitMenuAnchor): { top: number; left: number } {
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const gap = Spacing.one;
  let top = anchor.y + anchor.height + gap;
  if (top + MENU_HEIGHT > windowHeight - Spacing.two) {
    top = anchor.y - MENU_HEIGHT - gap;
  }
  if (top < Spacing.two) top = Spacing.two;

  let left = anchor.x + anchor.width - MENU_WIDTH;
  if (left < Spacing.two) left = Spacing.two;
  if (left + MENU_WIDTH > windowWidth - Spacing.two) {
    left = windowWidth - Spacing.two - MENU_WIDTH;
  }
  return { top, left };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  scrim: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
});
