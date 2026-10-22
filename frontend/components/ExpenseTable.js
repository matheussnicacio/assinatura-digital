import Link from 'next/link';
import { Table, TableHead, TableRow, TableCell, TableBody, Button, Paper, Typography } from '@mui/material';
import StatusChip from './StatusChip';
import { money, day } from '../lib/format';

// rowAction(expense) => { label, href } | null
export default function ExpenseTable({ items, user, rowAction, empty = 'Nenhum documento por aqui.' }) {
  if (!items) return null;
  if (!items.length) return <Typography color="text.secondary">{empty}</Typography>;
  return (
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Despesa</TableCell>
            {user.role === 'gerente' && <TableCell>Funcionário</TableCell>}
            <TableCell>Data</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Situação</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((e) => {
            const a = rowAction && rowAction(e);
            return (
              <TableRow key={e.id} hover>
                <TableCell>{e.title}</TableCell>
                {user.role === 'gerente' && <TableCell>{e.owner.name}</TableCell>}
                <TableCell>{day(e.date)}</TableCell>
                <TableCell align="right">{money(e.amount)}</TableCell>
                <TableCell>
                  <StatusChip status={e.status} />
                </TableCell>
                <TableCell align="right">
                  {a && (
                    <Button size="small" variant="outlined" component={Link} href={a.href}>
                      {a.label}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
