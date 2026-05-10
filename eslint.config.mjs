import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Türkçe metinde apostroflar yaygın; HTML entity okunmaz yapar.
      'react/no-unescaped-entities': 'off',
      // Phase-machine pattern'i için (countdown timer + faz geçişi).
      // Mevcut kullanım doğru; ileride useReducer'a refactor edilebilir.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
