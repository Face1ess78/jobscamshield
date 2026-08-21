(() => {
  'use strict';
  const URL='https://ltdmawmtnmlfmfhiwwow.supabase.co';
  const KEY='sb_publishable_n_WZP0LdaRzFy_3v-xYuug_EnAsMxMM';
  const getClient=()=>window.jobScamShieldSupabase||(window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function client(){return getClient()}
  async function load(){const c=await client();if(!c)return;const {data}=await c.auth.getSession();const u=data.session?.user;if(!u)return;await c.from('profiles').upsert({id:u.id,full_name:u.user_metadata?.full_name||u.user_metadata?.name||null},{onConflict:'id'});}
  async function saveProfile(fields){const c=await client();const {data}=await c.auth.getSession();if(!data.session?.user)return {error:{message:'Please sign in first'}};return c.from('profiles').upsert({id:data.session.user.id,...fields},{onConflict:'id'});}
  window.jobScamShieldCloud={client,getSession:async()=>{const c=await client();return c?.auth.getSession()},saveProfile,loadProfile:async()=>{const c=await client();const {data}=await c.auth.getSession();if(!data.session?.user)return null;const r=await c.from('profiles').select('*').eq('id',data.session.user.id).maybeSingle();return r.data},listScans:async()=>{const c=await client();const {data}=await c.auth.getSession();if(!data.session?.user)return [];const r=await c.from('scan_history').select('*').order('created_at',{ascending:false});return r.data||[]},saveScan:async scan=>{const c=await client();const {data}=await c.auth.getSession();if(!data.session?.user)return null;const r=await c.from('scan_history').insert({...scan,user_id:data.session.user.id}).select().single();return r.data||null},deleteScan:async id=>{const c=await client();return c.from('scan_history').delete().eq('id',id)},clearScans:async()=>{const c=await client();const {data}=await c.auth.getSession();if(!data.session?.user)return;return c.from('scan_history').delete().eq('user_id',data.session.user.id)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
