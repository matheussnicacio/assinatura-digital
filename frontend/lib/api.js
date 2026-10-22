const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const getToken = () => (typeof window !== 'undefined' ? sessionStorage.getItem('token') : null);

// Cliente da API. O JWT vai no cabeçalho Authorization (sessionStorage: some ao fechar a aba).
// X-Requested-With é exigido pelo backend como defesa extra contra CSRF.
export async function api(path, { method = 'GET', body, formData, raw = false } = {}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  if (res.status === 401 && token && !path.startsWith('/auth/keys')) {
    sessionStorage.clear();
    window.location.href = `${BASE_PATH}/login/`;
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const details = data.details ? ` (${data.details.join('; ')})` : '';
    throw new Error((data.error || `Erro ${res.status}`) + details);
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

export async function openReceipt(expenseId, index) {
  const res = await api(`/expenses/${expenseId}/receipts/${index}`, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
}
