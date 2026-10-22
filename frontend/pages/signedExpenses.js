import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import ExpenseTable from '../components/ExpenseTable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function SignedExpenses() {
  const user = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) api('/expenses?status=ASSINADA').then(setItems).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Loading />;
  const manager = user.role === 'gerente';

  return (
    <Layout user={user} title="Documentos assinados">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!items && !error ? <Loading /> : (
        <ExpenseTable
          items={items}
          user={user}
          rowAction={(e) => (manager ? { label: 'Verificar assinatura', href: `/verifySignature?id=${e.id}` } : { label: 'Ver detalhes', href: `/validateExpense?id=${e.id}` })}
          empty="Nenhum documento assinado ainda."
        />
      )}
    </Layout>
  );
}
