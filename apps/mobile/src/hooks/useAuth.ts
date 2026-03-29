import { useState, useEffect } from 'react';
import { getToken, clearToken, verifyOtp, requestOtp } from '../api/client';

export function useAuth() {
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(t => { setToken(t); setLoading(false); });
  }, []);

  async function login(phone: string, otp: string) {
    const data = await verifyOtp(phone, otp);
    setToken(data.token);
    return data;
  }

  async function logout() {
    await clearToken();
    setToken(null);
  }

  return { token, loading, isLoggedIn: !!token, login, logout, requestOtp };
}
