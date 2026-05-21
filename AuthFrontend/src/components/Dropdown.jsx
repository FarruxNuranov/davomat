import { useState } from "react";
import "./Dropdown.css";

export default function Dropdown({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="dd">
      <button
        type="button"
        className={`dd-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current?.label ?? ""}</span>
        <svg
          className="dd-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="dd-backdrop" onClick={() => setOpen(false)} />
          <ul className="dd-menu" role="listbox">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={`dd-option${o.value === value ? " selected" : ""}`}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                  {o.value === value && <span className="dd-check">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
