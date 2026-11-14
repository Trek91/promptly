import { useEffect, useRef, useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, ArrowRight, UserRound, CalendarDays, Quote, CircleCheck, X } from 'lucide-react';
import { Button } from './ui.jsx';
import { tools } from './ModeSelector.jsx';
import { copyText, formatResult } from '../lib/api.js';
import { countWords } from '../../../shared/schemas.js';

export default function ResultPanel({ data, loading, error, mode, onRetry, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [completed, setCompleted] = useState({});
  const timer = useRef();
  const heading = useRef();
  useEffect(() => {
    setCopied(false); setCopyError(''); setCompleted({});
    if (data) heading.current?.focus({ preventScroll: true });
    return () => clearTimeout(timer.current);
  }, [data]);
  async function copy() {
    try {
      await copyText(formatResult(data, completed));
      setCopied(true); setCopyError('');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch (e) { setCopyError(e.message); }
  }
  return <section className="result-pane" aria-labelledby="result-title" aria-busy={loading}>
    <div className="pane-header"><h2 id="result-title" ref={heading} tabIndex={-1}><Sparkles size={17} />Your result</h2>
      {data ? <Button variant="ghost" onClick={copy}><span className="copy-icon">{copied ? <Check size={15} /> : <Copy size={15} />}</span>{copied ? 'Copied!' : 'Copy output'}</Button> : <span className="result-label">A little more clarity</span>}
    </div>
    <div className={`result-body ${!data ? 'result-centered' : ''}`}>
      {loading ? <div className="loading-state" role="status"><span className="empty-icon"><Sparkles size={26} /></span><h3>Making room for clarity…</h3><p>Giving your words a little attention.</p><div className="skeleton-lines" aria-hidden="true"><i /><i /><i /></div><Button variant="ghost" onClick={onCancel}><X size={14} />Cancel</Button></div>
        : error ? <div className="error-state" role="alert"><span className="error-icon"><AlertCircle size={27} /></span><h3>Let’s try that again.</h3><p>{error.message}</p><Button variant="outline" onClick={onRetry}>Try again<ArrowRight size={15} /></Button>{error.requestId && <small className="request-id">Reference: {error.requestId}</small>}</div>
          : !data ? <div className="empty-state"><div className="paper-art" aria-hidden="true"><div className="paper-back" /><div className="paper-front"><span /><span /><span /><span /></div><span className="paper-spark"><Sparkles size={23} strokeWidth={1.6} /></span></div><h3>{tools[mode].empty}</h3><p>{tools[mode].help}</p><span className="empty-nudge">Add your text to get started</span></div>
            : <div className="result-content">
              <div className="result-meta"><span className={`provider-pill ${data.meta.provider === 'demo' ? 'demo-pill' : ''}`}><span />{{ demo: 'Demo result', gemini: 'Gemini result', openai: 'OpenAI result' }[data.meta.provider]}</span><span>{(data.meta.durationMs / 1000).toFixed(1)}s</span></div>
              {data.meta.provider === 'demo' && <p className="demo-note">Sample text uses curated results. Other text uses simple local rules, with limited accuracy.</p>}
              {data.mode === 'summarize' && <><h3>In a nutshell</h3><p className="summary-text">{data.result.summary}</p><h4>Key points</h4><ul className="key-points">{data.result.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul><div className="takeaway"><span><Sparkles size={14} />The takeaway</span><p>{data.result.takeaway}</p></div></>}
              {data.mode === 'rewrite' && <><h3>A fresh take</h3><p className="rewritten-text">{data.result.rewrittenText}</p><div className="changes"><h4>A few thoughtful edits</h4><ul>{data.result.changes.map((change, i) => <li key={i}><Check size={14} />{change}</li>)}</ul></div></>}
              {data.mode === 'actions' && <><h3>{data.result.actionItems.length ? 'Your next steps' : 'No action items found'}</h3><p className="action-overview">{data.result.overview}</p><div className="task-list">{data.result.actionItems.map((item, i) => <article className={`task ${completed[i] ? 'task-done' : ''}`} key={i}><label className="task-heading"><input type="checkbox" checked={!!completed[i]} onChange={(e) => setCompleted((old) => ({ ...old, [i]: e.target.checked }))} /><strong>{item.task}</strong></label><div className="task-meta"><span><UserRound size={12} />{item.assignee || 'Unassigned'}</span><span><CalendarDays size={12} />{item.dueDate || 'No deadline'}</span>{item.priority !== 'unspecified' && <span className={`priority priority-${item.priority}`}>{item.priority}</span>}</div><details><summary><Quote size={12} />View source</summary><blockquote>{item.evidence}</blockquote></details></article>)}</div>{data.result.actionItems.length > 0 && <p className="task-progress"><CircleCheck size={14} />{Object.values(completed).filter(Boolean).length} of {data.result.actionItems.length} checked off in this session</p>}</>}
            </div>}
    </div>
    <div className="result-footer"><span>{data ? `${countWords(formatResult(data)).toLocaleString()} words in output` : 'Thoughtfully structured. Ready to use.'}</span><span className="copy-feedback" role="status">{copyError || (copied ? 'Copied to clipboard' : data ? 'Review before sharing' : '')}</span></div>
  </section>;
}
