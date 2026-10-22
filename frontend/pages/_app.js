import Head from 'next/head';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '../styles/globals.css';

const theme = createTheme({
  palette: { primary: { main: '#1d3557' }, secondary: { main: '#a4161a' } },
  typography: { fontFamily: '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif' },
  shape: { borderRadius: 6 },
});

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Despesas assinadas</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
