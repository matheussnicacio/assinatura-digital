module.exports = {
  content: ['./pages/**/*.js', './components/**/*.js'],
  corePlugins: { preflight: false }, // o MUI (CssBaseline) já faz o reset; evita conflito
  theme: { extend: {} },
  plugins: [],
};
