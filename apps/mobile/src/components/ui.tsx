import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radius, useStyles, useTheme, type Theme } from '../theme';

/* ---------------------------------------------------------------- layout */

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.blanket} colors={[c.blanket]} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, s.flex]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PageHead({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: ReactNode; eyebrow?: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.pageHead}>
      <View style={s.flex}>
        {eyebrow ? <Text style={s.ticketNo}>{eyebrow}</Text> : null}
        <Text style={s.h1} accessibilityRole="header">{title}</Text>
        {sub ? <Text style={[s.muted, s.mt4]}>{sub}</Text> : null}
      </View>
      {right ? <View style={s.mt8}>{right}</View> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const s = useStyles(makeStyles);
  return (
    <Text style={s.sectionLabel} accessibilityRole="header">
      {children.toUpperCase()}
    </Text>
  );
}

export function Row({ children, style, between }: { children: ReactNode; style?: StyleProp<ViewStyle>; between?: boolean }) {
  return <View style={[styles.row, between && styles.between, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/* ---------------------------------------------------------------- text */

type TextKind = 'body' | 'muted' | 'small' | 'smallMuted' | 'mono' | 'h2' | 'h3' | 'ticketNo' | 'bold';

export function T({ kind = 'body', children, style, ...rest }: { kind?: TextKind; children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; accessibilityRole?: 'header' | 'text' }) {
  const s = useStyles(makeStyles);
  const map: Record<TextKind, StyleProp<TextStyle>> = {
    body: s.body,
    muted: s.muted,
    small: s.small,
    smallMuted: [s.small, s.mutedColor],
    mono: s.mono,
    h2: s.h2,
    h3: s.h3,
    ticketNo: s.ticketNo,
    bold: [s.body, s.bold],
  };
  return (
    <Text style={[map[kind], style]} {...rest}>
      {children}
    </Text>
  );
}

/* ---------------------------------------------------------------- buttons */

export type ButtonKind = 'primary' | 'ghost' | 'quiet' | 'danger';

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  small,
  hint,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const off = disabled || busy;
  const bg = kind === 'primary' ? c.blanket : 'transparent';
  const border = kind === 'primary' || kind === 'ghost' ? c.blanket : kind === 'danger' ? c.bad : c.line;
  const fg = kind === 'primary' ? c.onBlanket : kind === 'ghost' ? c.blanket : kind === 'danger' ? c.bad : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      hitSlop={small ? 6 : 0}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: off ? 0.55 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} style={styles.btnSpinner} /> : null}
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Text-styled button (for links like "Forgot password?"). Still a 44pt target. */
export function LinkButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.link} hitSlop={4}>
      <Text style={{ color: c.blanket, fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- pills and chips */

export type PillKind = 'ok' | 'warn' | 'bad' | 'info' | 'plain' | 'kraft';

export function Pill({ kind = 'plain', children }: { kind?: PillKind; children: string }) {
  const { c } = useTheme();
  const colors: Record<PillKind, [string, string]> = {
    ok: [c.okSoft, c.ok],
    warn: [c.warnSoft, c.warn],
    bad: [c.badSoft, c.bad],
    info: [c.blanketSoft, c.blanket],
    plain: [c.sunk, c.muted],
    kraft: [c.kraftSoft, c.kraft],
  };
  const [bg, fg] = colors[kind];
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: kind === 'plain' ? c.line : bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Chip({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.chip, { borderColor: c.line, backgroundColor: c.sunk }]}>
      <Text style={{ color: c.ink, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

/** Pressable chip used for multi-select (days, roles) and single-select (license). */
export function Toggle({
  label,
  on,
  onPress,
  radio,
  a11yLabel,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  radio?: boolean;
  a11yLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={radio ? { selected: on } : { checked: on }}
      accessibilityLabel={a11yLabel ?? label}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: on ? c.okSoft : c.surface,
          borderColor: on ? c.ok : c.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ color: on ? c.ok : c.ink, fontWeight: on ? '700' : '500', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function ToggleGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  options: readonly V[];
  value: V[];
  onChange: (next: V[]) => void;
  hint?: string;
  error?: string | null;
}) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const flip = useCallback(
    (o: V) => {
      const next = value.includes(o) ? value.filter((x) => x !== o) : options.filter((x) => x === o || value.includes(x));
      onChange(next);
    },
    [value, options, onChange],
  );
  return (
    <View style={s.field} accessibilityRole="none">
      <Text style={s.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((o) => (
          <Toggle key={o} label={o} on={value.includes(o)} onPress={() => flip(o)} a11yLabel={`${label}: ${o}`} />
        ))}
      </View>
      {error ? <Text style={[s.hint, { color: c.bad }]}>{error}</Text> : null}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function RadioGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: readonly V[];
  value: V | null;
  onChange: (v: V) => void;
  hint?: string;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => (
          <Toggle key={o} radio label={o} on={value === o} onPress={() => onChange(o)} a11yLabel={`${label}: ${o}`} />
        ))}
      </View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------------------------------------------------------------- forms */

export function Field({
  label,
  hint,
  error,
  counter,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; counter?: number }) {
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const len = typeof input.value === 'string' ? input.value.length : 0;
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={c.muted}
        {...input}
        style={[s.input, input.multiline && s.textarea, error ? { borderColor: c.bad } : null, input.style]}
      />
      {error ? <Text style={[s.hint, { color: c.bad }]}>{error}</Text> : null}
      {hint || counter ? (
        <Row between>
          <Text style={[s.hint, styles.flex]}>{hint ?? ''}</Text>
          {counter ? <Text style={[s.hint, { fontFamily: fonts.mono }]}>{`${len}/${counter}`}</Text> : null}
        </Row>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- cards */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(makeStyles);
  return <View style={[s.card, style]}>{children}</View>;
}

/** Job "ticket": a card with a strip of packing tape across the top edge. */
export function Ticket({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(makeStyles);
  return (
    <View style={[s.card, s.ticket, style]}>
      <View style={s.tape} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      {children}
    </View>
  );
}

/** Grey row used inside lists of bookings. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(makeStyles);
  return <View style={[s.panel, style]}>{children}</View>;
}

export function Facts({ items }: { items: [string, string][] }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.facts}>
      {items.map(([k, v]) => (
        <View key={k} style={s.fact} accessible accessibilityLabel={`${k}: ${v}`}>
          <Text style={s.factK}>{k.toUpperCase()}</Text>
          <Text style={s.factV}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

/** Kraft "private" banner (or ok / warn / bad variants) with a lock mark. */
export function Notice({
  children,
  title,
  kind = 'kraft',
  lock = true,
}: {
  children?: ReactNode;
  title?: string;
  kind?: 'kraft' | 'ok' | 'warn' | 'bad' | 'info';
  lock?: boolean;
}) {
  const { c } = useTheme();
  const map = {
    kraft: [c.kraftSoft, c.kraftTape, c.kraft],
    ok: [c.okSoft, c.ok, c.ok],
    warn: [c.warnSoft, c.warn, c.warn],
    bad: [c.badSoft, c.bad, c.bad],
    info: [c.blanketSoft, c.blanket, c.blanket],
  } as const;
  const [bg, border, icon] = map[kind];
  return (
    <View style={[styles.notice, { backgroundColor: bg, borderColor: border }]} accessible accessibilityRole="text">
      {lock ? <Lock color={icon} /> : null}
      <View style={styles.flex}>
        {title ? <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14, lineHeight: 20 }}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function Lock({ color }: { color: string }) {
  return (
    <View style={styles.lock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.lockArc, { borderColor: color }]} />
      <View style={[styles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

/* ---------------------------------------------------------------- states */

export function Empty({ children }: { children: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.empty}>
      <Text style={[s.muted, styles.center]}>{children}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.loading} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={c.blanket} size="large" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useTheme();
  return (
    <View
      style={[styles.notice, { backgroundColor: c.badSoft, borderColor: c.bad, flexDirection: 'column', alignItems: 'stretch' }]}
      accessibilityRole="alert"
    >
      <Text style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}>{message}</Text>
      {onRetry ? (
        <View style={styles.row}>
          <Button title="Try again" kind="quiet" small onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  between: { justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minHeight: 40, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  btnTextSmall: { fontSize: 14 },
  btnSpinner: { marginRight: 8 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  chip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  toggle: {
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
  },
  lock: { width: 14, height: 16, alignItems: 'center', marginTop: 2 },
  lockArc: { width: 10, height: 9, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  lockBody: { width: 14, height: 8, borderRadius: 2 },
  loading: { paddingVertical: 48, alignItems: 'center' },
});

const makeStyles = ({ c }: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 48, gap: 12 },
    pageHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
    h1: { fontFamily: fonts.display, fontSize: 30, fontWeight: '700', color: c.ink, lineHeight: 34 },
    h2: { fontFamily: fonts.display, fontSize: 23, fontWeight: '700', color: c.ink, lineHeight: 27 },
    h3: { fontFamily: fonts.display, fontSize: 19, fontWeight: '700', color: c.ink, lineHeight: 23 },
    body: { color: c.ink, fontSize: 15, lineHeight: 22 },
    bold: { fontWeight: '700' },
    muted: { color: c.muted, fontSize: 15, lineHeight: 22 },
    mutedColor: { color: c.muted },
    small: { color: c.ink, fontSize: 13, lineHeight: 19 },
    mono: { color: c.ink, fontFamily: fonts.mono, fontSize: 14 },
    mt4: { marginTop: 4 },
    mt8: { marginTop: 8 },
    ticketNo: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, letterSpacing: 0.5 },
    sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: c.muted, marginTop: 14 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: c.ink },
    hint: { fontSize: 13, color: c.muted, lineHeight: 18 },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: c.ink,
      backgroundColor: c.surface,
    },
    textarea: { minHeight: 96, textAlignVertical: 'top' },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius, padding: 16, gap: 12 },
    ticket: { marginTop: 8 },
    tape: {
      position: 'absolute',
      top: -7,
      left: 22,
      width: 56,
      height: 14,
      backgroundColor: c.kraftTape,
      opacity: 0.9,
      borderRadius: 1,
      transform: [{ rotate: '-2deg' }],
    },
    panel: { backgroundColor: c.sunk, borderRadius: 6, padding: 12, gap: 8, borderWidth: 1, borderColor: c.line },
    facts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.line,
    },
    fact: { width: '33.33%', paddingRight: 8 },
    factK: { fontSize: 11, letterSpacing: 0.8, color: c.muted, fontWeight: '600' },
    factV: { fontSize: 15, fontWeight: '600', color: c.ink },
    empty: { padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: radius },
  });
