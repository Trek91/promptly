export function Button({ className = '', variant = 'default', children, ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Choice({ label, value, options, onChange }) {
  return <fieldset className="choice"><legend className="sr-only">{label}</legend>{options.map((option) =>
    <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>
  )}</fieldset>;
}
