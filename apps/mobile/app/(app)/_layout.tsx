import { Drawer } from 'expo-router/drawer';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, FONTS } from '../../src/theme';

export default function AppLayout() {
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
      </Drawer>
    </GestureHandlerRootView>
  );
}
