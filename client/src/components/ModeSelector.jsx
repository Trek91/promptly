import { AlignLeft, Feather, ListTodo, ArrowUpRight } from 'lucide-react';

export const tools = {
  summarize: { title: 'Summarize', description: 'Find the heart of the text', icon: AlignLeft, action: 'Summarize text', hint: 'Articles, long notes, research…', empty: 'The big picture, in fewer words.', help: 'Your summary, key points, and takeaway will appear here.' },
  rewrite: { title: 'Rewrite', description: 'Say it a little better', icon: Feather, action: 'Rewrite text', hint: 'Emails, rough drafts, messages…', empty: 'Same meaning. A fresh perspective.', help: 'Your rewritten text and a note on what changed will appear here.' },
  actions: { title: 'Extract tasks', description: 'Turn words into next steps', icon: ListTodo, action: 'Extract tasks', hint: 'Meeting notes, project discussions…', empty: 'Find your next good move.', help: 'Your tasks, owners, and deadlines will appear here.' },
};

export default function ModeSelector({ mode, onChange }) {
  return <div className="tool-selector" role="group" aria-label="Choose a tool">{Object.entries(tools).map(([key, tool]) => {
    const Icon = tool.icon;
    return <button type="button" className={`tool-option ${key === mode ? 'is-selected' : ''}`} key={key} aria-label={`${tool.title} tool`} aria-pressed={key === mode} onClick={() => onChange(key)}>
      <span className="tool-icon"><Icon size={21} strokeWidth={1.7} /></span>
      <span className="tool-copy"><strong>{tool.title}</strong><span>{tool.description}</span></span>
      <ArrowUpRight size={17} className="tool-arrow" />
    </button>;
  })}</div>;
}
