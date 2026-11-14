import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, ChevronDown } from 'lucide-react';
import Header from './components/Header.jsx';
import ModeSelector from './components/ModeSelector.jsx';
import TextEditor from './components/TextEditor.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import { Choice } from './components/ui.jsx';
import { processText } from './lib/api.js';
import { requestSchema, tones } from '../../shared/schemas.js';
import { samples } from '../../shared/samples.js';

export default function App() {
  const [mode, setMode] = useState('summarize');
  const [text, setText] = useState('');
  const [length, setLength] = useState('concise');
  const [tone, setTone] = useState('professional');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobilePane, setMobilePane] = useState('original');
  const [sourceQuote, setSourceQuote] = useState(null);
  const active = useRef(null);
  const version = useRef(0);

  useEffect(() => () => active.current?.abort(), []);
  function resetResult() {
    version.current += 1;
    active.current?.abort(); active.current = null;
    setData(null); setError(null); setLoading(false);
    setSourceQuote(null); setMobilePane('original');
  }
  function updateText(value) { resetResult(); setText(value); }
  function changeMode(value) { if (value !== mode) { resetResult(); setMode(value); } }
  function locateSource(quote) {
    const start = text.indexOf(quote);
    if (!quote.trim() || start < 0) return;
    setSourceQuote({ start, end: start + quote.length });
    setMobilePane('original');
  }
  async function run() {
    if (active.current) return;
    const input = requestSchema.safeParse({ mode, text, preferences: mode === 'summarize' ? { length } : mode === 'rewrite' ? { tone } : {} });
    if (!input.success) { setData(null); setError(new Error(input.error.issues[0].message)); setMobilePane('result'); return; }
    const controller = new AbortController();
    active.current = controller;
    const current = ++version.current;
    setLoading(true); setData(null); setError(null);
    setSourceQuote(null); setMobilePane('result');
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    try {
      const result = await processText(input.data, controller.signal);
      if (version.current === current) setData(result);
    } catch (e) {
      if (version.current === current && (!controller.signal.aborted || controller.signal.reason === 'timeout')) {
        setError(controller.signal.reason === 'timeout' ? new Error('The request took too long. Please try again.') : e);
      }
    } finally {
      clearTimeout(timeout);
      if (version.current === current) { setLoading(false); active.current = null; }
    }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#source-text" onClick={(event) => { event.preventDefault(); setMobilePane('original'); setSourceQuote(null); requestAnimationFrame(() => document.getElementById('source-text')?.focus()); }}>Skip to editor</a>
    <Header />
    <main id="main-content" className="workspace-sheet">
      <div className="workspace-heading">
        <div><h1>Text workspace</h1><p>Summarize, rewrite, or extract next steps from your text.</p></div>
        <span className={`workspace-state ${error ? 'state-error' : data ? 'state-complete' : ''}`} role="status"><span />{loading ? 'Processing' : error ? 'Needs attention' : data ? 'Result ready' : text ? 'Draft' : 'Ready'}</span>
      </div>
      <div className="workbench-toolbar">
        <ModeSelector mode={mode} onChange={changeMode} />
        <div className="tool-preferences"><span className="settings-label">{mode === 'summarize' ? 'Length' : mode === 'rewrite' ? 'Tone' : 'Extract'}</span>
          {mode === 'summarize' ? <Choice label="Summary length" value={length} options={['concise', 'detailed']} onChange={(value) => { resetResult(); setLength(value); }} />
            : mode === 'rewrite' ? <div className="tone-select"><label htmlFor="tone" className="sr-only">Writing tone</label><select id="tone" value={tone} onChange={(e) => { resetResult(); setTone(e.target.value); }}>{tones.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></div>
              : <span className="action-setting">Tasks, owners & deadlines</span>}
        </div>
      </div>
      <div className="mobile-views" role="group" aria-label="Editor panes">
        <button type="button" aria-label="Show original text" aria-pressed={mobilePane === 'original'} aria-controls="original-pane" onClick={() => setMobilePane('original')}>Original</button>
        <button type="button" aria-label="Show result" aria-pressed={mobilePane === 'result'} aria-controls="result-pane" onClick={() => setMobilePane('result')}>Result{data && <span className="result-available" aria-hidden="true" />}</button>
      </div>
      <div className="panes"><TextEditor text={text} mode={mode} loading={loading} active={mobilePane === 'original'} sourceQuote={sourceQuote} onExitSource={() => setSourceQuote(null)} onChange={updateText} onSample={() => updateText(samples[mode])} onClear={() => updateText('')} onSubmit={run} /><ResultPanel data={data} loading={loading} error={error} mode={mode} active={mobilePane === 'result'} sourceText={text} onLocateSource={locateSource} onRetry={run} onCancel={resetResult} /></div>
      <footer className="workspace-footer"><span><LockKeyhole size={12} aria-hidden="true" />Text is not saved</span><span>Review AI results before sharing.</span></footer>
    </main>
  </div>;
}
