export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Minimal header */}
      <header className="h-16 flex items-center px-6 border-b border-surface-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-glow-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-brand-800 dark:text-brand-300">Yulaa</span>
          <span className="text-surface-300 dark:text-gray-600 mx-2">|</span>
          <span className="text-sm text-surface-500 dark:text-gray-400">Online Admission</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        {children}
      </main>
    </div>
  );
}
