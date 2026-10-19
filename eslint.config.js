// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'artifacts/**', 'logoepet/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Desabilitada: a regra (React Compiler) flagga o padrão legítimo de
      // fetch-on-mount (setState após await em useEffect), usado em todo o app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
