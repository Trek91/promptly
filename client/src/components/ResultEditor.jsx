function Field({ label, value, onChange, multiline = true }) {
  return <label className="result-field"><span>{label}</span>{multiline
    ? <textarea value={value} rows={3} maxLength={20000} onChange={(event) => onChange(event.target.value)} />
    : <input value={value || ''} maxLength={1000} onChange={(event) => onChange(event.target.value || null)} />}</label>;
}

export default function ResultEditor({ mode, result, onChange }) {
  const update = (key, value) => onChange({ ...result, [key]: value });
  if (mode === 'rewrite') return <Field label="Rewritten text" value={result.rewrittenText} onChange={(value) => update('rewrittenText', value)} />;
  if (mode === 'summarize') return <div className="result-edit-fields">
    <Field label="Overview" value={result.summary} onChange={(value) => update('summary', value)} />
    {result.keyPoints.map((point, i) => <Field key={i} label={`Key point ${i + 1}`} value={point} onChange={(value) => update('keyPoints', result.keyPoints.map((old, index) => index === i ? value : old))} />)}
    <Field label="Takeaway" value={result.takeaway} onChange={(value) => update('takeaway', value)} />
  </div>;
  function updateTask(index, key, value) { update('actionItems', result.actionItems.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  return <div className="result-edit-fields"><Field label="Task overview" value={result.overview} onChange={(value) => update('overview', value)} />
    {result.actionItems.map((item, i) => <fieldset className="task-edit-fields" key={i}><legend>Task {i + 1}</legend>
      <Field label={`Task ${i + 1} text`} value={item.task} onChange={(value) => updateTask(i, 'task', value)} />
      <div className="task-edit-pair"><Field label={`Task ${i + 1} owner`} value={item.assignee} multiline={false} onChange={(value) => updateTask(i, 'assignee', value)} /><Field label={`Task ${i + 1} deadline`} value={item.dueDate} multiline={false} onChange={(value) => updateTask(i, 'dueDate', value)} /></div>
      <label className="result-field"><span>Task {i + 1} priority</span><select aria-label={`Task ${i + 1} priority`} value={item.priority} onChange={(event) => updateTask(i, 'priority', event.target.value)}>{['unspecified', 'low', 'medium', 'high'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <p className="evidence-note">Source quote stays unchanged. It supports the extracted task, not any details you add.</p>
    </fieldset>)}
  </div>;
}
