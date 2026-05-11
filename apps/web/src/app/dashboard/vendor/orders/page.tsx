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
  parent: { id: string; name: string; email: string };
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

export default function VendorOrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');

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

  const action = async (id: string, act: string) => {
    await fetch('/api/vendor/orders', {
      method: 'PATCH', headers,
      body: JSON.stringify({ id, action: act }),
    });
    load();
  };

  const vendorActions: Record<string, string> = {
    pending:   'confirm',
    confirmed: 'ship',
    shipped:   'deliver',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Orders</h1>
        <p className="text-sm text-surface-400 mt-0.5">Manage incoming orders from parents.</p>
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
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-24 bg-surface-100 dark:bg-gray-800" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{o.order_no}</p>
                  <p className="text-xs text-surface-400">{o.parent.name} · {new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                  <span className="text-sm font-bold">₹{o.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                {o.items.map(i => (
                  <div key={i.id} className="flex justify-between text-sm text-surface-400">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>₹{i.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {vendorActions[o.status] && (
                <button
                  onClick={() => action(o.id, vendorActions[o.status])}
                  className="btn btn-primary btn-sm capitalize"
                >
                  {vendorActions[o.status]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
