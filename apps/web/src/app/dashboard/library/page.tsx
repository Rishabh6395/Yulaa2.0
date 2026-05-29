'use client';

import { useState, useEffect, useCallback } from 'react';

interface Book {
  id: string; title: string; author: string | null; isbn: string | null;
  totalCopies: number; availableCopies: number; genre: string | null; subject: string | null; isActive: boolean;
}
interface Issue {
  id: string; issueDate: string; dueDate: string; returnDate: string | null;
  fine: string | null; status: string;
  book: { id: string; title: string; isbn: string | null };
  student: { id: string; firstName: string; lastName: string; admissionNo: string } | null;
  teacher: { id: string; user: { firstName: string; lastName: string } } | null;
}

function hdrs() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

const TABS = ['Books', 'Issues'] as const;
type Tab = typeof TABS[number];

export default function LibraryPage() {
  const [tab, setTab]         = useState<Tab>('Books');
  const [books, setBooks]     = useState<Book[]>([]);
  const [issues, setIssues]   = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]   = useState('');

  // Book form
  const [bTitle, setBTitle]     = useState('');
  const [bAuthor, setBAuthor]   = useState('');
  const [bIsbn, setBIsbn]       = useState('');
  const [bCopies, setBCopies]   = useState('1');
  const [bGenre, setBGenre]     = useState('');
  const [bSubject, setBSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'Books') {
        const r = await fetch('/api/library/books', { headers: hdrs() });
        const d = await r.json(); setBooks(d.books ?? []);
      } else {
        const r = await fetch('/api/library/issues', { headers: hdrs() });
        const d = await r.json(); setIssues(d.issues ?? []);
      }
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function addBook() {
    if (!bTitle) return;
    const r = await fetch('/api/library/books', {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ title: bTitle, author: bAuthor || null, isbn: bIsbn || null, totalCopies: Number(bCopies), genre: bGenre || null, subject: bSubject || null }),
    });
    if (r.ok) { setBTitle(''); setBAuthor(''); setBIsbn(''); setBCopies('1'); setBGenre(''); setBSubject(''); setShowForm(false); load(); }
    else { const d = await r.json(); setError(d.error ?? 'Failed to add book'); }
  }

  async function returnBook(issueId: string) {
    const r = await fetch(`/api/library/issues?id=${issueId}`, {
      method: 'PATCH',
      headers: hdrs(),
      body: JSON.stringify({ status: 'returned', returnDate: new Date().toISOString().split('T')[0] }),
    });
    if (r.ok) load();
    else { const d = await r.json(); setError(d.error ?? 'Failed to return book'); }
  }

  const badge = (status: string) => {
    const m: Record<string, string> = {
      issued:   'bg-blue-100 text-blue-700',
      returned: 'bg-emerald-100 text-emerald-700',
      overdue:  'bg-red-100 text-red-700',
      lost:     'bg-gray-100 text-gray-600',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${m[status] ?? 'bg-gray-100 text-gray-600'}`;
  };

  const filteredBooks = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.isbn ?? '').includes(search),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library</h1>
        <div className="flex gap-2">
          {tab === 'Books' && (
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books…"
              className="input w-48" />
          )}
          {tab === 'Books' && (
            <button onClick={() => { setShowForm(s => !s); setError(''); }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              {showForm ? 'Cancel' : '+ Add Book'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      {/* Add Book form */}
      {showForm && tab === 'Books' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Title *" className="input sm:col-span-2" />
          <input value={bAuthor} onChange={e => setBAuthor(e.target.value)} placeholder="Author" className="input" />
          <input value={bIsbn} onChange={e => setBIsbn(e.target.value)} placeholder="ISBN" className="input" />
          <input value={bGenre} onChange={e => setBGenre(e.target.value)} placeholder="Genre" className="input" />
          <input value={bSubject} onChange={e => setBSubject(e.target.value)} placeholder="Subject" className="input" />
          <input value={bCopies} onChange={e => setBCopies(e.target.value)} type="number" min="1" placeholder="Copies" className="input" />
          <button onClick={addBook} className="sm:col-span-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Save Book
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Books Table */}
          {tab === 'Books' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Title', 'Author', 'ISBN', 'Genre', 'Subject', 'Copies', 'Available'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredBooks.map(b => (
                    <tr key={b.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{b.title}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.author ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.isbn ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.genre ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.subject ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.totalCopies}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${b.availableCopies === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {b.availableCopies}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBooks.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No books found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Issues Table */}
          {tab === 'Issues' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Book', 'Borrower', 'Issue Date', 'Due Date', 'Return Date', 'Fine', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {issues.map(i => {
                    const borrower = i.student
                      ? `${i.student.firstName} ${i.student.lastName} (${i.student.admissionNo})`
                      : i.teacher
                      ? `${i.teacher.user.firstName} ${i.teacher.user.lastName}`
                      : '—';
                    return (
                      <tr key={i.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{i.book.title}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{borrower}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(i.issueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(i.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{i.returnDate ? new Date(i.returnDate).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{i.fine ? `₹${i.fine}` : '—'}</td>
                        <td className="px-4 py-3"><span className={badge(i.status)}>{i.status}</span></td>
                        <td className="px-4 py-3">
                          {i.status === 'issued' || i.status === 'overdue' ? (
                            <button onClick={() => returnBook(i.id)}
                              className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                              Return
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {issues.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No active issues</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
