import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LockKeyhole, SlidersHorizontal, Sparkles } from 'lucide-react';
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
  const active = useRef(null);
  const version = useRef(0);

  useEffect(() => () => active.current?.abort(), []);
  function resetResult() {
    version.current += 1;
    active.current?.abort(); active.current = null;
    setData(null); setError(null); setLoading(false);
  }
  function updateText(value) { resetResult(); setText(value); }
  function changeMode(value) { if (value !== mode) { resetResult(); setMode(value); } }
  async function run() {
    if (active.current) return;
    const input = requestSchema.safeParse({ mode, text, preferences: mode === 'summarize' ? { length } : mode === 'rewrite' ? { tone } : {} });
    if (!input.success) { setData(null); setError(new Error(input.error.issues[0].message)); return; }
    const controller = new AbortController();
    active.current = controller;
    const current = ++version.current;
    setLoading(true); setData(null); setError(null);
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
    <Header />
    <main id="main-content">
      <div className="intro"><div><div className="intro-note"><span /><span>A little space for better thinking</span></div><h1>Make every word count.</h1><p>Less noise. More meaning. Turn your text into something useful.</p></div><div className="intro-aside"><span className="aside-symbol" aria-hidden="true">✳</span><p>Your thoughts.<br />A little more together.</p></div></div>
      <ModeSelector mode={mode} onChange={changeMode} />
      <div className="workbench">
        <div className="workbench-toolbar"><div className="settings-label"><SlidersHorizontal size={15} /><span>{mode === 'summarize' ? 'Summary length' : mode === 'rewrite' ? 'Writing tone' : 'Task details'}</span></div>
          {mode === 'summarize' ? <Choice label="Summary length" value={length} options={['concise', 'detailed']} onChange={(value) => { resetResult(); setLength(value); }} />
            : mode === 'rewrite' ? <div className="tone-select"><label htmlFor="tone" className="sr-only">Writing tone</label><select id="tone" value={tone} onChange={(e) => { resetResult(); setTone(e.target.value); }}>{tones.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
              : <span className="action-setting">Owners & deadlines, when provided</span>}
          <span className="toolbar-tip"><Sparkles size={14} />A first draft, thoughtfully done</span>
        </div>
        <div className="panes"><TextEditor text={text} mode={mode} loading={loading} onChange={updateText} onSample={() => updateText(samples[mode])} onClear={() => updateText('')} onSubmit={run} /><ResultPanel data={data} loading={loading} error={error} mode={mode} onRetry={run} onCancel={resetResult} /></div>
      </div>
      <div className="below-workbench"><span><LockKeyhole size={13} />No saved history. Just this session.</span><span className="keyboard-tip"><kbd>Ctrl</kbd><span>+</span><kbd>↵</kbd><span>to run your tool</span></span></div>
      <section className="small-note" aria-label="Getting started"><div className="note-icon"><ArrowUpRight size={17} /></div><div><strong>A good place to start? Something you’ve already written.</strong><p>An email that needs a polish. Notes that need a next step. An article you’d like to get through.</p></div></section>
    </main>
    <footer className="site-footer"><span>Small tools. Clearer thinking.</span><span>Made for the work between the words.<span className="footer-dot">✦</span></span></footer>
  </div>;
}
