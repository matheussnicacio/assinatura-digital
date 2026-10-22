import { Chip } from '@mui/material';
import { STATUS } from '../lib/format';

export default function StatusChip({ status }) {
  const s = STATUS[status] || { label: status, color: 'default' };
  return <Chip size="small" label={s.label} color={s.color} variant="outlined" />;
}
