import { ArrowRight, FlaskConical, RotateCcw, LoaderCircle, AlignLeft } from 'lucide-react';
import { Button } from './ui.jsx';
import { countWords, MAX_CHARACTERS, MAX_WORDS } from '../../../shared/schemas.js';
import { tools } from './ModeSelector.jsx';

export default function TextEditor({ text, mode, loading, onChange, onSample, onClear, onSubmit }) {
  const words = countWords(text);
  const overLimit = words > MAX_WORDS || text.length > MAX_CHARACTERS;
  return <section className="editor-pane" aria-labelledby="input-title">
    <div className="pane-header"><h2 id="input-title"><AlignLeft size={17} />Original text</h2><div className="editor-tools">
      <Button variant="ghost" onClick={onSample} title="Replace the editor with sample text"><FlaskConical size={15} /><span>Try a sample</span></Button>
      <span className="toolbar-divider" />
      <Button variant="ghost" aria-label="Clear text" title="Clear text" onClick={onClear} disabled={!text}><RotateCcw size={16} /></Button>
    </div></div>
    <div className="editor-body"><label htmlFor="source-text" className="sr-only">Original text</label>
      <textarea id="source-text" value={text} onChange={(e) => onChange(e.target.value)} placeholder={`Paste your text here.\n\n${tools[mode].hint}`} spellCheck="true" aria-describedby="input-count input-limit" aria-invalid={overLimit} onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onSubmit(); }
      }} />
      {!text && <div className="editor-invitation"><span>Something on your mind?</span><button type="button" onClick={onSample}>Start with a sample <ArrowRight size={13} /></button></div>}
    </div>
    <div className="editor-footer"><div className={`input-stats ${overLimit ? 'over-limit' : ''}`}><span id="input-count">{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span><span id="input-limit">{overLimit ? 'Text limit exceeded' : `of ${MAX_WORDS.toLocaleString()} max`}<span className="sr-only">; {text.length} of {MAX_CHARACTERS} characters</span></span></div>
      <Button onClick={onSubmit} disabled={loading || !text.trim() || overLimit}>{loading ? <><LoaderCircle size={17} className="spin" />Working…</> : <>{tools[mode].action}<ArrowRight size={17} /></>}</Button>
    </div>
  </section>;
}
