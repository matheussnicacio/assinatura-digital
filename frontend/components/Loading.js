import { Box, CircularProgress } from '@mui/material';

export default function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <CircularProgress />
    </Box>
  );
}
