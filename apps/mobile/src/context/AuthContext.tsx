import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyOtp as apiVerifyOtp, apiFetch } from '../api/client';

interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  schoolId: string | null;
  primaryRole: string;
  roles: any[];
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

function normaliseUser(data: any): User {
  const u = data.user;
  return {
    id:          u.id,
    name:        u.name ?? (u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : null) ?? u.phone ?? u.email ?? 'User',
    phone:       u.phone ?? null,
    email:       u.email ?? null,
    schoolId:    u.schoolId ?? u.roles?.[0]?.school_id ?? null,
    primaryRole: u.primaryRole ?? u.roles?.find((r: any) => r.is_primary)?.role_code ?? 'teacher',
    roles:       u.roles ?? [],
  };
}

async function persist(token: string, user: User) {
  await SecureStore.setItemAsync('yulaa_token', token);
  await AsyncStorage.setItem('yulaa_user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,   setTok]  = useState<string | null>(null);
  const [user,    setUser] = useState<User | null>(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    (async () => {
      const [tok, usr] = await Promise.all([
        SecureStore.getItemAsync('yulaa_token'),
        AsyncStorage.getItem('yulaa_user'),
      ]);
      if (tok) setTok(tok);
      if (usr) setUser(JSON.parse(usr));
      setLoad(false);
    })();
  }, []);

  async function loginWithOtp(phone: string, otp: string) {
    const data = await apiVerifyOtp(phone, otp);
    const u = normaliseUser(data);
    await persist(data.token, u);
    setTok(data.token);
    setUser(u);
  }

  async function loginWithEmail(email: string, password: string) {
    const data = await apiFetch<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const u = normaliseUser(data);
    await persist(data.token, u);
    setTok(data.token);
    setUser(u);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('yulaa_token');
    await AsyncStorage.removeItem('yulaa_user');
    setTok(null);
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, token, loading, isLoggedIn: !!token, loginWithOtp, loginWithEmail, logout }}>
      {children}
    </Ctx.Provider>
  );
}
