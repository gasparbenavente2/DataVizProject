'use client';

import type { AnalysisMode } from './WorldMap';

interface HeaderProps {
  mode: AnalysisMode;
  onModeChange: (m: AnalysisMode) => void;
  dark: boolean;
  onDarkToggle: () => void;
}

export default function Header({ mode, onModeChange, dark, onDarkToggle }: HeaderProps) {
  return (
    <header
      className="h-12 flex items-center px-5 shrink-0 gap-4 mode-transition z-20 relative"
      style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}
    >
      {/* Logo */}
      <span className="font-semibold text-sm tracking-tight flex items-center gap-2 shrink-0" style={{ color: 'var(--tooltip-text)' }}>
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" fill="currentColor" />
          <circle cx="19.5" cy="6.5" r="5.5" fill="currentColor" />
        </svg>
        Perspectiva
      </span>

      {/* Centre title + mode dropdown */}
      <div className="flex-1 flex justify-center items-center gap-1.5 text-sm" style={{ color: 'var(--tooltip-text)' }}>
        <span className="opacity-70">Spread of the news overtime &amp;</span>
        <div className="relative flex items-center">
          <select
            value={mode}
            onChange={e => onModeChange(e.target.value as AnalysisMode)}
            className="appearance-none font-semibold bg-transparent pr-4 cursor-pointer focus:outline-none text-[#C97432]"
          >
            <option value="sentiment">sentiment</option>
            <option value="amount">amount</option>
          </select>
          <svg className="pointer-events-none absolute right-0 text-[#C97432]" width="9" height="5" viewBox="0 0 9 5" fill="currentColor">
            <path d="M0 0l4.5 5L9 0z" />
          </svg>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={onDarkToggle}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ background: dark ? '#1e293b' : '#f1f5f9', color: dark ? '#94a3b8' : '#64748b' }}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? (
            // Sun icon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            // Moon icon
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <span className="text-sm opacity-60 cursor-pointer hover:opacity-100 transition-opacity" style={{ color: 'var(--tooltip-text)' }}>About</span>
        <span title="English" className="text-base">🇬🇧</span>
      </div>
    </header>
  );
}
