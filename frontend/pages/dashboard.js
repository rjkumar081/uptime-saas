import { useEffect, useState } from "react";
export default function Dashboard(){
  const [mons,setMons] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem("token");
    if(!token) { window.location.href="/login"; return; }
    fetch(process.env.NEXT_PUBLIC_BACKEND + "/monitors", {
      headers: {"Authorization": "Bearer "+token}
    }).then(r=>r.json()).then(setMons).catch(()=>{});
  },[]);
  return (
    <div style={{padding:40}}>
      <h2>Dashboard</h2>
      <ul>
        {mons.map(m=> <li key={m.id}>{m.name || m.url} - {m.last_status}</li>)}
      </ul>
    </div>
  );
}
