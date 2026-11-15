import { useMemo } from 'react';
import { compareWords } from '../lib/diff.js';

export default function RewriteComparison({ source, revised }) {
  const { parts, grouped } = useMemo(() => compareWords(source, revised), [source, revised]);
  const changed = parts.some((part) => part.type !== 'equal');
  return <section className="rewrite-comparison" aria-label="Rewrite changes">
    <div className="diff-legend"><span><del>Removed</del></span><span><ins>Added</ins></span></div>
    {!changed && <p className="diff-note">No wording changes from the original.</p>}
    {grouped && <p className="diff-note">Large changes are grouped into passages.</p>}
    <p className="diff-document">{parts.map((part, i) => part.type === 'added' ? <ins key={i} aria-label={`Added: ${part.text}`}>{part.text}</ins> : part.type === 'removed' ? <del key={i} aria-label={`Removed: ${part.text}`}>{part.text}</del> : <span key={i}>{part.text}</span>)}</p>
  </section>;
}
