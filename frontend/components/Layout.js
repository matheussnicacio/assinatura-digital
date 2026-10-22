import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { logout } from '../lib/auth';

const NAV = {
  gerente: [
    ['Início', '/dashboard'],
    ['Funcionários', '/employees'],
    ['Nova despesa', '/submitExpense'],
    ['Pendentes', '/pendingExpenses'],
    ['Assinadas', '/signedExpenses'],
    ['Verificar', '/verifySignature'],
  ],
  funcionario: [
    ['Início', '/dashboard'],
    ['Nova despesa', '/submitExpense'],
    ['Pendentes', '/pendingExpenses'],
    ['Assinadas', '/signedExpenses'],
  ],
};

export default function Layout({ user, title, children }) {
  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ mr: 2, fontWeight: 700 }}>
            Despesas assinadas
          </Typography>
          {(NAV[user.role] || []).map(([label, href]) => (
            <Button key={href} color="inherit" component={Link} href={href} size="small">
              {label}
            </Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2">{user.name}</Typography>
          <Button color="inherit" size="small" onClick={logout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 3, fontWeight: 700 }}>
          {title}
        </Typography>
        {children}
      </Container>
    </>
  );
}
