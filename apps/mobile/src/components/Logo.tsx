import { StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../theme';

/** The LiftCrew truck mark (blanket-blue box, kraft cab), drawn with Views. */
export function Logo({ size = 1 }: { size?: number }) {
  const { c } = useTheme();
  const u = (n: number) => n * size;
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="LiftCrew">
      <View style={{ width: u(30), height: u(30) }}>
        <View style={{ position: 'absolute', left: u(3), top: u(7), width: u(17), height: u(15), borderRadius: u(2), backgroundColor: c.blanket }}>
          <View style={{ position: 'absolute', left: u(4), top: u(4), width: u(9), height: u(1.6), borderRadius: 1, backgroundColor: c.onBlanket }} />
          <View style={{ position: 'absolute', left: u(4), top: u(8), width: u(6), height: u(1.6), borderRadius: 1, backgroundColor: c.onBlanket }} />
        </View>
        <View style={{ position: 'absolute', left: u(20), top: u(12), width: u(7.5), height: u(10), borderTopRightRadius: u(4), backgroundColor: c.kraftTape }} />
        <View style={{ position: 'absolute', left: u(6.4), top: u(20.9), width: u(5.2), height: u(5.2), borderRadius: u(2.6), backgroundColor: c.ink }} />
        <View style={{ position: 'absolute', left: u(20.4), top: u(20.9), width: u(5.2), height: u(5.2), borderRadius: u(2.6), backgroundColor: c.ink }} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontWeight: '700', fontSize: u(26), color: c.ink, letterSpacing: 0.4 }}>LiftCrew</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
