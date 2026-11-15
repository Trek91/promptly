import { useEffect, useReducer, useRef, useState } from 'react';
import { LockKeyhole, ChevronDown } from 'lucide-react';
import Header from './components/Header.jsx';
import ModeSelector from './components/ModeSelector.jsx';
import TextEditor from './components/TextEditor.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import HistoryDrawer from './components/HistoryDrawer.jsx';
import { Choice } from './components/ui.jsx';
import { processText } from './lib/api.js';
import { requestSchema, tones } from '../../shared/schemas.js';
import { samples } from '../../shared/samples.js';
import { initialWorkspace, workspaceReducer, visibleData } from './lib/workspace.js';
import { readHistory, writeHistory, upsertHistory } from './lib/history.js';

function loadHistory() {
  try { return readHistory(localStorage); }
  catch { return { entries: [], notice: 'Browser storage is unavailable. Results will last for this session only.' }; }
}

export default function App() {
  const [mode, setMode] = useState('summarize');
  const [text, setText] = useState('');
  const [length, setLength] = useState('concise');
  const [tone, setTone] = useState('professional');
  const [workspace, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const data = visibleData(workspace);
  const loading = workspace.status === 'loading';
  const error = workspace.error;
  const [initialHistory] = useState(loadHistory);
  const [history, setHistory] = useState(initialHistory.entries);
  const [historyNotice, setHistoryNotice] = useState(initialHistory.notice);
  const lastSaved = useRef(history);
  const historyDrawer = useRef(null);
  const [mobilePane, setMobilePane] = useState('original');
  const [sourceQuote, setSourceQuote] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const active = useRef(null);
  const version = useRef(0);

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (workspace.status !== 'success' || !workspace.entryId) return;
    const entry = { id: workspace.entryId, createdAt: workspace.createdAt, input: workspace.savedInput, sourceText: workspace.sourceText, data: workspace.data, editedResult: workspace.editedResult, completed: workspace.completed };
    setHistory((old) => upsertHistory(old, entry));
  }, [workspace]);
  useEffect(() => {
    if (lastSaved.current === history) return;
    lastSaved.current = history;
    try { setHistoryNotice(writeHistory(localStorage, history)); }
    catch { setHistoryNotice('Browser storage is unavailable. Results will last for this session only.'); }
  }, [history]);
  function resetResult() {
    version.current += 1;
    active.current?.abort(); active.current = null;
    dispatch({ type: 'reset', request: version.current });
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
  function reopen(entry) {
    resetResult();
    setMode(entry.input.mode); setText(entry.sourceText);
    setLength(entry.input.preferences.length || 'concise'); setTone(entry.input.preferences.tone || 'professional');
    dispatch({ type: 'restore', request: version.current, entry });
    setMobilePane('result');
  }
  function deleteHistory(id) {
    if (workspace.entryId === id) dispatch({ type: 'detachHistory' });
    setHistory((old) => old.filter((entry) => entry.id !== id));
  }
  function clearHistory() {
    dispatch({ type: 'detachHistory' }); setHistory([]);
  }
  async function run() {
    if (active.current) return;
    const input = requestSchema.safeParse({ mode, text, preferences: mode === 'summarize' ? { length } : mode === 'rewrite' ? { tone } : {} });
    if (!input.success) { dispatch({ type: 'reset', request: ++version.current }); dispatch({ type: 'failure', request: version.current, error: new Error(input.error.issues[0].message) }); setMobilePane('result'); return; }
    const controller = new AbortController();
    active.current = controller;
    const current = ++version.current;
    dispatch({ type: 'request', request: current });
    setSourceQuote(null); setMobilePane('result');
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    try {
      const result = await processText(input.data, controller.signal);
      if (version.current === current) dispatch({ type: 'success', request: current, data: result, input: input.data, sourceText: text, entryId: crypto.randomUUID(), createdAt: new Date().toISOString() });
    } catch (e) {
      if (version.current === current && (!controller.signal.aborted || controller.signal.reason === 'timeout')) {
        dispatch({ type: 'failure', request: current, error: controller.signal.reason === 'timeout' ? new Error('The request took too long. Please try again.') : e });
      }
    } finally {
      clearTimeout(timeout);
      if (version.current === current) active.current = null;
    }
  }
  return <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
    <a className="skip-link" href="#source-text" onClick={(event) => { event.preventDefault(); setMobilePane('original'); setSourceQuote(null); requestAnimationFrame(() => document.getElementById('source-text')?.focus()); }}>Skip to editor</a>
    <Header focusMode={focusMode} onToggleFocus={() => setFocusMode((value) => !value)} onOpenHistory={() => historyDrawer.current.open()} />
    <HistoryDrawer ref={historyDrawer} entries={history} notice={historyNotice} onOpen={reopen} onDelete={deleteHistory} onClear={clearHistory} />
    <main id="main-content" className="workspace-sheet">
      {!focusMode && <div className="workspace-heading">
        <div><h1>The writing room.</h1><p>Your source, with a clearer next step.</p></div>
        <span className={`workspace-state ${error ? 'state-error' : data ? 'state-complete' : ''}`} role="status"><span />{loading ? 'Processing' : error ? 'Needs attention' : data ? 'Result ready' : text ? 'Draft' : 'Ready'}</span>
      </div>}
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
      <div className="panes"><TextEditor text={text} mode={mode} loading={loading} active={mobilePane === 'original'} sourceQuote={sourceQuote} onExitSource={() => setSourceQuote(null)} onChange={updateText} onSample={() => updateText(samples[mode])} onClear={() => updateText('')} onSubmit={run} /><ResultPanel key={workspace.entryId || workspace.request} data={data} loading={loading} error={error} mode={mode} active={mobilePane === 'result'} sourceText={text} onLocateSource={locateSource} onRetry={run} onCancel={resetResult} completed={workspace.completed} edited={!!workspace.editedResult} onEdit={(result) => dispatch({ type: 'edit', result })} onResetEdits={() => dispatch({ type: 'resetEdits' })} onToggleTask={(index, checked) => dispatch({ type: 'toggleTask', index, checked })} /></div>
      <footer className="workspace-footer"><span><LockKeyhole size={12} aria-hidden="true" />{historyNotice ? 'History may not be saved' : 'Past tasks saved on this browser'}</span><span>Review AI results before sharing.</span></footer>
    </main>
  </div>;
}
