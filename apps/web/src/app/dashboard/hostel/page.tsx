'use client';

import { useState, useEffect, useCallback } from 'react';

interface Block {
  id: string; name: string; gender: string; capacity: number; isActive: boolean;
  _count: { rooms: number };
}
interface Room {
  id: string; roomNo: string; roomType: string; capacity: number; floor: number | null; isActive: boolean;
  block: { name: string; gender: string };
  _count: { allocations: number };
}
interface Allocation {
  id: string; bedNo: string | null; academicYear: string; joinDate: string; mealPlan: string | null; status: string;
  student: { id: string; firstName: string; lastName: string; admissionNo: string };
  room: { roomNo: string; block: { name: string } };
}

function hdrs() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

const TABS = ['Blocks', 'Rooms', 'Allocations'] as const;
type Tab = typeof TABS[number];

export default function HostelPage() {
  const [tab, setTab] = useState<Tab>('Blocks');
  const [blocks, setBlocks]           = useState<Block[]>([]);
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showForm, setShowForm]       = useState(false);

  // Block form
  const [bName, setBName]     = useState('');
  const [bGender, setBGender] = useState('boys');
  const [bCap, setBCap]       = useState('');

  // Room form
  const [rBlock, setRBlock]   = useState('');
  const [rNo, setRNo]         = useState('');
  const [rType, setRType]     = useState('shared');
  const [rCap, setRCap]       = useState('4');
  const [rFloor, setRFloor]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'Blocks') {
        const r = await fetch('/api/hostel/blocks', { headers: hdrs() });
        const d = await r.json(); setBlocks(d.blocks ?? []);
      } else if (tab === 'Rooms') {
        const r = await fetch('/api/hostel/rooms', { headers: hdrs() });
        const d = await r.json(); setRooms(d.rooms ?? []);
      } else {
        const r = await fetch('/api/hostel/allocations', { headers: hdrs() });
        const d = await r.json(); setAllocations(d.allocations ?? []);
      }
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function addBlock() {
    if (!bName) return;
    const r = await fetch('/api/hostel/blocks', {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ name: bName, gender: bGender, capacity: Number(bCap) || 0 }),
    });
    if (r.ok) { setBName(''); setBGender('boys'); setBCap(''); setShowForm(false); load(); }
    else { const d = await r.json(); setError(d.error ?? 'Failed to add block'); }
  }

  async function addRoom() {
    if (!rBlock || !rNo) return;
    const r = await fetch('/api/hostel/rooms', {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ blockId: rBlock, roomNo: rNo, roomType: rType, capacity: Number(rCap), floor: rFloor ? Number(rFloor) : null }),
    });
    if (r.ok) { setRNo(''); setRFloor(''); setShowForm(false); load(); }
    else { const d = await r.json(); setError(d.error ?? 'Failed to add room'); }
  }

  const badge = (v: string) => {
    const m: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700', vacated: 'bg-gray-100 text-gray-600',
      transferred: 'bg-blue-100 text-blue-700', boys: 'bg-blue-100 text-blue-700',
      girls: 'bg-pink-100 text-pink-700', mixed: 'bg-purple-100 text-purple-700',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${m[v] ?? 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hostel Management</h1>
        <button onClick={() => { setShowForm(s => !s); setError(''); }}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          {showForm ? 'Cancel' : `+ Add ${tab === 'Blocks' ? 'Block' : tab === 'Rooms' ? 'Room' : 'Allocation'}`}
        </button>
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

      {/* Add Block form */}
      {showForm && tab === 'Blocks' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={bName} onChange={e => setBName(e.target.value)} placeholder="Block name *"
            className="input col-span-1 sm:col-span-2" />
          <select value={bGender} onChange={e => setBGender(e.target.value)} className="input">
            <option value="boys">Boys</option><option value="girls">Girls</option><option value="mixed">Mixed</option>
          </select>
          <input value={bCap} onChange={e => setBCap(e.target.value)} type="number" placeholder="Capacity"
            className="input" />
          <button onClick={addBlock} className="sm:col-span-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Save Block
          </button>
        </div>
      )}

      {/* Add Room form */}
      {showForm && tab === 'Rooms' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={rBlock} onChange={e => setRBlock(e.target.value)} className="input">
            <option value="">Select Block *</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input value={rNo} onChange={e => setRNo(e.target.value)} placeholder="Room No *" className="input" />
          <select value={rType} onChange={e => setRType(e.target.value)} className="input">
            <option value="single">Single</option><option value="double">Double</option><option value="shared">Shared</option>
          </select>
          <input value={rCap} onChange={e => setRCap(e.target.value)} type="number" placeholder="Capacity" className="input" />
          <input value={rFloor} onChange={e => setRFloor(e.target.value)} type="number" placeholder="Floor" className="input" />
          <button onClick={addRoom} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Save Room
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Blocks Table */}
          {tab === 'Blocks' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Block', 'Gender', 'Capacity', 'Rooms', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {blocks.map(b => (
                    <tr key={b.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.name}</td>
                      <td className="px-4 py-3"><span className={badge(b.gender)}>{b.gender}</span></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.capacity}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b._count.rooms}</td>
                      <td className="px-4 py-3"><span className={badge(b.isActive ? 'active' : 'vacated')}>{b.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                  {blocks.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No blocks added yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Rooms Table */}
          {tab === 'Rooms' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Room No', 'Block', 'Type', 'Floor', 'Capacity', 'Occupied'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rooms.map(r => (
                    <tr key={r.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.roomNo}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.block.name}</td>
                      <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{r.roomType}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.capacity}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${r._count.allocations >= r.capacity ? 'text-red-600' : 'text-emerald-600'}`}>
                          {r._count.allocations}/{r.capacity}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rooms.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No rooms added yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Allocations Table */}
          {tab === 'Allocations' && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>{['Student', 'Room', 'Block', 'Bed', 'Meal Plan', 'Join Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allocations.map(a => (
                    <tr key={a.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{a.student.firstName} {a.student.lastName}</div>
                        <div className="text-xs text-gray-400">{a.student.admissionNo}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.room.roomNo}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.room.block.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.bedNo ?? '—'}</td>
                      <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{a.mealPlan ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(a.joinDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><span className={badge(a.status)}>{a.status}</span></td>
                    </tr>
                  ))}
                  {allocations.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No allocations yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
