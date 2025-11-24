import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import API from '../../lib/api';
import dayjs from 'dayjs';

export default function MonitorDetail(){
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
      alert('Failed to load monitor');
    }
  }

  useEffect(()=>{ load(); }, [id]);

  if(!monitor) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{monitor.name || monitor.url}</h2>
            <div className="text-sm text-gray-500">{monitor.url}</div>
            <div className="text-xs text-gray-400 mt-1">Last status: <span className={monitor.last_status==='UP'?'text-green-600':'text-red-600'}>{monitor.last_status || '—'}</span></div>
          </div>
          <a href={`/status/${monitor.id}`} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded">Public Status</a>
        </div>

        <section className="bg-white p-4 rounded shadow mb-4">
          <h3 className="font-medium mb-2">Incidents</h3>
          {incidents.length===0 && <div className="text-sm text-gray-500">No recent incidents.</div>}
          <div className="space-y-2">
            {incidents.map(inc => (
              <div key={inc.id} className="p-3 bg-gray-50 rounded border">
                <div className="text-sm text-gray-700">Detected: {dayjs(inc.detected_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div className="text-sm text-gray-600">Status: {inc.status_code} • Response: {inc.response_time_ms || 'N/A'} ms</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
