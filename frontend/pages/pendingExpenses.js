import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import ExpenseTable from '../components/ExpenseTable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function PendingExpenses() {
  const user = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const manager = user && user.role === 'gerente';

  useEffect(() => {
    if (!user) return;
    // Todos os perfis veem SUBMETIDA e VALIDADA: o gerente também pode ser dono de despesas a assinar.
    api('/expenses?status=SUBMETIDA,VALIDADA').then(setItems).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Loading />;

  const action = (e) => {
    const isOwner = e.owner.id === user.id;
    if (manager && !isOwner && e.status === 'SUBMETIDA') return { label: 'Validar', href: `/validateExpense?id=${e.id}` };
    if (isOwner && e.status === 'VALIDADA') return { label: 'Assinar', href: `/signExpense?id=${e.id}` };
    return { label: 'Ver detalhes', href: `/validateExpense?id=${e.id}` };
  };

  return (
    <Layout user={user} title={manager ? 'Documentos para validar' : 'Documentos pendentes'}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!items && !error ? <Loading /> : <ExpenseTable items={items} user={user} rowAction={action} empty="Nenhum documento pendente." />}
    </Layout>
  );
}
