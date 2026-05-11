'use client';

import { useEffect, useState } from 'react';

type Order = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_mode: string;
  created_at: string;
  vendor: { id: string; company_name: string };
  items: { id: string; product_name: string; quantity: number; unit_price: number; total: number }[];
  rating: { rating: number; review: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  shipped:   'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};

export default function MyOrdersPage() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [ratingForm, setRatingForm] = useState<Record<string, { rating: number; review: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    fetch(`/api/vendor/orders${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const cancel = async (id: string) => {
    await fetch('/api/vendor/orders', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, action: 'cancel' }),
    });
    load();
  };

  const submitRating = async (orderId: string) => {
    const form = ratingForm[orderId];
    if (!form?.rating) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setSubmitting(orderId);
    await fetch('/api/vendor/ratings', {
      method: 'POST', headers,
      body: JSON.stringify({
        order_id: orderId,
        vendor_id: order.vendor.id,
        rating: form.rating,
        review: form.review,
      }),
    });
    setRatingForm(prev => { const n = { ...prev }; delete n[orderId]; return n; });
    setSubmitting(null);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">My Orders</h1>
          <p className="text-sm text-surface-400 mt-0.5">Track your purchases from the school marketplace.</p>
        </div>
        <a href="/dashboard/vendor" className="btn btn-secondary btn-sm">← Back to Marketplace</a>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${filter === s ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-28 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No orders yet.</p>
          <a href="/dashboard/vendor" className="text-brand-600 dark:text-brand-400 text-sm mt-2 inline-block hover:underline">
            Browse marketplace →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">#{o.order_no}</p>
                  <p className="text-xs text-surface-400">{o.vendor.company_name} · {new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                  <span className="text-sm font-bold">₹{o.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1 border-t border-surface-100 dark:border-gray-700 pt-2">
                {o.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-surface-500 dark:text-gray-400">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>₹{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {(o.status === 'pending' || o.status === 'confirmed') && (
                <button onClick={() => cancel(o.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Cancel Order
                </button>
              )}

              {o.status === 'delivered' && !o.rating && (
                <div className="border-t border-surface-100 dark:border-gray-700 pt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate this order</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatingForm(prev => ({ ...prev, [o.id]: { ...prev[o.id], rating: star, review: prev[o.id]?.review ?? '' } }))}
                        className={`text-2xl transition-colors ${(ratingForm[o.id]?.rating ?? 0) >= star ? 'text-amber-400' : 'text-surface-300 hover:text-amber-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <input
                    className="input text-sm"
                    placeholder="Write a review (optional)…"
                    value={ratingForm[o.id]?.review ?? ''}
                    onChange={e => setRatingForm(prev => ({ ...prev, [o.id]: { ...prev[o.id], review: e.target.value, rating: prev[o.id]?.rating ?? 0 } }))}
                  />
                  <button
                    disabled={!ratingForm[o.id]?.rating || submitting === o.id}
                    onClick={() => submitRating(o.id)}
                    className="btn btn-primary btn-sm"
                  >
                    {submitting === o.id ? 'Submitting…' : 'Submit Rating'}
                  </button>
                </div>
              )}

              {o.rating && (
                <div className="flex items-center gap-2 text-sm text-surface-400 border-t border-surface-100 dark:border-gray-700 pt-2">
                  <span>Your rating:</span>
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                    {'★'.repeat(o.rating.rating)}{'☆'.repeat(5 - o.rating.rating)}
                  </span>
                  {o.rating.review && <span className="italic">"{o.rating.review}"</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
