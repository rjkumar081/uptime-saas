import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-3xl mx-auto p-8 bg-white shadow rounded">
        <h1 className="text-3xl font-bold mb-2">PingSathi — Uptime Monitoring</h1>
        <p className="text-gray-600 mb-6">1-minute checks, WhatsApp & Email alerts, public status pages — India-friendly pricing.</p>
        <div className="flex gap-3">
          <Link href="/dashboard"><a className="px-4 py-2 bg-blue-600 text-white rounded">Go to Dashboard</a></Link>
          <Link href="/monitors/add"><a className="px-4 py-2 border rounded">Add Monitor</a></Link>
        </div>
      </div>
    </div>
  );
}
