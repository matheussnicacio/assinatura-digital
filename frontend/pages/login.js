import { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { api } from '../lib/api';
import { saveSession } from '../lib/auth';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      saveSession(await api('/auth/login', { method: 'POST', body: { email, password } }));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Despesas assinadas
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Entre com a sua conta para continuar.
        </Typography>
        <form onSubmit={submit} className="grid gap-4">
          <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={busy}>
            Entrar
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
