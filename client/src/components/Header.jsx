import { CircleHelp, X, Sparkles, LockKeyhole } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './ui.jsx';

export default function Header() {
  const dialog = useRef(null);
  return <>
    <header className="site-header">
      <a className="brand" href="/" aria-label="Promptly home"><span className="brand-mark" aria-hidden="true">p</span>promptly<span className="brand-period">.</span></a>
      <div className="workspace-label"><span className="status-dot" /> Your workspace <span className="version">v1.0</span></div>
      <Button variant="ghost" onClick={() => dialog.current.showModal()}><CircleHelp size={17} /><span>Quick guide</span></Button>
    </header>
    <dialog ref={dialog} className="help-dialog" aria-labelledby="guide-title" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-top"><span className="empty-icon"><Sparkles size={24} /></span><Button variant="ghost" aria-label="Close guide" onClick={() => dialog.current.close()} autoFocus><X size={20} /></Button></div>
      <h2 id="guide-title">A clearer way to work.</h2>
      <p>Pick a tool, paste your text, and let Promptly do the first pass.</p>
      <ul className="guide-list">
        <li><strong>Summarize</strong><span>A short overview, key points, and one takeaway. Choose concise or detailed.</span></li>
        <li><strong>Rewrite</strong><span>Keep the meaning. Change the tone: professional, casual, concise, or polished.</span></li>
        <li><strong>Extract tasks</strong><span>Find explicit next steps, owners, and deadlines. Missing details stay unspecified.</span></li>
      </ul>
      <div className="guide-note"><LockKeyhole size={17} /><p>Promptly doesn’t save your text. Demo mode uses local rules and curated samples; real AI sends text to the provider configured on the server (Gemini or OpenAI). Always review the result.</p></div>
    </dialog>
  </>;
}
