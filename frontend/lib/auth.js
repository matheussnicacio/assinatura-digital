import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api, BASE_PATH } from './api';

export function saveSession({ token, user }) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function logout() {
  sessionStorage.clear();
  window.location.href = `${BASE_PATH}/login/`;
}

export async function refreshUser() {
  const { user } = await api('/auth/me');
  sessionStorage.setItem('user', JSON.stringify(user));
  return user;
}

// Protege páginas: redireciona ao login sem sessão, ao dashboard se o perfil não tiver permissão.
export function useAuth(roles) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = sessionStorage.getItem('user');
    if (!raw || !sessionStorage.getItem('token')) {
      router.replace('/login');
      return;
    }
    const u = JSON.parse(raw);
    if (roles && !roles.includes(u.role)) {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return user;
}
