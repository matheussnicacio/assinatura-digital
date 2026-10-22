import { useState } from 'react';
import { useRouter } from 'next/router';
import { Paper, TextField, Button, Alert, Typography } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function SubmitExpense() {
  const user = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ title: '', description: '', amount: '', date: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function pick(e) {
    const chosen = [...e.target.files];
    if (chosen.length > 5) return setError('Envie no máximo 5 recibos.');
    if (chosen.some((x) => !OK_TYPES.includes(x.type))) return setError('Use apenas PDF, JPG ou PNG.');
    if (chosen.some((x) => x.size > 5 * 1024 * 1024)) return setError('Cada arquivo deve ter até 5 MB.');
    setError('');
    setFiles(chosen);
  }

  async function submit(e) {
    e.preventDefault();
    if (!files.length) return setError('Anexe ao menos um recibo.');
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      files.forEach((x) => fd.append('receipts', x));
      await api('/expenses', { method: 'POST', formData: fd });
      router.push('/pendingExpenses');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout user={user} title="Nova despesa">
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <form onSubmit={submit} className="grid gap-4">
          <TextField label="Título" value={f.title} onChange={set('title')} required inputProps={{ minLength: 3, maxLength: 150 }} />
          <TextField label="Descrição" value={f.description} onChange={set('description')} multiline minRows={3} inputProps={{ maxLength: 2000 }} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Valor (R$)" type="number" value={f.amount} onChange={set('amount')} required inputProps={{ min: 0.01, step: 0.01 }} />
            <TextField label="Data da despesa" type="date" value={f.date} onChange={set('date')} required InputLabelProps={{ shrink: true }} />
          </div>
          <div>
            <Button variant="outlined" component="label">
              Anexar recibos
              <input type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png" onChange={pick} />
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {files.length ? files.map((x) => x.name).join(', ') : 'PDF, JPG ou PNG, até 5 arquivos de 5 MB.'}
            </Typography>
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={busy}>Enviar despesa</Button>
        </form>
      </Paper>
    </Layout>
  );
}
