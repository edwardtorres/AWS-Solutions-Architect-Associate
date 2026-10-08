import type { Block, Cue, Example, Status } from '../src/content/types.ts';

export interface BlockOpts {
  allow?: string[];
  status?: Status;
}

/**
 * A cited block. `quotes` are verbatim page excerpts: "src-id|excerpt" ties a quote to a
 * specific source; a bare string is tied to the first source.
 */
export function b(text: string, sources: string | string[], quotes: string[] = [], opts: BlockOpts = {}): Block {
  const ids = Array.isArray(sources) ? sources : [sources];
  const block: Block = { text, sources: ids };
  if (quotes.length > 0) {
    block.quotes = quotes.map((q) => {
      const i = q.indexOf('|');
      const tagged = i > 0 && /^[a-z0-9-]+$/.test(q.slice(0, i));
      return tagged ? { src: q.slice(0, i), text: q.slice(i + 1) } : { src: ids[0] as string, text: q };
    });
  }
  if (opts.allow) block.allow = opts.allow;
  if (opts.status) block.status = opts.status;
  return block;
}

export function cue(phrase: string, points: string, fact: Block): Cue {
  return { phrase, points, fact };
}

export function example(
  title: string,
  kind: Example['kind'],
  code: string,
  explanation: Block[],
): Example {
  return { title, kind, illustrative: true, code: code.replace(/^\n/, '').replace(/\s+$/, ''), explanation };
}
