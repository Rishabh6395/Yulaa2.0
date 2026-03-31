import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyOtp as apiVerifyOtp, requestOtp as apiRequestOtp } from '../api/client';

interface User {
  id: string;
  name: string;
  phone: string;
  schoolId: string;
  primaryRole: string;
  roles: any[];
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

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

  async function login(phone: string, otp: string) {
    const data = await apiVerifyOtp(phone, otp);
    const u: User = {
      id:          data.user.id,
      name:        data.user.name ?? data.user.phone,
      phone:       data.user.phone,
      schoolId:    data.user.schoolId ?? data.user.roles?.[0]?.school_id,
      primaryRole: data.user.primaryRole ?? data.user.roles?.find((r: any) => r.is_primary)?.role_code ?? 'teacher',
      roles:       data.user.roles ?? [],
    };
    await SecureStore.setItemAsync('yulaa_token', data.token);
    await AsyncStorage.setItem('yulaa_user', JSON.stringify(u));
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
    <Ctx.Provider value={{ user, token, loading, isLoggedIn: !!token, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
