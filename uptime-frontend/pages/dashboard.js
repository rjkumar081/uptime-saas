import { useEffect, useState } from 'react';
import API from '../lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchMonitors(){
    setLoading(true);
    try{
      const res = await API.get(`/monitors?user_id=1`);
      setMonitors(res.data.monitors || []);
    }catch(e){
      console.error(e);
      alert('Failed to load monitors. Is backend running?');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchMonitors(); }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <div className="flex gap-3">
            <Link href="/monitors/add"><a className="px-3 py-2 bg-green-600 text-white rounded">Add Monitor</a></Link>
            <Link href="/"><a className="px-3 py-2 border rounded">Home</a></Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total Monitors</div>
            <div className="text-2xl font-bold">{monitors.length}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-bold">{monitors.filter(m=>m.is_active).length}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Last checked</div>
            <div className="text-2xl font-bold">{monitors.length ? 'Recently' : '-'}</div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-medium">Monitors</h3>
            <button onClick={fetchMonitors} className="text-sm px-3 py-1 border rounded">Refresh</button>
          </div>
          <div className="space-y-3">
            {loading && <div>Loading...</div>}
            {!loading && monitors.length===0 && <div className="p-4 bg-white rounded shadow">No monitors yet — <Link href="/monitors/add"><a className="text-blue-600">add one</a></Link></div>}
            {!loading && monitors.map(m => (
              <div key={m.id} className="bg-white p-4 rounded shadow flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.name || m.url}</div>
                  <div className="text-sm text-gray-500">{m.url}</div>
                  <div className="text-xs text-gray-400 mt-1">Interval: {m.check_interval}s • Status: <span className={m.last_status === 'UP' ? 'text-green-600' : 'text-red-600'}>{m.last_status || '—'}</span></div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/monitors/${m.id}`}><a className="px-3 py-1 border rounded">View</a></Link>
                  <a href={`/status/${m.id}`} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded">Status Page</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
