import { useState } from 'react';
import API from '../../lib/api';
import { useRouter } from 'next/router';

export default function AddMonitor(){
  const [url,setUrl]=useState('');
  const [name,setName]=useState('');
  const [interval,setInterval]=useState(60);
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    try{
      const body = {
        user_id: 1,
        name: name || url,
        url,
        check_interval: Number(interval),
        owner_phone: phone,
        owner_email: email
      };
      const res = await API.post('/monitors', body);
      alert('Monitor created');
      router.push('/dashboard');
    }catch(err){
      console.error(err);
      alert('Failed to create monitor');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Add Monitor</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm">URL</label>
            <input value={url} onChange={e=>setUrl(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="https://example.com" required />
          </div>
          <div>
            <label className="block text-sm">Name (optional)</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="My site" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Interval (seconds)</label>
              <select value={interval} onChange={e=>setInterval(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value={60}>60</option>
                <option value={300}>300</option>
                <option value={900}>900</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Owner Phone (WhatsApp)</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="+919999999999" />
            </div>
          </div>
          <div>
            <label className="block text-sm">Owner Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="owner@example.com" />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            <button type="button" onClick={()=>router.push('/dashboard')} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
