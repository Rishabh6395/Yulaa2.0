'use client';

import { useState } from 'react';

export default function ChildSwitcher({ children: childList, activeChild, onSwitch }) {
  const [open, setOpen] = useState(false);

  if (!childList || childList.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
          {activeChild?.first_name?.[0]}{activeChild?.last_name?.[0]}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-brand-800 leading-tight">
            {activeChild?.first_name} {activeChild?.last_name}
          </p>
          <p className="text-[10px] text-brand-500 leading-tight">
            {activeChild?.school_name}{activeChild?.grade ? ` · Grade ${activeChild.grade}` : ''}
          </p>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          className={`text-brand-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-surface-200 z-40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-100 bg-surface-50">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">My Children</p>
            </div>
            <div className="p-2 space-y-1">
              {childList.map((child) => {
                const isActive = activeChild?.id === child.id;
                return (
                  <button
                    key={child.id}
                    onClick={() => { onSwitch(child); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isActive ? 'bg-brand-200 text-brand-700' : 'bg-surface-100 text-surface-500'
                    }`}>
                      {child.first_name?.[0]}{child.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{child.first_name} {child.last_name}</p>
                      <p className="text-xs text-surface-400 truncate">{child.school_name}</p>
                      {child.grade && (
                        <p className="text-xs text-surface-400">Grade {child.grade}{child.section ? ` · Section ${child.section}` : ''}</p>
                      )}
                    </div>
                    {isActive && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-500 flex-shrink-0">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
