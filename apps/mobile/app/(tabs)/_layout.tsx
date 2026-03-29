import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const BRAND = '#1A8CA5';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: BRAND,
      tabBarInactiveTintColor: '#9aa8b5',
      tabBarStyle: { borderTopColor: '#f1f4f6' },
      headerStyle: { backgroundColor: BRAND },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ title: 'Attendance', tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="leave"
        options={{ title: 'Leave', tabBarIcon: ({ focused }) => <Icon emoji="🗓️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="announcements"
        options={{ title: 'Notices', tabBarIcon: ({ focused }) => <Icon emoji="📢" focused={focused} /> }}
      />
    </Tabs>
  );
}
