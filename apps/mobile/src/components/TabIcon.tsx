import { View } from 'react-native';

export type TabIconKind = 'jobs' | 'bookings' | 'availability' | 'record';

/** Small tab bar glyphs drawn with Views (no icon font needed). */
export function TabIcon({ kind, color }: { kind: TabIconKind; color: string }) {
  const box = { width: 24, height: 24, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (kind === 'jobs') {
    // A ticket with a strip of tape
    return (
      <View style={box}>
        <View style={{ width: 20, height: 15, borderWidth: 2, borderColor: color, borderRadius: 3, marginTop: 3 }} />
        <View style={{ position: 'absolute', top: 2, left: 4, width: 9, height: 4, backgroundColor: color, transform: [{ rotate: '-4deg' }] }} />
      </View>
    );
  }
  if (kind === 'bookings') {
    // A calendar page
    return (
      <View style={box}>
        <View style={{ width: 20, height: 19, borderWidth: 2, borderColor: color, borderRadius: 3, borderTopWidth: 6 }} />
        <View style={{ position: 'absolute', top: 7, left: 7, width: 4, height: 4, backgroundColor: color, borderRadius: 1 }} />
      </View>
    );
  }
  if (kind === 'availability') {
    // A week of days, some on
    return (
      <View style={[box, { flexDirection: 'row', gap: 2 }]}>
        {[1, 0, 1, 1, 0].map((on, i) => (
          <View key={i} style={{ width: 3, height: on ? 16 : 8, borderRadius: 1.5, backgroundColor: color, opacity: on ? 1 : 0.5 }} />
        ))}
      </View>
    );
  }
  // A lock: the private record
  return (
    <View style={box}>
      <View style={{ width: 12, height: 9, borderWidth: 2, borderBottomWidth: 0, borderColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
      <View style={{ width: 18, height: 11, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}
