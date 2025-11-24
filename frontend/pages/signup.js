import { useState } from "react";
export default function Signup(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  async function submit(e){
    e.preventDefault();
    const res = await fetch(process.env.NEXT_PUBLIC_BACKEND + "/signup", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });
    if(res.ok) alert("Signed up! Login now.");
    else alert("Error");
  }
  return (
    <div style={{padding:40}}>
      <h2>Signup</h2>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
        <button>Signup</button>
      </form>
    </div>
  );
}
