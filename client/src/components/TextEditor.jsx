import { ArrowUpRight, FileText, Trash2, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './ui.jsx';
import { countWords, MAX_CHARACTERS, MAX_WORDS } from '../../../shared/schemas.js';
import { tools } from './ModeSelector.jsx';

export default function TextEditor({ text, mode, loading, active, sourceQuote, onExitSource, onChange, onSample, onClear, onSubmit }) {
  const sourceReader = useRef();
  const highlight = useRef();
  const editor = useRef();
  const restoreEditorFocus = useRef(false);
  useEffect(() => {
    if (!sourceQuote) {
      if (restoreEditorFocus.current) editor.current?.focus({ preventScroll: true });
      restoreEditorFocus.current = false;
      return;
    }
    sourceReader.current?.focus({ preventScroll: true });
    highlight.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [sourceQuote]);
  const words = countWords(text);
  const overLimit = words > MAX_WORDS || text.length > MAX_CHARACTERS;
  return <section id="original-pane" className={`editor-pane ${active ? 'is-mobile-visible' : ''}`} aria-labelledby="input-title">
    <div className="pane-header"><h2 id="input-title">Original text</h2><div className="editor-tools">
      <Button variant="ghost" onClick={onSample} title="Replace the editor with sample text"><FileText size={14} aria-hidden="true" /><span>Try a sample</span></Button>
      <Button variant="ghost" className="icon-button" aria-label="Clear text" title="Clear text" onClick={onClear} disabled={!text}><Trash2 size={15} aria-hidden="true" /></Button>
    </div></div>
    <div className={`editor-body ${sourceQuote ? 'reviewing-source' : ''}`}>
      {sourceQuote ? <>
        <div className="source-review-bar"><span>Source quote</span><Button variant="ghost" onClick={() => { restoreEditorFocus.current = true; onExitSource(); }}>Edit text</Button></div>
        <div id="source-text" className="source-reader" ref={sourceReader} tabIndex={0} role="region" aria-label="Highlighted original text">{text.slice(0, sourceQuote.start)}<mark ref={highlight}>{text.slice(sourceQuote.start, sourceQuote.end)}</mark>{text.slice(sourceQuote.end)}</div>
      </> : <><label htmlFor="source-text" className="sr-only">Original text</label>
      <textarea id="source-text" ref={editor} value={text} onChange={(e) => onChange(e.target.value)} placeholder="Paste your text here…" spellCheck="true" aria-describedby="input-count input-limit" aria-invalid={overLimit} onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onSubmit(); }
      }} />
      {!text && <div className="editor-invitation"><p>{tools[mode].hint}</p><span>Or use <strong>Try a sample</strong> to explore this tool.</span></div>}
      </>}
    </div>
    <div className="input-metrics"><span id="input-count">{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span><span>{text.length.toLocaleString()} {text.length === 1 ? 'character' : 'characters'}</span><span id="input-limit" className={overLimit ? 'over-limit' : ''}>{overLimit ? 'Text limit exceeded' : `${MAX_WORDS.toLocaleString()} word limit`}<span className="sr-only">; {MAX_CHARACTERS} character limit</span></span></div>
    <div className="editor-footer"><span className="keyboard-tip"><kbd>Ctrl</kbd><kbd>↵</kbd><span>to run</span></span>
      <Button onClick={onSubmit} disabled={loading || !text.trim() || overLimit}>{loading ? <><LoaderCircle size={15} className="spin" aria-hidden="true" />Processing…</> : <>{tools[mode].action}<ArrowUpRight size={16} aria-hidden="true" /></>}</Button>
    </div>
  </section>;
}
