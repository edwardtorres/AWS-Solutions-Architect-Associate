import type { Exhibit } from '../../puzzles/types';

/** Generic renderer for a puzzle's exhibit. Wide tables and code scroll inside their own focusable region, never the page. */
export function ExhibitView({ exhibit }: { exhibit: Exhibit }) {
  return (
    <div className="grid gap-3">
      {exhibit.map((sec, i) => (
        <section key={`${i}-${sec.title}`} aria-label={sec.title} className="rounded-xl border border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3">
          <h3 className="text-base font-semibold">{sec.title}</h3>
          {sec.kind === 'text' && <p className="mt-1 whitespace-pre-wrap break-words">{sec.text}</p>}
          {sec.kind === 'code' && (
            <div className="scroll-box mt-1" role="region" aria-label={`${sec.title} (scrollable)`} tabIndex={0}>
              <pre className="m-0 text-sm">{sec.text}</pre>
            </div>
          )}
          {sec.kind === 'table' && (
            <div className="scroll-box mt-1" role="region" aria-label={`${sec.title} (scrollable table)`} tabIndex={0}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {sec.head.map((h) => (
                      <th key={h} scope="col" className="border-b border-[var(--line)] px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="border-b border-[var(--line)] px-2 py-1 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
