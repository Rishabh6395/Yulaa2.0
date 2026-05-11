'use client';

import { useEffect, useState } from 'react';

type Rating = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  parent: { name: string };
  order: { order_no: string };
};

export default function VendorRatingsPage() {
  const [ratings,  setRatings]  = useState<Rating[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    setLoading(true);
    fetch('/api/vendor/ratings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list: Rating[] = d.ratings ?? [];
        setRatings(list);
        if (list.length > 0) {
          setAvgRating(list.reduce((sum, r) => sum + r.rating, 0) / list.length);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const StarDisplay = ({ rating, size = 16 }: { rating: number; size?: number }) => (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
          className={s <= rating ? 'text-amber-400' : 'text-surface-300 dark:text-gray-600'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </span>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Ratings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Customer feedback and reviews for your store.</p>
      </div>

      {!loading && avgRating && (
        <div className="card p-5 flex items-center gap-5">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{avgRating.toFixed(1)}</p>
            <StarDisplay rating={Math.round(avgRating)} size={18} />
          </div>
          <div className="h-12 w-px bg-surface-200 dark:bg-gray-700" />
          <div>
            <p className="text-sm text-surface-400">{ratings.length} review{ratings.length !== 1 ? 's' : ''}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">Overall customer satisfaction</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-24 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : ratings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No ratings yet. Ratings appear after customers receive their orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map(r => (
            <div key={r.id} className="card p-5 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.parent.name}</p>
                  <p className="text-xs text-surface-400">Order #{r.order.order_no}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <StarDisplay rating={r.rating} />
                  <p className="text-xs text-surface-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              {r.review && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{r.review}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
