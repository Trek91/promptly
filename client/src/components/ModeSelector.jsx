import { AlignLeft, PenLine, ListTodo } from 'lucide-react';

export const tools = {
  summarize: { title: 'Summarize', icon: AlignLeft, action: 'Summarize text', resultTitle: 'Summary', hint: 'An article, a research note, or a long document.', empty: 'No summary yet', help: 'Add your source text and run Summarize to get an overview, key points, and a takeaway.', loading: 'Creating your summary…' },
  rewrite: { title: 'Rewrite', icon: PenLine, action: 'Rewrite text', resultTitle: 'Rewritten text', hint: 'An email, a message, or a draft you want to refine.', empty: 'No rewrite yet', help: 'Choose a tone and run Rewrite. The original meaning stays the starting point.', loading: 'Rewriting your text…' },
  actions: { title: 'Extract tasks', icon: ListTodo, action: 'Extract tasks', resultTitle: 'Action items', hint: 'Meeting notes or a discussion with next steps.', empty: 'No tasks yet', help: 'Run Extract tasks to find next steps, with owners, deadlines, and source quotes.', loading: 'Finding action items…' },
};

export default function ModeSelector({ mode, onChange }) {
  return <div className="tool-selector" role="group" aria-label="Choose a tool">{Object.entries(tools).map(([key, tool]) => {
    const Icon = tool.icon;
    return <button type="button" className={`tool-option ${key === mode ? 'is-selected' : ''}`} key={key} aria-label={`${tool.title} tool`} aria-pressed={key === mode} onClick={() => onChange(key)}>
      <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
      <span>{tool.title}</span>
    </button>;
  })}</div>;
}
