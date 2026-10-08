import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ overrideConfigFile: new URL('../eslint.config.js', import.meta.url).pathname });

async function lint(code: string, file = 'src/fixture.tsx') {
  const [result] = await eslint.lintText(code, { filePath: new URL(`../${file}`, import.meta.url).pathname });
  return result?.messages.filter((m) => m.ruleId === 'no-restricted-syntax') ?? [];
}

describe('effect block-body rule', () => {
  it('rejects the expression-bodied effect that crashed a page on Chrome', async () => {
    const bad = `import { useEffect } from 'react';
export function P() { useEffect(() => window.scrollTo({ top: 0 }), []); return null; }`;
    const messages = await lint(bad);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatch(/block body/);
  });

  it('rejects expression bodies in useLayoutEffect, useInsertionEffect and React.useEffect', async () => {
    const bad = `import * as React from 'react';
import { useLayoutEffect, useInsertionEffect } from 'react';
export function P() {
  useLayoutEffect(() => document.body.focus(), []);
  useInsertionEffect(() => document.title, []);
  React.useEffect(() => window.scrollTo(0, 0), []);
  return null;
}`;
    expect(await lint(bad)).toHaveLength(3);
  });

  it('accepts block-bodied effects, including ones that return a cleanup', async () => {
    const good = `import { useEffect } from 'react';
export function P() {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { const t = setTimeout(() => undefined, 1); return () => { clearTimeout(t); }; }, []);
  return null;
}`;
    expect(await lint(good)).toHaveLength(0);
  });

  it('leaves non-effect hooks and callbacks alone', async () => {
    const ok = `import { useMemo, useCallback } from 'react';
export function P() { const a = useMemo(() => 1, []); const b = useCallback(() => a, [a]); return b; }`;
    expect(await lint(ok)).toHaveLength(0);
  });

  it('keeps the whole src tree free of expression-bodied effects', async () => {
    const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
    const offenders = results.flatMap((r) => r.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map(() => r.filePath));
    expect(offenders).toEqual([]);
  });
});
