/* ══════════════════════════════════════════════════════════════
   📊 nd-work.js — หน้า "สรุปการทำงาน" (แอดมิน)
   ใครเคยรับงานทีมเรากี่งาน เรียงน้อย → มาก · ใครยังไม่เคยได้งานเลย · เข้าระบบตั้งแต่เมื่อไร
   นับจาก p.workers[].id (1 โปรเจกต์ = 1 งาน ต่อคน ไม่ว่าจะรับกี่ช่อง)
   เข้าระบบ = วันที่สมัครบัญชีเว็บ (users/<uid>.createdAt · ผูกด้วยรหัสทีมงาน/อีเมล)
   เพิ่มในทีม = s.joinedAt/createdAt → เวลาที่ฝังในรหัสทีมงาน (S<เวลา> / GF<เวลา>_n)
   ══════════════════════════════════════════════════════════════ */
(function(){
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const isAdm=()=>safe(()=>currentUser.role==='admin',false);
const catLabel=c=>safe(()=>CATS[c].label,c);
const fullName=s=>((s.name||'')+(s.lastName?' '+s.lastName:'')).trim();
const dTH=iso=>{ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?'':d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); };
function joinedOf(s){ const v=s.joinedAt||s.createdAt||s.addedAt; if(v && !isNaN(new Date(v))) return new Date(v).toISOString();
  const m=String(s.id||'').match(/(1[5-9]\d{11})/); if(m){ const t=+m[1]; if(t>1.4e12 && t<Date.now()+864e5) return new Date(t).toISOString(); } return ''; }
const projDate=p=>p.startDate||p.date||p.createdAt||'';
// บัญชีเว็บของทีมงาน (ผูกด้วยรหัสก่อน · อีเมลตรงกันใช้กับบัญชีที่ยังไม่ผูกใคร)
function accountsIndex(){ const uc=safe(()=>ls('mgr_users_cache'),{})||{}, byId={}, byEm={};
  Object.values(uc).forEach(u=>{ if(!u) return; if(u.staffId) (byId[u.staffId]=byId[u.staffId]||[]).push(u); else if(u.email){ const e=String(u.email).toLowerCase(); (byEm[e]=byEm[e]||[]).push(u); } });
  return s=>{ const L=(byId[s.id]||[]).slice(); if(!L.length) (String(s.email||'').toLowerCase().match(/[\w.+-]+@[\w.-]+/g)||[]).forEach(e=>L.push(...(byEm[e]||[])));
    const ds=L.map(u=>u.createdAt).filter(v=>v&&!isNaN(new Date(v))).sort(); return {has:L.length>0, at:ds[0]||''}; }; }

const ST={q:'', cat:'all', left:false, desc:false, only:'all'};
function compute(){
  const P=safe(()=>getProjects(),[])||[], by={};
  safe(()=>getAllStaff(),[]).forEach(s=>{ if(!s||!s.id) return; const x=by[s.id]||(by[s.id]={s, cats:new Set(), jobs:new Set(), last:'', first:''}); x.cats.add(s.category); });
  P.forEach(p=>{ if(!p||!p.id) return; const d=String(projDate(p)).slice(0,10);
    (p.workers||[]).forEach(w=>{ const id=w&&(w.id||w.staffId); const x=id&&by[id]; if(!x) return; x.jobs.add(p.id);
      if(d){ if(!x.last||d>x.last) x.last=d; if(!x.first||d<x.first) x.first=d; } }); });
  const acc=accountsIndex();
  return Object.values(by).map(x=>{ const a=acc(x.s); return {...x, n:x.jobs.size, added:joinedOf(x.s), acct:a.has, signup:a.at, joined:a.at||joinedOf(x.s), status:safe(()=>getStaffStatus(x.s),'active')}; });
}
function render(){
  const b=$('nd-work-body'); if(!b) return;
  if(!isAdm()){ b.innerHTML='<div style="padding:40px;text-align:center;color:var(--text2)">🔒 สำหรับแอดมิน</div>'; return; }
  const all=compute(), act=all.filter(x=>x.status!=='resigned');
  const base=ST.left?all:act;
  const q=ST.q.trim().toLowerCase();
  let L=base.filter(x=>(ST.cat==='all'||x.cats.has(ST.cat)) && (ST.only==='all'||(ST.only==='zero'?x.n===0:x.n>0))
    && (!q||[x.s.nickname,fullName(x.s),x.s.email].join(' ').toLowerCase().includes(q)));
  L.sort((a,b)=>ST.desc?(b.n-a.n||String(a.joined).localeCompare(String(b.joined))):(a.n-b.n||String(a.joined).localeCompare(String(b.joined))));
  const zero=base.filter(x=>x.n===0).length, tot=base.reduce((a,x)=>a+x.n,0);
  const cats=['dubbing','adaptation','mix','qc','subVideo','translation','manager'].filter(c=>base.some(x=>x.cats.has(c)));
  const tile=(l,v,c,only)=>`<div onclick="NDWORK.set('only','${only}')" style="cursor:pointer;flex:1;min-width:150px;padding:12px 14px;border-radius:12px;background:var(--card);border:1px solid ${ST.only===only?c:'var(--border2)'}"><div style="font-size:12px;color:var(--text2)">${l}</div><div style="font-size:24px;font-weight:800;color:${c}">${v}</div></div>`;
  const inp='padding:7px 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:Kanit;font-size:13px';
  b.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      ${tile('ทีมงานทั้งหมด',base.length,'var(--accent2)','all')}${tile('เคยรับงานแล้ว',base.length-zero,'var(--green)','some')}${tile('ยังไม่เคยได้งานเลย',zero,'var(--red)','zero')}
      <div style="flex:1;min-width:150px;padding:12px 14px;border-radius:12px;background:var(--card);border:1px solid var(--border2)"><div style="font-size:12px;color:var(--text2)">งานที่มอบหมายรวม</div><div style="font-size:24px;font-weight:800">${tot}</div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <input id="ndw-q" style="${inp};flex:1;min-width:200px" placeholder="🔍 ค้นชื่อเล่น / ชื่อจริง / อีเมล" value="${E(ST.q)}" oninput="NDWORK.set('q',this.value,true)">
      <select style="${inp}" onchange="NDWORK.set('cat',this.value)"><option value="all">ทุกตำแหน่ง</option>${cats.map(c=>`<option value="${c}"${ST.cat===c?' selected':''}>${E(catLabel(c))}</option>`).join('')}</select>
      <button class="btn btn-sm btn-outline" onclick="NDWORK.set('desc',${!ST.desc})">${ST.desc?'⬇️ มาก → น้อย':'⬆️ น้อย → มาก'}</button>
      <label style="font-size:12.5px;display:flex;gap:5px;align-items:center"><input type="checkbox" ${ST.left?'checked':''} onchange="NDWORK.set('left',this.checked)"> รวมคนที่ลาออก</label>
      <button class="btn btn-sm btn-outline" onclick="NDWORK.csv()">⬇️ CSV</button></div>
    <div class="table-wrap"><table><thead><tr><th style="width:40px">#</th><th>ชื่อเล่น</th><th>ชื่อจริง</th><th>ตำแหน่ง</th><th style="text-align:center">จำนวนงาน</th><th>งานล่าสุด</th><th>เข้าระบบเมื่อ</th><th>เพิ่มในทีม</th></tr></thead><tbody>
    ${L.map((x,i)=>`<tr style="cursor:pointer" onclick="try{openStaffDetail('${E(x.s.id)}')}catch(e){}">
      <td style="color:var(--text2)">${i+1}</td>
      <td><b>${E(x.s.nickname||'—')}</b>${x.status==='resigned'?' <span style="font-size:10px;color:var(--red)">ลาออก</span>':x.status==='suspended'?' <span style="font-size:10px;color:var(--orange)">พักงาน</span>':''}</td>
      <td>${E(fullName(x.s)||'—')}</td>
      <td style="font-size:11.5px;color:var(--text2)">${[...x.cats].map(c=>E(catLabel(c))).join(' · ')}</td>
      <td style="text-align:center">${x.n?`<b style="font-size:15px;color:var(--accent2)">${x.n}</b>`:'<span style="padding:2px 9px;border-radius:9px;background:rgba(255,64,64,.12);color:var(--red);font-size:11.5px;font-weight:700">ยังไม่เคยได้งาน</span>'}</td>
      <td style="font-size:12px;color:var(--text2)">${x.last?dTH(x.last):'—'}</td>
      <td style="font-size:12px">${x.signup?dTH(x.signup):x.acct?'<span style="color:var(--text2)">มีบัญชี (ไม่ทราบวัน)</span>':'<span style="color:var(--orange)">ยังไม่สมัครเว็บ</span>'}</td>
      <td style="font-size:12px;color:var(--text2)">${x.added?dTH(x.added):'—'}</td></tr>`).join('')||'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text2)">ไม่พบรายชื่อ</td></tr>'}
    </tbody></table></div>
    <div style="font-size:11.5px;color:var(--text2);margin-top:8px">นับ 1 โปรเจกต์ = 1 งาน ต่อคน (รับหลายช่องในโปรเจกต์เดียวนับครั้งเดียว) · กดแถวเพื่อเปิดโปรไฟล์ · "เข้าระบบเมื่อ" = วันที่สมัครบัญชีเว็บ · "เพิ่มในทีม" = วันที่รายชื่อถูกเพิ่มเข้าทะเบียนทีม</div>`;
  if(ST._focus){ const i=$('ndw-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } ST._focus=false; }
}
function csv(){ const L=compute().filter(x=>ST.left||x.status!=='resigned').sort((a,b)=>a.n-b.n);
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const t='﻿'+['ชื่อเล่น,ชื่อจริง,ตำแหน่ง,จำนวนงาน,งานล่าสุด,เข้าระบบเมื่อ (สมัครเว็บ),เพิ่มในทีม,สถานะ'].concat(L.map(x=>[x.s.nickname,fullName(x.s),[...x.cats].map(catLabel).join(' / '),x.n,x.last,x.signup?x.signup.slice(0,10):(x.acct?'':'ยังไม่สมัครเว็บ'),x.added?x.added.slice(0,10):'',x.status].map(q).join(','))).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'})); a.download='สรุปการทำงานทีม-'+new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); }
function ensurePage(){
  if($('page-nd-work')) return; const mc=document.querySelector('.main-content'); if(!mc) return;
  const d=document.createElement('div'); d.id='page-nd-work'; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">📊 สรุปการทำงาน</div><div class="page-subtitle">ใครเคยรับงานกี่งาน เรียงจากน้อยไปมาก · ใครยังไม่เคยได้งาน · เข้าระบบตั้งแต่เมื่อไร</div></div><div id="nd-work-body" style="max-width:1180px"></div>`;
  mc.appendChild(d);
  new MutationObserver(()=>{ if(!d.classList.contains('hidden')) render(); }).observe(d,{attributes:true,attributeFilter:['class']});
}
window.NDWORK={ set(k,v,keep){ ST[k]=v; if(keep) ST._focus=true; render(); }, render, csv };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensurePage); else ensurePage();
setTimeout(ensurePage,1500);
})();
