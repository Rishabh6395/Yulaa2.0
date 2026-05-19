'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function FeesPayPage() {
  const searchParams = useSearchParams();
  const invoiceId    = searchParams.get('invoice');

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(!!invoiceId);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
    fetch(`/api/fees?invoice_id=${invoiceId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setInvoice(d.invoice ?? null))
      .catch(() => setError('Could not load invoice details.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/fees" className="text-surface-400 hover:text-surface-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pay Fee</h1>
      </div>

      {loading && (
        <div className="card p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-surface-200 dark:bg-gray-700 rounded w-1/2"/>
          <div className="h-4 bg-surface-200 dark:bg-gray-700 rounded w-1/3"/>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!loading && invoice && (
        <div className="card p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500 dark:text-gray-400">Invoice #</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{invoice.invoice_number ?? invoiceId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500 dark:text-gray-400">Amount Due</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              ₹{Number(invoice.amount ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
          {invoice.due_date && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-500 dark:text-gray-400">Due Date</span>
              <span className="text-gray-900 dark:text-gray-100">
                {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="card p-6 space-y-4 text-center">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Online Payment Coming Soon</p>
          <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">
            Online payment gateway is not yet available. Please pay at the school office or contact the admin.
          </p>
        </div>
        <Link href="/dashboard/fees" className="btn btn-secondary btn-sm inline-block">
          Back to Fees
        </Link>
      </div>
    </div>
  );
}
