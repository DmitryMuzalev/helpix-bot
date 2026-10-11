import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import fsd from './apps/web/eslint/fsd-boundaries.mjs';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/playwright-report/**', '**/test-results/**'],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, fsd },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'fsd/boundaries': 'error',
    },
  },
);
