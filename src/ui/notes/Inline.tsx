import { createContext, Fragment, useContext, type ReactNode } from 'react';
import type { Block } from '../../content/types';
import type { Shared } from '../../content/store';
import { hrefGlossary } from '../../lib/route';

/** Numbers sources in order of first appearance so citation markers match the list at the foot of the page. */
export interface Cites {
  number: (sourceId: string) => number;
  shared: Shared;
}
export const CitesContext = createContext<Cites | null>(null);

function useCites(): Cites {
  const c = useContext(CitesContext);
  if (!c) throw new Error('CitesContext is missing');
  return c;
}

const TOKEN = /(\{\{(?:term|rename):[a-z0-9-]+(?:\|[^}]*)?\}\}|\*\*[^*]+\*\*|`[^`]+`)/g;

/** Renders **bold**, `code`, {{term:id}} and {{rename:id}}. Never injects HTML. */
export function Inline({ text }: { text: string }): ReactNode {
  const { shared } = useCites();
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const term = /^\{\{term:([a-z0-9-]+)(?:\|([^}]*))?\}\}$/.exec(part);
        if (term) {
          const id = term[1] as string;
          const g = shared.glossary.find((x) => x.id === id);
          return (
            <a key={i} className="inline-link" href={hrefGlossary(id)}>
              {term[2] ?? g?.term ?? id}
            </a>
          );
        }
        const rename = /^\{\{rename:([a-z0-9-]+)\}\}$/.exec(part);
        if (rename) {
          const r = shared.renamed.find((x) => x.id === rename[1]);
          return r ? (
            <span key={i}>
              {r.examGuideName} <span className="text-[var(--fg-muted)]">(also {r.otherName})</span>
            </span>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

const STATUS_LABEL = { preview: 'Preview', deprecated: 'Deprecated', retired: 'Retired' } as const;

export function Markers({ ids }: { ids: readonly string[] }) {
  const { number, shared } = useCites();
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.7rem] text-[var(--fg-muted)]">
      {ids.map((id, i) => (
        <span key={id} title={shared.sources.get(id)?.title}>
          {i > 0 ? ',' : ''}[{number(id)}]
        </span>
      ))}
    </sup>
  );
}

export function BlockView({ block, as: Tag = 'p' }: { block: Block; as?: 'p' | 'li' | 'span' }) {
  const { shared } = useCites();
  const renameIds = [...block.text.matchAll(/\{\{rename:([a-z0-9-]+)\}\}/g)].map((m) => m[1] as string);
  const renameSources = renameIds.flatMap((id) => shared.renamed.find((r) => r.id === id)?.relation.sources ?? []);
  const ids = [...new Set([...block.sources, ...renameSources])];
  return (
    <Tag className="notes-block">
      {block.status && (
        <span className="chip mr-1.5" data-kind="status">
          {STATUS_LABEL[block.status]}
        </span>
      )}
      <Inline text={block.text} />
      <Markers ids={ids} />
    </Tag>
  );
}
