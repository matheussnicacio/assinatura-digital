import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardActions, Typography, Button, Alert } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const user = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) api('/expenses').then(setItems).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Loading />;
  const n = (s) => (items ? items.filter((e) => e.status === s).length : '–');
  const manager = user.role === 'gerente';

  const cards = [
    ...(manager ? [{ t: 'Funcionários', d: 'Cadastre, edite e desative contas.', href: '/employees', a: 'Gerenciar funcionários' }] : []),
    { t: 'Nova despesa', d: 'Envie um relatório de despesa com os recibos.', href: '/submitExpense', a: 'Cadastrar despesa' },
    {
      t: manager ? `${n('SUBMETIDA')} para validar` : `${n('VALIDADA')} para assinar`,
      d: manager ? 'Despesas aguardando a sua validação.' : 'Documentos validados que esperam a sua assinatura.',
      href: '/pendingExpenses',
      a: 'Ver pendentes',
    },
    { t: `${n('ASSINADA')} assinadas`, d: manager ? 'Documentos assinados, prontos para verificação.' : 'Seus documentos já assinados.', href: '/signedExpenses', a: 'Ver assinadas' },
  ];

  return (
    <Layout user={user} title={`Olá, ${user.name.split(' ')[0]}`}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.href} variant="outlined">
            <CardContent>
              <Typography variant="h6">{c.t}</Typography>
              <Typography color="text.secondary">{c.d}</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} href={c.href}>{c.a}</Button>
            </CardActions>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
