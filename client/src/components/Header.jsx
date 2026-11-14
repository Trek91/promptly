import { CircleHelp, X, LockKeyhole, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './ui.jsx';

export default function Header() {
  const dialog = useRef(null);
  return <>
    <header className="site-header">
      <div className="header-location"><a className="brand" href="/" aria-label="Promptly home"><svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 5 7 7-7 7M13 19h7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="square" /></svg>Promptly</a><ChevronRight size={13} aria-hidden="true" /><span className="workspace-label">Workspace</span></div>
      <div className="header-utilities"><span className="session-label">Session only</span><Button variant="ghost" onClick={() => dialog.current.showModal()}><CircleHelp size={16} aria-hidden="true" /><span>Quick guide</span></Button></div>
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
      <div className="guide-note"><LockKeyhole size={16} aria-hidden="true" /><p>Text is not saved by Promptly. Real AI sends it to the configured provider. Demo mode uses local rules and sample results. Review the output before sharing.</p></div>
    </dialog>
  </>;
}
