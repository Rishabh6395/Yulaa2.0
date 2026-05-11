'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Consultant = {
  id: string;
  name: string;
  avatar_url: string | null;
  specialization: string | null;
  bio: string | null;
  experience_years: number | null;
  session_fee: number | null;
  is_external: boolean;
  available_modes: string[];
  avg_rating: number | null;
  rating_count: number;
  distance_km: number | null;
};

export default function CareerSessionsPage() {
  const router = useRouter();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [modeFilter,  setModeFilter]  = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)     params.set('specialization', search);
    if (modeFilter) params.set('mode', modeFilter);

    fetch(`/api/career-sessions?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setConsultants(d.consultants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const StarRating = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-xs text-surface-400">No ratings yet</span>;
    return (
      <span className="flex items-center gap-1 text-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        <span className="font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Career Sessions</h1>
        <p className="text-sm text-surface-400 mt-0.5">Book one-on-one sessions with career counsellors for your child.</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by specialization…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input flex-1 min-w-48"
        />
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="input w-40">
          <option value="">All Modes</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-48 bg-surface-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : consultants.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No career consultants available for your school right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {consultants.map(c => (
            <div key={c.id} className="card p-5 space-y-3 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-lg flex-shrink-0">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt={c.name} className="w-12 h-12 rounded-full object-cover" />
                    : c.name.charAt(0)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</h3>
                  <p className="text-xs text-surface-400">{c.specialization ?? 'Career Counsellor'}</p>
                  <StarRating rating={c.avg_rating} />
                </div>
                {c.is_external && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">External</span>
                )}
              </div>

              {c.bio && <p className="text-sm text-surface-400 line-clamp-2">{c.bio}</p>}

              <div className="flex flex-wrap gap-1.5">
                {c.available_modes.map(m => (
                  <span key={m} className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize">{m}</span>
                ))}
                {c.experience_years && (
                  <span className="text-xs bg-surface-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{c.experience_years}y exp</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-surface-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {c.session_fee ? `₹${c.session_fee.toLocaleString()}` : 'Free'}
                </span>
                <button
                  onClick={() => router.push(`/dashboard/career-sessions/book?consultant=${c.id}`)}
                  className="btn btn-primary btn-sm text-xs"
                >
                  Book Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Bookings link */}
      <div className="flex justify-end">
        <button onClick={() => router.push('/dashboard/career-sessions/my-bookings')} className="btn btn-secondary btn-sm">
          View My Bookings →
        </button>
      </div>
    </div>
  );
}
