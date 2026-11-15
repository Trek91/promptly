import { useRef, useState, useImperativeHandle } from 'react';
import { X, Trash2, ArrowUpRight, History } from 'lucide-react';
import { Button } from './ui.jsx';
import { historyTitle, HISTORY_LIMIT } from '../lib/history.js';

const labels = { summarize: 'Summary', rewrite: 'Rewrite', actions: 'Task list' };
export default function HistoryDrawer({ ref, entries, notice, onOpen, onDelete, onClear }) {
  const dialog = useRef(null);
  const [filter, setFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);
  useImperativeHandle(ref, () => ({ open() { setConfirmClear(false); dialog.current.showModal(); } }));
  const visible = entries.filter((entry) => filter === 'all' || entry.data.mode === filter);
  return <dialog ref={dialog} className="history-drawer" aria-labelledby="history-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
    <div className="history-header"><h2 id="history-title">Past tasks</h2><Button variant="ghost" className="icon-button" aria-label="Close past tasks" onClick={() => dialog.current.close()} autoFocus><X size={19} aria-hidden="true" /></Button></div>
    <p className="history-description">Your latest {HISTORY_LIMIT} results, saved on this browser. Reopen a result to keep working.</p>
    {notice && <p className="history-notice" role="status">{notice}</p>}
    <div className="history-toolbar"><label className="sr-only" htmlFor="history-filter">Filter past tasks</label><select id="history-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All tools</option><option value="summarize">Summaries</option><option value="rewrite">Rewrites</option><option value="actions">Task lists</option></select><span>{visible.length} {visible.length === 1 ? 'result' : 'results'}</span></div>
    <div className="history-list">
      {!visible.length ? <div className="history-empty"><History size={24} aria-hidden="true" /><h3>{entries.length ? 'No results for this tool' : 'A place to pick up again'}</h3><p>{entries.length ? 'Choose another tool above to find your saved work.' : 'Run any tool and its result will appear here, including your edits and task progress.'}</p></div>
        : visible.map((entry) => {
          const result = entry.editedResult || entry.data.result;
          const done = entry.data.mode === 'actions' ? result.actionItems.filter((_, i) => entry.completed[i]).length : 0;
          return <article className="history-row" key={entry.id}>
            <button className="history-open" onClick={() => { onOpen(entry); dialog.current.close(); }} aria-label={`Open ${labels[entry.data.mode].toLowerCase()}: ${historyTitle(entry)}`}>
              <span className="history-row-meta"><span>{labels[entry.data.mode]}{entry.editedResult ? ' · Edited' : ''}</span><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(entry.createdAt))}</time></span>
              <strong>{historyTitle(entry)}</strong>
              <span className="history-row-bottom">{entry.data.mode === 'actions' ? `${done} of ${result.actionItems.length} complete` : `${entry.data.meta.inputWords} source words`}<ArrowUpRight size={15} aria-hidden="true" /></span>
            </button>
            <Button variant="ghost" className="icon-button history-delete" aria-label={`Delete ${labels[entry.data.mode].toLowerCase()}: ${historyTitle(entry)}`} onClick={() => onDelete(entry.id)}><Trash2 size={15} aria-hidden="true" /></Button>
          </article>;
        })}
    </div>
    <footer className="history-footer">
      {confirmClear && entries.length ? <div className="history-confirm"><p>Delete all saved tasks from this browser?</p><div><Button variant="outline" onClick={() => setConfirmClear(false)}>Keep tasks</Button><Button onClick={() => { onClear(); setConfirmClear(false); }}>Delete all</Button></div></div>
        : <><p>Saved text stays on this browser until deleted or replaced by newer results. No account or sync.</p><Button variant="ghost" disabled={!entries.length} onClick={() => setConfirmClear(true)}><Trash2 size={14} aria-hidden="true" />Clear all</Button></>}
    </footer>
  </dialog>;
}
