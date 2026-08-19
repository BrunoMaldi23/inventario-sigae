const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'prisma/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        Express: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
    },
  },
  { ignores: ['dist/**', 'node_modules/**', '*.config.js', 'jest.config.js', 'eslint.config.js', 'coverage/**'] },
]);