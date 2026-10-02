(function(){
  const cfg = window.DELISHKI_SUPABASE || {};
  const SESSION_KEY = "delishki-supabase-session-v1";
  const rawUrl = String(cfg.url || "").trim();
  const baseUrl = rawUrl.replace(/\/+$/, "").replace(/\/(rest|auth|storage)\/v1\/?$/, "");
  const configured = !!(baseUrl && cfg.anonKey);

  function getSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  }
  function setSession(session){
    if(session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }
  function headers(accessToken){
    return {"apikey":cfg.anonKey,"Authorization":"Bearer "+(accessToken||cfg.anonKey),"Content-Type":"application/json"};
  }
  async function request(path, options={}){
    const res = await fetch(baseUrl+path, options);
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if(!res.ok){ const msg = data?.msg || data?.message || data?.error_description || data?.error || `Ошибка ${res.status}`; throw new Error(msg); }
    return data;
  }
  async function refresh(){
    const s=getSession(); if(!configured||!s?.refresh_token) return null;
    const data=await request("/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:headers(),body:JSON.stringify({refresh_token:s.refresh_token})});
    const next={...s,...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)}; setSession(next); return next;
  }
  async function validSession(){
    let s=getSession(); if(!s) return null;
    if(s.expires_at && s.expires_at < Math.floor(Date.now()/1000)+60){ try{s=await refresh()}catch{setSession(null);return null;} }
    return s;
  }
  async function auth(path,body){
    if(!configured) throw new Error("Облако ещё не подключено. Добавь Supabase URL и anon key в cloud-config.js.");
    return request(path,{method:"POST",headers:headers(),body:JSON.stringify(body)});
  }
  async function signUp(email,password){
    const data=await auth("/auth/v1/signup",{email,password});
    if(data?.access_token) setSession({...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});
    return data;
  }
  async function signIn(email,password){
    const data=await auth("/auth/v1/token?grant_type=password",{email,password});
    setSession({...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)}); return data;
  }
  async function signOut(){
    const s=await validSession();
    if(s?.access_token){ try{await request("/auth/v1/logout",{method:"POST",headers:headers(s.access_token)});}catch{} }
    setSession(null);
  }
  async function currentUser(){
    const s=await validSession(); if(!s?.access_token) return null;
    try{return await request("/auth/v1/user",{headers:headers(s.access_token)})}catch{return null;}
  }
  async function loadData(){
    const s=await validSession(); if(!s?.access_token) return null;
    const rows=await request("/rest/v1/delishki_data?select=data&user_id=eq."+encodeURIComponent(s.user.id),{headers:headers(s.access_token)});
    return rows?.[0]?.data || null;
  }
  async function saveData(data){
    const s=await validSession(); if(!s?.access_token) throw new Error("Нет активной облачной сессии");
    await request("/rest/v1/delishki_data",{
      method:"POST",
      headers:{...headers(s.access_token),"Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_id:s.user.id,data,updated_at:new Date().toISOString()})
    });
  }
  window.Cloud={configured,getSession,signUp,signIn,signOut,currentUser,loadData,saveData,refresh};
})();
