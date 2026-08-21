(() => {
  'use strict';
  const URL='https://ltdmawmtnmlfmfhiwwow.supabase.co';
  const KEY='sb_publishable_n_WZP0LdaRzFy_3v-xYuug_EnAsMxMM';
  const LOCAL='jobScamShieldScansV1';
  const getLocal=()=>{try{const x=JSON.parse(localStorage.getItem(LOCAL)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const setLocal=x=>localStorage.setItem(LOCAL,JSON.stringify(x.slice(0,100)));
  const risk=score=>Number(score)>=70?{level:'High risk',className:'high',color:'#d9504b'}:Number(score)>=35?{level:'Needs caution',className:'medium',color:'#c88611'}:{level:'Low risk',className:'low',color:'#13856a'};
  const preview=x=>String(x||'Job offer scan').replace(/\s+/g,' ').trim().slice(0,120)||'Job offer scan';
  const client=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!client)return;
  window.jobScamShieldCloudSync={client};
  function localToRow(x,userId){return{id:x.id,user_id:userId,title:preview(x.input),input_type:x.inputType||'text',input_preview:String(x.input||'').slice(0,500),score:Number(x.score)||0,risk_level:x.risk?.level||risk(x.score).level,flags:Array.isArray(x.flags)?x.flags:[],recommendations:Array.isArray(x.recommendations)?x.recommendations:[],created_at:new Date(x.timestamp||Date.now()).toISOString()}};
  function rowToLocal(x){const score=Number(x.score)||0;return{id:x.id,input:x.input_preview||x.title||'Job offer scan',inputType:x.input_type||'text',score,risk:x.risk_level?{level:x.risk_level,className:score>=70?'high':score>=35?'medium':'low',color:risk(score).color}:risk(score),flags:Array.isArray(x.flags)?x.flags:[],recommendations:Array.isArray(x.recommendations)?x.recommendations:[],positiveSignals:[],missing:[],breakdown:{},confidence:'Cloud history',region:'Global',industry:'General',summary:'Restored from your cloud scan history.',timestamp:new Date(x.created_at||Date.now()).getTime()};}
  async function sync(){
    const {data,error}=await client.auth.getSession();const user=data?.session?.user;if(error||!user)return;
    const local=getLocal();
    const remoteResult=await client.from('scan_history').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
    if(remoteResult.error){console.warn('Cloud scan sync read failed:',remoteResult.error.message);return;}
    const remote=remoteResult.data||[];const remoteIds=new Set(remote.map(x=>x.id));
    const localById=new Map(local.map(x=>[x.id,x]));
    remote.forEach(row=>{if(!localById.has(row.id))localById.set(row.id,rowToLocal(row));});
    const merged=[...localById.values()].sort((a,b)=>Number(b.timestamp||0)-Number(a.timestamp||0)).slice(0,100);setLocal(merged);
    const missing=merged.filter(x=>!remoteIds.has(x.id)).map(x=>localToRow(x,user.id));
    if(missing.length){const write=await client.from('scan_history').upsert(missing,{onConflict:'id'});if(write.error)console.warn('Cloud scan sync write failed:',write.error.message);}
    window.dispatchEvent(new CustomEvent('jobscamshield:cloud-synced',{detail:{count:merged.length}}));
  }
  let timer;
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,350)}
  client.auth.onAuthStateChange((_event,session)=>{if(session?.user)schedule();});
  document.addEventListener('click',event=>{if(event.target.closest?.('#save-result'))schedule();},true);
  window.addEventListener('jobscamshield:scan-saved',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
