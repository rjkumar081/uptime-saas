import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import API from '../../lib/api';

export default function StatusPage(){
  const router = useRouter();
  const { id } = router.query;
  const [monitor, setMonitor] = useState(null);
  const [incidents, setIncidents] = useState([]);

  async function load(){
    if(!id) return;
    try{
      const res = await API.get(`/monitors/${id}/status`);
      setMonitor(res.data.monitor);
      setIncidents(res.data.incidents || []);
    }catch(e){
      console.error(e);
    }
  }

  useEffect(()=>{ load(); }, [id]);

  if(!monitor) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{monitor.name || monitor.url} — Status</h1>
          <div className="mt-2 text-sm text-gray-500">Current status: <span className={monitor.last_status==='UP'?'text-green-600':'text-red-600'}>{monitor.last_status || '—'}</span></div>
        </div>

        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="text-sm text-gray-600">URL</div>
          <div className="font-semibold">{monitor.url}</div>
          <div className="text-sm text-gray-600 mt-2">Last checked: {monitor.last_checked || '—'}</div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Recent incidents</h3>
          {incidents.length===0 && <div className="text-sm text-gray-500">No incidents recently.</div>}
          <div className="space-y-2">
            {incidents.map(i => (
              <div key={i.id} className="p-3 border rounded">
                <div className="text-sm text-gray-700">Detected: {i.detected_at}</div>
                <div className="text-sm text-gray-600">Status: {i.status_code} • Response: {i.response_time_ms || 'N/A'} ms</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
