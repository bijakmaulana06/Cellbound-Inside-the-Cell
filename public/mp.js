// CELLBOUND - modul multiplayer (mode kelas). Memakai variabel global dari index.html.
(()=>{
const EM=['👋','👍','🤔','🎉'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let WS=null,myId=null,myName='',qa=null,qLock=false,lastSec=-1,sendT=0,lx=1e9,lz=1e9,BOARD=[],myCol='#4ff0d0';
const peers=new Map(),send=o=>{if(WS&&WS.readyState===1)WS.send(JSON.stringify(o))};
const bd=document.createElement('div');bd.className='hud';bd.style.cssText='left:auto;right:12px;display:none;max-width:215px';document.body.appendChild(bd);
const eb=document.createElement('div');eb.id='emo';eb.innerHTML=EM.map((e,i)=>`<button data-i="${i}">${e}</button>`).join('');document.body.appendChild(eb);
eb.onclick=e=>{const b=e.target.closest('button');if(b&&MP)send({t:'emo',i:+b.dataset.i})};
addEventListener('keydown',e=>{if(MP&&e.target.tagName!=='INPUT'&&/^[1-4]$/.test(e.key))send({t:'emo',i:+e.key-1})});
function mkLabel(name,color){const el=document.createElement('div');el.className='lbl';el.style.borderColor=color;el.style.color=color;const em=document.createElement('span');em.style.marginRight='4px';el.appendChild(em);el.appendChild(document.createTextNode(name));LBL.appendChild(el);return el}
function addPeer(p){if(peers.has(p.id))return;
 const g=new T.Group();g.position.set(p.x,0,p.z);S.add(g);
 const av=window.charPeer?window.charPeer(p.color):null;let c=null,r=null;
 if(av)g.add(av.obj);
 else{// cadangan sebelum model 3D siap
  c=new T.Mesh(new T.IcosahedronGeometry(.45,2),new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.8}));c.position.y=1.3;
  r=new T.Mesh(new T.TorusGeometry(.8,.05,8,36),new T.MeshBasicMaterial({color:p.color}));r.rotation.x=Math.PI/2;r.position.y=1.3;g.add(c,r)}
 peers.set(p.id,{g,av,c,r,el:mkLabel(p.name,p.color),tx:p.x,tz:p.z,ph:Math.random()*6})}
function delPeer(id){const p=peers.get(id);if(!p)return;S.remove(p.g);p.el.remove();peers.delete(id)}
function emote(el,i){const s=el.firstChild;s.textContent=EM[i];clearTimeout(el._t);el._t=setTimeout(()=>s.textContent='',2500)}
function drawBoard(){const L=BOARD.slice().sort((a,b)=>b.score-a.score||b.found-a.found);
 bd.innerHTML=`<b>KELAS ${esc(MP.code)} · ${L.length} SISWA</b><ul style="columns:1">`+L.slice(0,8).map((p,i)=>`<li class="${p.id===myId?'ok':''}" style="opacity:1;${p.id===myId?'':'color:'+p.color}">${i+1}. ${esc(p.name)} · ${p.found}/${IT.length} · <b>${p.score}</b></li>`).join('')+'</ul>'}
function joinCard(msg){const qs=new URLSearchParams(location.search);
 card(`<span class="tag">MODE KELAS</span><h2>Gabung Kelas 👥</h2><p>Masukkan nama dan kode kelas dari guru.${msg?`</p><p class="fact" style="border-color:#ff6b6b">${esc(msg)}`:''}</p><input id="nm" placeholder="Nama kamu" maxlength="16" value="${esc(myName)}"><input id="cd" placeholder="KODE KELAS" maxlength="6" style="text-transform:uppercase" value="${esc((qs.get('kode')||'').toUpperCase())}"><div class="row"><button id="jg">Gabung</button><button class="alt" id="bk">Kembali</button></div>`);
 $('bk').onclick=()=>location.reload();
 $('jg').onclick=()=>{const n=$('nm').value.trim(),c=$('cd').value.trim();if(!n||!c){joinCard('Isi nama dan kode kelas.');return}myName=n;connect(n,c)}}
function connect(name,code){
 if(!/^https?:$/.test(location.protocol)){joinCard('Mode kelas butuh server. Jalankan: npm start atau npx wrangler dev, lalu buka alamat yang tampil.');return}
 const wsUrl=window.CB_WS_URL||new URLSearchParams(location.search).get('ws')||((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
 try{WS=new WebSocket(wsUrl)}catch(e){joinCard('Tidak bisa terhubung ke server.');return}
 WS.onopen=()=>send({t:'join',name,code});
 WS.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return}onMsg(d)};
 WS.onerror=()=>{if(!MP)joinCard('Tidak bisa terhubung ke server.')};
 WS.onclose=()=>{if(MP){MP=null;bd.style.display=eb.style.display='none';toast('Koneksi ke server terputus. Muat ulang halaman untuk bergabung lagi.',true,8000)}}}
let me=null;
function onMsg(d){switch(d.t){
 case 'err':joinCard(d.m);break;
 case 'joined':MP={code:d.code};myId=d.id;myCol=d.color;BOARD=d.board;d.players.forEach(addPeer);
  core.material.color.set(myCol);core.material.emissive.set(myCol);if(window.setPlayerColor)window.setPlayerColor(myCol);
  me=me||mkLabel(myName+' (kamu)',myCol);close();phase='explore';bd.style.display='block';eb.style.display='flex';drawBoard();
  toast(d.mode==='quiz'?'Kuis sedang berlangsung. Tunggu pertanyaan berikutnya!':'Kamu masuk kelas '+d.code+'. Jelajahi sel bersama teman! Tombol 1-4 untuk emote.',false,4000);
  if(d.mode==='quiz')phase='challenge';break;
 case 'peer':addPeer(d);break;
 case 'left':delPeer(d.id);break;
 case 'snap':for(const[id,x,z]of d.p){const p=peers.get(id);if(p){p.tx=x;p.tz=z}}break;
 case 'board':BOARD=d.board;if(MP)drawBoard();break;
 case 'emote':{const p=d.id===myId?{el:me}:peers.get(d.id);if(p&&p.el)emote(p.el,d.i);break}
 case 'mode':if(d.mode==='quiz'){close();phase='challenge';target=null;toast('Kuis balapan dimulai! Klik organel yang benar secepat mungkin.',false,3000)}break;
 case 'q':close();phase='challenge';qa={...d,t0:performance.now()};qLock=false;lastSec=-1;$('q').style.display='block';renderQ();$('toast').style.display='none';break;
 case 'ack':qLock=true;renderQ();break;
 case 'qres':{qa&&(qa.over=true);qLock=true;const o=IT.find(x=>x.id===d.correct),g=d.gain[myId];BOARD=d.board;drawBoard();
  if(o)burst(o.pos,o.rr);
  toast(g>0?`✅ Benar! +${g} poin. Jawabannya: <b>${o.name}</b>`:`❌ ${g===0?'Salah':'Tidak menjawab'}. Jawaban yang benar: <b>${o?o.name:''}</b>`,!(g>0),3800);
  $('q').innerHTML=`<small>PERTANYAAN ${d.i+1}/${qa.n} · SELESAI</small>${qa.text}`;break}
 case 'final':{qa=null;$('q').style.display='none';BOARD=d.board;drawBoard();phase='panel';
  const L=d.board.slice().sort((a,b)=>b.score-a.score),md=['🥇','🥈','🥉'];
  card(`<span class="tag">KUIS SELESAI</span><h2>Papan Peringkat 🏆</h2><div class="fact" style="max-height:46vh;overflow:auto">${L.map((p,i)=>`<div style="display:flex;justify-content:space-between;padding:4px 0;${p.id===myId?'font-weight:800;color:var(--acc)':''}"><span>${md[i]||i+1+'.'} ${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}</div><div class="row"><button id="ok">Lanjut menjelajah</button></div>`);
  $('ok').onclick=()=>{close();phase='explore'};break}
}}
function renderQ(){if(!qa)return;const left=Math.max(0,Math.ceil(qa.dur-(performance.now()-qa.t0)/1000));
 $('q').innerHTML=`<small>PERTANYAAN ${qa.i+1}/${qa.n} · ⏱ ${left}s${qLock?' · jawaban terkirim, menunggu...':''}</small>${qa.text}`}
window.mpAnswer=id=>{if(!qa||qa.over||qLock)return;send({t:'ans',i:qa.i,id})};
window.mpFound=id=>send({t:'found',id});
window.mpTick=(dt,t)=>{if(!MP)return;
 for(const p of peers.values()){const k=Math.min(1,dt*10),mx=p.tx-p.g.position.x,mz=p.tz-p.g.position.z;
  p.g.position.x+=mx*k;p.g.position.z+=mz*k;
  if(p.av)p.av.update(dt,t,Math.min(9,Math.hypot(mx,mz)/Math.max(dt,.016)),mx,mz);
  else{p.g.position.y=1.3+Math.sin(t*2+p.ph)*.15;p.r.rotation.z=t}
  tmp.set(p.g.position.x,p.g.position.y+(window.CHAR_HEAD||1.5),p.g.position.z).project(C);p.el.style.display=tmp.z<1?'block':'none';p.el.style.transform=`translate(${(tmp.x*.5+.5)*innerWidth}px,${(-tmp.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`}
 if(me){tmp.set(P.position.x,P.position.y+(window.CHAR_HEAD||1.5),P.position.z).project(C);me.style.display=tmp.z<1?'block':'none';me.style.transform=`translate(${(tmp.x*.5+.5)*innerWidth}px,${(-tmp.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`}
 sendT+=dt;if(sendT>.1){sendT=0;const x=+P.position.x.toFixed(2),z=+P.position.z.toFixed(2);if(x!==lx||z!==lz){lx=x;lz=z;send({t:'pos',x,z})}}
 if(qa&&!qa.over){const s=Math.ceil(qa.dur-(performance.now()-qa.t0)/1000);if(s!==lastSec){lastSec=s;renderQ()}}}
const jb=$('join');if(jb)jb.onclick=()=>joinCard();
if(new URLSearchParams(location.search).get('kode')){const c=$('card');if(c)setTimeout(()=>{if(phase==='intro')joinCard()},50)}
})();
