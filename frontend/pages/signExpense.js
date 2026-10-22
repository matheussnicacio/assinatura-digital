import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Paper, Typography, Button, TextField, Alert, Checkbox, FormControlLabel, Table, TableBody, TableRow, TableCell } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { api } from '../lib/api';
import { useAuth, refreshUser } from '../lib/auth';
import { hasWebCrypto, generateKeyPair, saveKey, loadKey, signPayload, sha256Hex } from '../lib/crypto';
import { money, day } from '../lib/format';

export default function SignExpense() {
  const user = useAuth();
  const router = useRouter();
  const [exp, setExp] = useState(null);
  const [me, setMe] = useState(null);
  const [localKey, setLocalKey] = useState(null);
  const [doc, setDoc] = useState(null); // { payload, payloadHash, parsed, hashOk }
  const [agree, setAgree] = useState(false);
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = router.query.id;

  const load = useCallback(async () => {
    const [e, u] = await Promise.all([api(`/expenses/${id}`), refreshUser()]);
    setExp(e);
    setMe(u);
    setLocalKey((await loadKey(u.id)) || null);
    if (e.status === 'VALIDADA') {
      const p = await api(`/expenses/${id}/sign-payload`);
      // O navegador recalcula o hash: o usuário vê e confere exatamente o que vai assinar.
      setDoc({ ...p, parsed: JSON.parse(p.payload), hashOk: (await sha256Hex(p.payload)) === p.payloadHash });
    }
  }, [id]);

  useEffect(() => {
    if (user && router.isReady) load().catch((x) => setMsg({ type: 'error', text: x.message }));
  }, [user, router.isReady, load]);

  if (!user) return <Loading />;

  const keyReady = me && localKey && me.activeKeyId === localKey.keyId;

  async function registerKey() {
    setBusy(true);
    setMsg(null);
    try {
      const { privateKey, spki } = await generateKeyPair();
      const { keyId } = await api('/auth/keys', { method: 'POST', body: { spki, password: pwd } });
      await saveKey(me.id, keyId, privateKey);
      setPwd('');
      await load();
      setMsg({ type: 'success', text: 'Chave criada neste navegador e registrada na sua conta.' });
    } catch (x) {
      setMsg({ type: 'error', text: x.message });
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    setBusy(true);
    setMsg(null);
    try {
      const signature = await signPayload(localKey.privateKey, doc.payload);
      await api(`/expenses/${id}/sign`, { method: 'POST', body: { signature, keyId: localKey.keyId } });
      router.push('/signedExpenses');
    } catch (x) {
      setMsg({ type: 'error', text: x.message });
      setBusy(false);
    }
  }

  return (
    <Layout user={user} title="Assinar documento">
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      {!hasWebCrypto() && <Alert severity="error" sx={{ mb: 2 }}>Este navegador não oferece a Web Crypto API. Use HTTPS (ou localhost) e um navegador atual.</Alert>}
      {!exp ? (!msg && <Loading />) : exp.status !== 'VALIDADA' ? (
        <Alert severity="info">Este documento não está aguardando assinatura (situação atual: {exp.status.toLowerCase()}).</Alert>
      ) : doc && (
        <div className="grid gap-4" style={{ maxWidth: 720 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{doc.parsed.title}</Typography>
            <Table size="small">
              <TableBody>
                <TableRow><TableCell>Valor</TableCell><TableCell>{money(doc.parsed.amount)}</TableCell></TableRow>
                <TableRow><TableCell>Data</TableCell><TableCell>{day(doc.parsed.date)}</TableCell></TableRow>
                <TableRow><TableCell>Descrição</TableCell><TableCell>{doc.parsed.description || '—'}</TableCell></TableRow>
                <TableRow><TableCell>Recibos</TableCell><TableCell>{doc.parsed.receipts.map((r) => r.name).join(', ')}</TableCell></TableRow>
                <TableRow><TableCell>Hash SHA-256</TableCell><TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>{doc.payloadHash}</TableCell></TableRow>
              </TableBody>
            </Table>
            {!doc.hashOk && <Alert severity="error" sx={{ mt: 2 }}>O hash calculado no navegador diverge do informado pelo servidor. Não assine.</Alert>}
          </Paper>

          {!keyReady ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6">1. Crie a sua chave de assinatura</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Um par de chaves é gerado neste navegador. A chave privada nunca sai daqui; só a pública é enviada ao servidor. Confirme a sua senha para registrá-la.
              </Typography>
              <div className="flex gap-2 flex-wrap">
                <TextField label="Sua senha" type="password" value={pwd} onChange={(x) => setPwd(x.target.value)} autoComplete="current-password" size="small" />
                <Button variant="contained" onClick={registerKey} disabled={busy || !pwd || !hasWebCrypto()}>Criar e registrar chave</Button>
              </div>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6">Confirmar assinatura</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Assinatura eletrônica avançada (Lei 14.063/2020), feita com a sua chave {localKey.keyId.slice(0, 12)}…
              </Typography>
              <FormControlLabel control={<Checkbox checked={agree} onChange={(x) => setAgree(x.target.checked)} />} label="Li o documento acima e assino digitalmente, ciente de que não poderei negar a autoria." />
              <div>
                <Button variant="contained" onClick={sign} disabled={busy || !agree || !doc.hashOk}>Assinar digitalmente</Button>
              </div>
            </Paper>
          )}
        </div>
      )}
    </Layout>
  );
}
