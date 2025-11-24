import { useState } from "react";
export default function Login(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  async function submit(e){
    e.preventDefault();
    const res = await fetch(process.env.NEXT_PUBLIC_BACKEND + "/token", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });
    if(res.ok){
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      window.location.href = "/dashboard";
    } else alert("Login failed");
  }
  return (
    <div style={{padding:40}}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
        <button>Login</button>
      </form>
    </div>
  );
}
