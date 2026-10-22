import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Paper, Typography, Button, Alert, Chip, Table, TableBody, TableRow, TableCell } from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import ExpenseTable from '../components/ExpenseTable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { verifyPayload } from '../lib/crypto';
import { dateTime } from '../lib/format';

const LABELS = {
  assinaturaCriptografica: 'A assinatura digital confere com a chave pública (autenticidade)',
  chaveDoSignatario: 'A chave pertence ao signatário registrado',
  chaveValidaNaAssinatura: 'A chave estava válida na data da assinatura',
  hashDoDocumento: 'O hash SHA-256 do documento assinado confere',
  documentoNaoAlterado: 'Os dados do documento não mudaram depois de assinados (integridade)',
  recibosIntegros: 'Os recibos anexados não foram alterados',
};

export default function VerifySignature() {
  const user = useAuth(['gerente']);
  const router = useRouter();
  const [list, setList] = useState(null);
  const [res, setRes] = useState(null);
  const [local, setLocal] = useState(null); // verificação independente no navegador
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = router.query.id;

  useEffect(() => {
    if (user && router.isReady && !id) api('/expenses?status=ASSINADA').then(setList).catch((e) => setMsg(e.message));
  }, [user, router.isReady, id]);

  if (!user) return <Loading />;

  async function verify() {
    setBusy(true);
    setMsg(null);
    setLocal(null);
    try {
      const r = await api(`/signatures/${id}/verify`);
      setRes(r);
      setLocal(await verifyPayload(r.signature.spki, r.signature.payload, r.signature.signature));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <Layout user={user} title="Verificar assinaturas">
        {msg && <Alert severity="error" sx={{ mb: 2 }}>{msg}</Alert>}
        <Typography color="text.secondary" sx={{ mb: 2 }}>Escolha um documento assinado para verificar.</Typography>
        {!list && !msg ? <Loading /> : <ExpenseTable items={list} user={user} rowAction={(e) => ({ label: 'Verificar', href: `/verifySignature?id=${e.id}` })} empty="Nenhum documento assinado ainda." />}
      </Layout>
    );
  }

  return (
    <Layout user={user} title="Verificar assinatura">
      <Button component={Link} href="/signedExpenses" sx={{ mb: 2 }}>Voltar aos assinados</Button>
      {msg && <Alert severity="error" sx={{ mb: 2 }}>{msg}</Alert>}
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 760 }}>
        <Button variant="contained" onClick={verify} disabled={busy}>Verificar autenticidade</Button>

        {res && (
          <div className="grid gap-4 mt-4">
            <Alert severity={res.valid ? 'success' : 'error'}>
              {res.valid ? 'Assinatura válida: autoria e integridade comprovadas.' : 'Assinatura INVÁLIDA: ao menos uma verificação falhou.'}
            </Alert>
            <Table size="small">
              <TableBody>
                {Object.entries(res.checks).map(([k, ok]) => (
                  <TableRow key={k}>
                    <TableCell>{LABELS[k]}</TableCell>
                    <TableCell align="right"><Chip size="small" color={ok ? 'success' : 'error'} label={ok ? 'OK' : 'Falhou'} /></TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Conferência independente no navegador (Web Crypto API)</TableCell>
                  <TableCell align="right"><Chip size="small" color={local ? 'success' : 'error'} label={local ? 'OK' : 'Falhou'} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table size="small">
              <TableBody>
                <TableRow><TableCell>Documento</TableCell><TableCell>{res.expense.title}</TableCell></TableRow>
                <TableRow><TableCell>Signatário</TableCell><TableCell>{res.signature.signer.name} ({res.signature.signer.email})</TableCell></TableRow>
                <TableRow><TableCell>Assinado em</TableCell><TableCell>{dateTime(res.signature.signedAt)}</TableCell></TableRow>
                <TableRow><TableCell>Algoritmo</TableCell><TableCell>{res.signature.algorithm}</TableCell></TableRow>
                <TableRow><TableCell>Impressão da chave</TableCell><TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>{res.signature.keyId}</TableCell></TableRow>
                <TableRow><TableCell>Hash do documento</TableCell><TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>{res.signature.payloadHash}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </Paper>
    </Layout>
  );
}
