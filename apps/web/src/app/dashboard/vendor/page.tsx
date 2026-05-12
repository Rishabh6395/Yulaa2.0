'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  mrp: number | null;
  quantity: number;
  image_urls: string[];
  tags: string[];
  vendor_id: string;
  vendor_name: string;
  vendor_rating: number | null;
  distance_km: number | null;
};

const CATEGORIES = ['All', 'books', 'uniform', 'stationery', 'sports', 'lanyard', 'other'];

export default function VendorMarketplacePage() {
  const router = useRouter();
  const [products,  setProducts]  = useState<Product[]>([]);
  const [cart,      setCart]      = useState<Record<string, number>>({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('');
  const [minPrice,  setMinPrice]  = useState('');
  const [maxPrice,  setMaxPrice]  = useState('');

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)   params.set('search', search);
    if (category && category !== 'All') params.set('category', category);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);

    fetch(`/api/vendor/products?${params}`, { headers })
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const addToCart  = (id: string) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) => setCart(c => {
    if ((c[id] ?? 0) <= 1) { const n = { ...c }; delete n[id]; return n; }
    return { ...c, [id]: c[id] - 1 };
  });

  const cartCount   = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal   = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(p => p.id === id);
    return sum + (p?.price ?? 0) * qty;
  }, 0);

  const placeOrder = async () => {
    const vendorGroups: Record<string, { product_id: string; quantity: number }[]> = {};
    for (const [id, qty] of Object.entries(cart)) {
      const p = products.find(p => p.id === id);
      if (!p) continue;
      if (!vendorGroups[p.vendor_id]) vendorGroups[p.vendor_id] = [];
      vendorGroups[p.vendor_id].push({ product_id: id, quantity: qty });
    }

    for (const [vendor_id, items] of Object.entries(vendorGroups)) {
      await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id, items }),
      });
    }

    setCart({});
    router.push('/dashboard/vendor/my-orders');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Marketplace</h1>
          <p className="text-sm text-surface-400 mt-0.5">Browse and order books, uniforms, stationery, and more.</p>
        </div>
        {cartCount > 0 && (
          <div className="card p-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-surface-400">{cartCount} items · ₹{cartTotal.toLocaleString()}</p>
            </div>
            <button onClick={placeOrder} className="btn btn-primary btn-sm">Place Order</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input flex-1 min-w-48"
        />
        <input type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input w-28" />
        <input type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="input w-28" />
        <button type="submit" className="btn btn-primary">Filter</button>
      </form>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat === 'All' ? '' : cat); load(); }}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors capitalize ${(cat === 'All' ? !category : category === cat) ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-gray-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-gray-700'}`}
          >
            {cat === 'All' ? 'All' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-52 bg-surface-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No products found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="card p-4 space-y-3 flex flex-col">
              <div className="aspect-square w-full bg-surface-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {p.image_urls[0] ? (
                  <img src={p.image_urls[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-xs text-surface-400 capitalize">{p.category} · {p.vendor_name}</p>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">{p.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-gray-900 dark:text-gray-100">₹{p.price.toLocaleString()}</span>
                  {p.mrp && p.mrp > p.price && (
                    <span className="text-xs text-surface-400 line-through">₹{p.mrp.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {p.quantity === 0 ? (
                <span className="text-xs text-red-500 font-medium">Out of stock</span>
              ) : cart[p.id] ? (
                <div className="flex items-center justify-between border border-brand-200 dark:border-brand-700 rounded-lg px-2 py-1">
                  <button onClick={() => removeFromCart(p.id)} className="text-brand-600 font-bold w-6 h-6 flex items-center justify-center">−</button>
                  <span className="text-sm font-semibold">{cart[p.id]}</span>
                  <button onClick={() => addToCart(p.id)} className="text-brand-600 font-bold w-6 h-6 flex items-center justify-center">+</button>
                </div>
              ) : (
                <button onClick={() => addToCart(p.id)} className="btn btn-primary btn-sm w-full text-xs">Add to Cart</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => router.push('/dashboard/vendor/my-orders')} className="btn btn-secondary btn-sm">
          View My Orders →
        </button>
      </div>
    </div>
  );
}
