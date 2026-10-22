export const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const day = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
export const dateTime = (d) => new Date(d).toLocaleString('pt-BR');
export const STATUS = {
  SUBMETIDA: { label: 'Aguardando validação', color: 'warning' },
  VALIDADA: { label: 'Aguardando assinatura', color: 'info' },
  REJEITADA: { label: 'Rejeitada', color: 'error' },
  ASSINADA: { label: 'Assinada', color: 'success' },
};
