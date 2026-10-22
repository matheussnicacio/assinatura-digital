import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Paper, Typography, Button, TextField, Alert, List, ListItem, ListItemText } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import StatusChip from '../components/StatusChip';
import { api, openReceipt } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, day, dateTime } from '../lib/format';

export default function ValidateExpense() {
  const user = useAuth();
  const router = useRouter();
  const [e, setE] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (user && router.isReady) api(`/expenses/${router.query.id}`).then(setE).catch((x) => setMsg({ type: 'error', text: x.message }));
  }, [user, router.isReady, router.query.id]);

  if (!user) return <Loading />;

  const canValidate = user.role === 'gerente' && e && e.status === 'SUBMETIDA' && e.owner.id !== user.id;

  async function decide(decision) {
    try {
      await api(`/expenses/${e.id}/validate`, { method: 'POST', body: { decision, note } });
      router.push('/pendingExpenses');
    } catch (x) {
      setMsg({ type: 'error', text: x.message });
    }
  }

  return (
    <Layout user={user} title="Validar documento">
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      {!e ? (!msg && <Loading />) : (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
          <div className="flex items-center justify-between gap-2">
            <Typography variant="h6">{e.title}</Typography>
            <StatusChip status={e.status} />
          </div>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {e.owner.name} · {day(e.date)} · {money(e.amount)}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{e.description || 'Sem descrição.'}</Typography>

          <Typography variant="subtitle2">Recibos</Typography>
          <List dense>
            {e.receipts.map((r) => (
              <ListItem key={r.index} secondaryAction={<Button size="small" onClick={() => openReceipt(e.id, r.index).catch((x) => setMsg({ type: 'error', text: x.message }))}>Abrir</Button>}>
                <ListItemText primary={r.name} secondary={`SHA-256 ${r.sha256.slice(0, 16)}… · ${(r.size / 1024).toFixed(0)} KB`} />
              </ListItem>
            ))}
          </List>

          {e.validation && (
            <Alert severity={e.validation.decision === 'approve' ? 'success' : 'error'} sx={{ my: 2 }}>
              {e.validation.decision === 'approve' ? 'Validada' : 'Rejeitada'} por {e.validation.by} em {dateTime(e.validation.at)}.{e.validation.note ? ` Observação: ${e.validation.note}` : ''}
            </Alert>
          )}

          {canValidate && (
            <div className="grid gap-3 mt-4">
              <TextField label="Observação (obrigatória para rejeitar)" value={note} onChange={(x) => setNote(x.target.value)} multiline minRows={2} inputProps={{ maxLength: 500 }} />
              <div className="flex gap-2">
                <Button variant="contained" onClick={() => decide('approve')}>Validar documento</Button>
                <Button variant="outlined" color="secondary" onClick={() => decide('reject')} disabled={!note.trim()}>Rejeitar documento</Button>
              </div>
            </div>
          )}
          {e.status === 'VALIDADA' && e.owner.id === user.id && (
            <Button variant="contained" component={Link} href={`/signExpense?id=${e.id}`} sx={{ mt: 2 }}>Assinar documento</Button>
          )}
        </Paper>
      )}
    </Layout>
  );
}
