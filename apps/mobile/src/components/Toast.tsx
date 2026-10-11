import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type Show = (message: string) => void;
const ToastContext = createContext<Show>(() => {});

/** Short confirmation messages ("Request sent to Redwood Valley Movers."), also read by screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback<Show>((message) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(message);
    AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(() => setMsg(null), 4000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg ? (
        <Pressable
          onPress={() => setMsg(null)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Dismisses this message"
          style={[styles.toast, { backgroundColor: c.ink, bottom: 64 + insets.bottom }]}
        >
          <Text style={{ color: c.bg, fontSize: 15, lineHeight: 21 }}>{msg}</Text>
        </Pressable>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): Show {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 8,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
