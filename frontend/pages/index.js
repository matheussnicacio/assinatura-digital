import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(sessionStorage.getItem('token') ? '/dashboard' : '/login');
  }, [router]);
  return null;
}
