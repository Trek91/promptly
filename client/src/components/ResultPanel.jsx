import { useEffect, useRef, useState } from 'react';
import { Copy, Check, AlertCircle, RotateCw, ArrowRight, ChevronRight, LoaderCircle, Download } from 'lucide-react';
import { Button } from './ui.jsx';
import { tools } from './ModeSelector.jsx';
import { copyText, formatResult, downloadText } from '../lib/api.js';
import { countWords } from '../../../shared/schemas.js';

const outlines = {
  summarize: [['Overview', 'A condensed version of the source.'], ['Key points', 'The details worth keeping.'], ['Takeaway', 'The main idea in one sentence.']],
  rewrite: [['Rewritten text', 'A new draft in your selected tone.'], ['Edits made', 'A brief explanation of what changed.']],
  actions: [['Tasks', 'Concrete requests and commitments.'], ['Owners & dates', 'Included when the source provides them.'], ['Source quotes', 'Evidence you can check for each task.']],
};

function EmptyResult({ mode }) {
  return <div className="empty-state">
    <div className="empty-flow"><span>Original</span><ArrowRight size={14} aria-hidden="true" /><span>{tools[mode].resultTitle}</span></div>
    <h3>{tools[mode].empty}</h3>
    <p>{tools[mode].help}</p>
    <dl className="output-outline">{outlines[mode].map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}</dl>
  </div>;
}

function LoadingResult({ mode, onCancel }) {
  return <div className="loading-state" role="status">
    <div className="loading-label"><LoaderCircle size={16} className="spin" aria-hidden="true" /><span>{tools[mode].loading}</span><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>
    <div className={`skeleton-document skeleton-${mode}`} aria-hidden="true">
      {[0, 1, 2].map((group) => <div className="skeleton-block" key={group}><i className="skeleton-heading" /><i /><i /><i className="skeleton-short" /></div>)}
    </div>
  </div>;
}

export default function ResultPanel({ data, loading, error, mode, active, sourceText, onLocateSource, onRetry, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [completed, setCompleted] = useState({});
  const timer = useRef();
  const heading = useRef();
  useEffect(() => {
    setCopied(false); setCopyError(''); setCompleted({}); setDownloaded(false);
    if (data) heading.current?.focus({ preventScroll: true });
    return () => clearTimeout(timer.current);
  }, [data]);
  async function copy() {
    try {
      await copyText(formatResult(data, completed));
      setCopied(true); setCopyError('');
      setDownloaded(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch (e) { setCopyError(e.message); }
  }
  function download() {
    try {
      downloadText(formatResult(data, completed), `promptly-${data.mode === 'actions' ? 'action-items' : data.mode}.txt`);
      setDownloaded(true); setCopied(false); setCopyError('');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDownloaded(false), 2200);
    } catch {
      setCopyError('Download unavailable. Copy the output instead.');
    }
  }
  const done = Object.values(completed).filter(Boolean).length;
  return <section id="result-pane" className={`result-pane ${active ? 'is-mobile-visible' : ''}`} aria-labelledby="result-title" aria-busy={loading}>
    <div className="pane-header"><h2 id="result-title" ref={heading} tabIndex={-1}>{tools[mode].resultTitle}</h2>
      {data ? <div className="result-actions"><Button variant="ghost" onClick={copy}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied!' : 'Copy output'}</Button><Button variant="ghost" className="icon-button" onClick={download} aria-label="Download output" title="Download as text"><Download size={15} aria-hidden="true" /></Button></div> : <span className="result-label">Output</span>}
    </div>
    <div className="result-body" tabIndex={0} aria-label={`${tools[mode].resultTitle} output`}>
      {loading ? <LoadingResult mode={mode} onCancel={onCancel} />
        : error ? <div className="error-state" role="alert"><AlertCircle size={22} aria-hidden="true" /><h3>Couldn’t create the result</h3><p>{error.message}</p><Button variant="outline" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />Try again</Button>{error.requestId && <small className="request-id">Reference: {error.requestId}</small>}</div>
          : !data ? <EmptyResult mode={mode} />
            : <div className="result-content">
              <div className="result-meta"><span className={`provider-pill ${data.meta.provider === 'demo' ? 'demo-pill' : ''}`}><span aria-hidden="true" />{{ demo: 'Demo result', gemini: 'Gemini result', openai: 'OpenAI result' }[data.meta.provider]}</span><span>{(data.meta.durationMs / 1000).toFixed(1)}s</span></div>
              {data.meta.provider === 'demo' && <p className="demo-note">Sample text uses curated results. Other text uses local rules, with limited accuracy.</p>}
              {data.mode === 'summarize' && <><h3>Overview</h3><p className="summary-text">{data.result.summary}</p><h3 className="section-heading">Key points</h3><ul className="key-points">{data.result.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul><div className="takeaway"><h3>Takeaway</h3><p>{data.result.takeaway}</p></div></>}
              {data.mode === 'rewrite' && <><h3 className="sr-only">Revised draft</h3><p className="rewritten-text">{data.result.rewrittenText}</p><div className="changes"><h3>Edits made</h3><ul>{data.result.changes.map((change, i) => <li key={i}><Check size={14} aria-hidden="true" />{change}</li>)}</ul></div></>}
              {data.mode === 'actions' && <><div className="task-list-heading"><h3>{data.result.actionItems.length ? `${data.result.actionItems.length} action ${data.result.actionItems.length === 1 ? 'item' : 'items'}` : 'No action items found'}</h3>{data.result.actionItems.length > 0 && <span className="task-progress">{done} of {data.result.actionItems.length} complete</span>}</div><p className="action-overview">{data.result.overview}</p><div className="task-list">{data.result.actionItems.map((item, i) => <article className={`task ${completed[i] ? 'task-done' : ''}`} key={i}>
                <label className="task-heading"><input type="checkbox" checked={!!completed[i]} onChange={(e) => setCompleted((old) => ({ ...old, [i]: e.target.checked }))} /><strong>{item.task}</strong></label>
                <div className="task-meta"><span><span className="field-label">Owner</span><span>{item.assignee || 'Unassigned'}</span></span><span><span className="field-label">Due</span><span>{item.dueDate || 'No deadline'}</span></span>{item.priority !== 'unspecified' && <span className={`priority priority-${item.priority}`}>{item.priority} priority</span>}</div>
                <details><summary><ChevronRight size={13} aria-hidden="true" />View source</summary><blockquote>{item.evidence}</blockquote><Button variant="ghost" className="locate-source" onClick={() => onLocateSource(item.evidence)} disabled={!item.evidence.trim() || !sourceText.includes(item.evidence)}>{item.evidence.trim() && sourceText.includes(item.evidence) ? 'Find in original' : 'Quote not found in original'}</Button></details>
              </article>)}</div></>}
            </div>}
    </div>
    <div className="result-footer"><span>{data ? `${countWords(formatResult(data)).toLocaleString()} words in output` : loading ? 'Processing your source text' : error ? 'Your source text is unchanged' : 'Results appear here'}</span><span className={`copy-feedback ${copyError ? 'copy-error' : ''}`} role="status">{copyError || (copied ? 'Copied to clipboard' : downloaded ? 'Download started' : '')}</span></div>
  </section>;
}
