import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { TabIcon } from '../../src/components/TabIcon';
import { useAuth } from '../../src/lib/auth';
import { BadgeProvider, useBadge } from '../../src/lib/badge';
import { useTheme } from '../../src/theme';

export default function TabsLayout() {
  const { status, mover } = useAuth();
  if (status !== 'mover' || !mover) return <Redirect href="/" />;
  return (
    <BadgeProvider moverId={mover.id}>
      <MoverTabs />
    </BadgeProvider>
  );
}

function MoverTabs() {
  const { c } = useTheme();
  const { count, refreshBadge } = useBadge();
  const pathname = usePathname();

  // Recount waiting invitations and standby offers whenever the mover switches tabs.
  useEffect(() => {
    refreshBadge();
  }, [pathname, refreshBadge]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.blanket,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{ title: 'Jobs', tabBarIcon: ({ color }) => <TabIcon kind="jobs" color={color} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <TabIcon kind="bookings" color={color} />,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: c.kraftTape, color: c.ink, fontWeight: '700' },
          tabBarAccessibilityLabel: count > 0 ? `Bookings, ${count} waiting for your answer` : 'Bookings',
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{ title: 'Availability', tabBarIcon: ({ color }) => <TabIcon kind="availability" color={color} /> }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: 'My record', tabBarIcon: ({ color }) => <TabIcon kind="record" color={color} /> }}
      />
    </Tabs>
  );
}
