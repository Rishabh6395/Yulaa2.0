import { Drawer } from 'expo-router/drawer';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, FONTS } from '../../src/theme';

export default function AppLayout() {
  const { user } = useAuth();
  const isSuper = user?.primaryRole === 'super_admin';
  const hide = { display: 'none' } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: { backgroundColor: COLORS.card, width: 280 },
          drawerActiveTintColor: COLORS.brand,
          drawerInactiveTintColor: COLORS.textMuted,
          drawerLabelStyle: { ...FONTS.medium, fontSize: 15 },
        }}
      >
        <Drawer.Screen name="(tabs)"     options={{ title: 'Home',       drawerIcon: () => <Text>🏠</Text> }} />
        <Drawer.Screen name="admissions" options={{ title: 'Admissions', drawerIcon: () => <Text>📋</Text> }} />
        <Drawer.Screen name="students"   options={{ title: 'Students',   drawerIcon: () => <Text>🎓</Text> }} />
        <Drawer.Screen name="teachers"   options={{ title: 'Teachers',   drawerIcon: () => <Text>👩‍🏫</Text> }} />
        <Drawer.Screen name="parents"    options={{ title: 'Parents',    drawerIcon: () => <Text>👨‍👩‍👧</Text> }} />
        <Drawer.Screen name="fees"       options={{ title: 'Fees',       drawerIcon: () => <Text>💰</Text> }} />
        <Drawer.Screen name="events"     options={{ title: 'Events',     drawerIcon: () => <Text>📅</Text> }} />
        <Drawer.Screen name="profile"    options={{ title: 'Profile',    drawerIcon: () => <Text>👤</Text> }} />
        {/* super_admin only */}
        <Drawer.Screen name="users"                          options={{ title: 'Users',              drawerIcon: () => <Text>👥</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
        <Drawer.Screen name="masters"                        options={{ title: 'Masters',            drawerIcon: () => <Text>🗄️</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
        <Drawer.Screen name="reports"                        options={{ title: 'Reports',            drawerIcon: () => <Text>📈</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
        <Drawer.Screen name="super-admin/form-config"        options={{ title: 'Form Config',        drawerIcon: () => <Text>📝</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
        <Drawer.Screen name="super-admin/kpi-config"         options={{ title: 'KPI Config',         drawerIcon: () => <Text>📊</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
        <Drawer.Screen name="super-admin/admission-workflow" options={{ title: 'Admission Workflow', drawerIcon: () => <Text>🔀</Text>, drawerItemStyle: isSuper ? undefined : hide }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
