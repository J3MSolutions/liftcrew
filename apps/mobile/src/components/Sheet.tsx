import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useTheme } from '../theme';

/** Bottom sheet built on React Native's Modal. */
export function Sheet({
  visible,
  onClose,
  title,
  sub,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.backdrop, { backgroundColor: c.backdrop }]}>
          <Pressable
            style={styles.flex}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View
            style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.line, paddingBottom: 16 + insets.bottom }]}
            accessibilityViewIsModal
          >
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text accessibilityRole="header" style={[styles.title, { color: c.ink }]}>
                  {title}
                </Text>
                {sub ? <Text style={[styles.sub, { color: c.muted }]}>{sub}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.x}
                hitSlop={4}
              >
                <Text style={{ color: c.muted, fontSize: 26, lineHeight: 28 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 23, fontWeight: '700', lineHeight: 27 },
  sub: { fontSize: 13, marginTop: 2, fontFamily: fonts.mono },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -8 },
  body: { gap: 14, paddingBottom: 8 },
});
