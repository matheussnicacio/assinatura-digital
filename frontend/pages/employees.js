import { useCallback, useEffect, useState } from 'react';
import {
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, FormControlLabel, Switch, Alert, Chip, Box,
} from '@mui/material';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const EMPTY = { name: '', email: '', cargo: '', role: 'funcionario', password: '', active: true };

export default function Employees() {
  const user = useAuth(['gerente']);
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null); // null = fechado
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => api('/employees').then(setList).catch((e) => setMsg({ type: 'error', text: e.message })), []);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return <Loading />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save() {
    try {
      const { password, ...rest } = form;
      const body = editingId ? { ...rest, ...(password ? { password } : {}) } : { ...rest, password };
      await api(editingId ? `/employees/${editingId}` : '/employees', { method: editingId ? 'PUT' : 'POST', body });
      setForm(null);
      setMsg({ type: 'success', text: editingId ? 'Funcionário atualizado.' : 'Funcionário cadastrado.' });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function remove(u) {
    if (!window.confirm(`Excluir ${u.name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api(`/employees/${u.id}`, { method: 'DELETE' });
      setMsg({ type: 'success', text: 'Funcionário excluído.' });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <Layout user={user} title="Funcionários">
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cadastrar funcionário</Button>
      </Box>
      {!list ? <Loading /> : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell><TableCell>E-mail</TableCell><TableCell>Cargo</TableCell>
                <TableCell>Perfil</TableCell><TableCell>Situação</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.cargo}</TableCell>
                  <TableCell>{u.role === 'gerente' ? 'Gerente' : 'Funcionário'}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" color={u.active ? 'success' : 'default'} label={u.active ? 'Ativo' : 'Inativo'} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => { setEditingId(u.id); setForm({ name: u.name, email: u.email, cargo: u.cargo || '', role: u.role, password: '', active: u.active }); }}>Editar</Button>
                    <Button size="small" color="secondary" disabled={u.id === user.id} onClick={() => remove(u)}>Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Editar funcionário' : 'Cadastrar funcionário'}</DialogTitle>
        {form && (
          <DialogContent className="grid gap-4" sx={{ pt: '8px !important' }}>
            <TextField label="Nome completo" value={form.name} onChange={set('name')} required />
            <TextField label="E-mail" type="email" value={form.email} onChange={set('email')} required />
            <TextField label="Cargo" value={form.cargo} onChange={set('cargo')} />
            <TextField select label="Perfil" value={form.role} onChange={set('role')}>
              <MenuItem value="funcionario">Funcionário</MenuItem>
              <MenuItem value="gerente">Gerente</MenuItem>
            </TextField>
            <TextField
              label={editingId ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}
              type="password" value={form.password} onChange={set('password')} autoComplete="new-password"
              helperText="Mínimo de 10 caracteres, com maiúscula, minúscula e número."
            />
            {editingId && <FormControlLabel control={<Switch checked={form.active} onChange={set('active')} />} label="Conta ativa" />}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setForm(null)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Salvar funcionário</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
