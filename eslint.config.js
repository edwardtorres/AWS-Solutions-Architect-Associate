import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const EFFECTS = '/^(useEffect|useLayoutEffect|useInsertionEffect)$/';

/**
 * Lesson learned: a one-line effect such as `useEffect(() => window.scrollTo(...))`
 * returns scrollTo()'s value; React treats any returned value as a cleanup function
 * and crashed a page on current Chrome. Effects must always use block bodies.
 */
export const EFFECT_BLOCK_BODY_RULE = [
  'error',
  {
    selector: `CallExpression[callee.name=${EFFECTS}] > ArrowFunctionExpression.arguments:first-child[body.type!='BlockStatement']`,
    message: 'Effect callbacks must use a block body ({ ... }) so they never return a value by accident.',
  },
  {
    selector: `CallExpression[callee.property.name=${EFFECTS}] > ArrowFunctionExpression.arguments:first-child[body.type!='BlockStatement']`,
    message: 'Effect callbacks must use a block body ({ ... }) so they never return a value by accident.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'test-results', 'src/**/__fixtures__/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': EFFECT_BLOCK_BODY_RULE,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
);
