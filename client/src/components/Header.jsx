import { CircleHelp, X, LockKeyhole, Minimize2, Maximize2, History } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './ui.jsx';

export default function Header({ focusMode, onToggleFocus, onOpenHistory }) {
  const dialog = useRef(null);
  return <>
    <header className="site-header">
      <div className="header-location"><a className="brand" href="/" aria-label="Promptly home"><svg className="brand-mark" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M7 23V6h7a6 6 0 0 1 0 12h-3M12 11h3M19 22h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>promptly<span className="brand-stop">.</span></a>{focusMode ? <h1 className="focus-title">Text workspace</h1> : <span className="workspace-label">A space to write</span>}</div>
      <div className="header-utilities"><Button variant="ghost" aria-label="Past tasks" onClick={onOpenHistory}><History size={16} aria-hidden="true" /><span>Past tasks</span></Button><Button variant="ghost" className="focus-toggle" aria-label={focusMode ? 'Exit focus view' : 'Enter focus view'} aria-pressed={focusMode} onClick={onToggleFocus}>{focusMode ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}<span>{focusMode ? 'Exit focus' : 'Focus view'}</span></Button><Button variant="ghost" aria-label="Quick guide" onClick={() => dialog.current.showModal()}><CircleHelp size={16} aria-hidden="true" /><span>Quick guide</span></Button></div>
    </header>
    <dialog ref={dialog} className="help-dialog" aria-labelledby="guide-title" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-top"><span>Using Promptly</span><Button variant="ghost" className="icon-button" aria-label="Close guide" onClick={() => dialog.current.close()} autoFocus><X size={18} aria-hidden="true" /></Button></div>
      <h2 id="guide-title">Three tools. One workspace.</h2>
      <p>Paste your source text, choose a tool, and review the result alongside the original.</p>
      <ul className="guide-list">
        <li><strong>Summarize</strong><span>A short overview, key points, and one takeaway. Choose concise or detailed.</span></li>
        <li><strong>Rewrite</strong><span>Keep the meaning. Change the tone: professional, casual, concise, or polished.</span></li>
        <li><strong>Extract tasks</strong><span>Find explicit next steps, owners, and deadlines. Missing details stay unspecified.</span></li>
      </ul>
      <div className="guide-note"><LockKeyhole size={16} aria-hidden="true" /><p>Your latest 20 results, source text, edits, and task progress are saved on this browser. Delete them in Past tasks. Real AI sends source text to the configured provider. Demo mode uses local rules and sample results. Review the output before sharing.</p></div>
    </dialog>
  </>;
}
