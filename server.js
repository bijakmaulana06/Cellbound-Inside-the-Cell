'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=+process.env.PORT||3000,PUB=path.join(__dirname,'public'),DUR=20,MAXP=80;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const ORG=['membran','sitoplasma','nukleus','nukleolus','ribosom','rer','rehalus','golgi','vesikel','mitokondria','lisosom','peroksisom','sentriol'];
// Kunci jawaban hanya ada di server (anti-curang)
const QB=[['Klik struktur yang menjadi <b>pusat kendali sel</b> dan menyimpan DNA.','nukleus'],['Klik bagian yang <b>merakit subunit ribosom</b>.','nukleolus'],['Klik pembatas sel yang <b>mengatur keluar-masuk zat</b> secara selektif.','membran'],['Klik cairan tempat <b>glikolisis</b> dan banyak reaksi metabolisme berlangsung.','sitoplasma'],['Klik struktur kecil <b>tanpa membran</b> yang menerjemahkan mRNA menjadi protein.','ribosom'],['Klik kantung pipih yang <b>ditempeli ribosom</b> dan memproses protein baru.','rer'],['Klik retikulum yang <b>tanpa ribosom</b>, membuat lipid, dan menetralkan racun.','rehalus'],['Klik tumpukan sisterna yang <b>memodifikasi, menyortir, dan mengemas</b> protein.','golgi'],['Klik kantung kecil yang menjadi <b>kurir pengangkut zat</b> antar organel.','vesikel'],['Klik organel berkrista yang menghasilkan <b>ATP</b>.','mitokondria'],['Klik organel berisi <b>enzim hidrolitik</b> untuk pencernaan intrasel.','lisosom'],['Klik organel yang mengubah <b>H\u2082O\u2082 beracun menjadi air dan oksigen</b>.','peroksisom'],['Klik pasangan silinder yang membentuk <b>benang spindel</b> saat sel membelah.','sentriol']];
const COL=['#4ff0d0','#ffb347','#ff7ad9','#8fb7ff','#b6ff4a','#ff6b6b','#c58bff','#ffe27a','#6bffb0','#ff9d3c'];
const srv=http.createServer((req,res)=>{let u;try{u=decodeURIComponent(req.url.split('?')[0])}catch{res.writeHead(400);return res.end()}
 if(u==='/')u='/home.html';if(u==='/play')u='/index.html';if(u==='/guru')u='/teacher.html';
 const f=path.normalize(path.join(PUB,u));if(!f.startsWith(PUB+path.sep)){res.writeHead(403);return res.end('403')}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(b)})});
const rooms=new Map();
const mkCode=()=>{const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let c;do{c=Array.from({length:5},()=>A[Math.random()*A.length|0]).join('')}while(rooms.has(c));return c};
const tx=(ws,o)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
const toP=(r,o,skip)=>{const s=JSON.stringify(o);for(const p of r.players.values())if(p.ws!==skip&&p.ws.readyState===1)p.ws.send(s)};
const toH=(r,o)=>tx(r.host,o);
const board=r=>[...r.players.values()].map(p=>({id:p.id,name:p.name,color:p.color,found:p.found.size,score:p.score}));
const sync=r=>{const b=board(r);toP(r,{t:'board',board:b});toH(r,{t:'board',board:b})};
function nextQ(r){r.tn=null;r.qi++;
 if(r.qi>=r.order.length)return finish(r);
 const q=r.order[r.qi];r.qOpen=true;r.qStart=Date.now();r.res=new Map();r.firstRight=false;
 for(const p of r.players.values())p.answered=false;
 const m={t:'q',i:r.qi,n:r.order.length,text:q[0],dur:DUR};toP(r,m);toH(r,{...m,a:q[1]});
 r.tm=setTimeout(()=>closeQ(r),DUR*1000+500)}
function closeQ(r){if(!r.qOpen)return;r.qOpen=false;clearTimeout(r.tm);const q=r.order[r.qi];
 let right=0,ans=0;for(const p of r.players.values()){if(p.answered)ans++}for(const g of r.res.values())if(g>0)right++;
 const st={i:r.qi,text:q[0],a:q[1],right,answered:ans,total:r.players.size};r.stats.push(st);
 const m={t:'qres',i:r.qi,correct:q[1],gain:Object.fromEntries(r.res),board:board(r)};toP(r,m);toH(r,{...m,stat:st});
 r.tn=setTimeout(()=>nextQ(r),4000)}
function finish(r){clearTimeout(r.tm);clearTimeout(r.tn);r.mode='lobby';r.qOpen=false;const b=board(r);
 toP(r,{t:'final',board:b});toH(r,{t:'final',board:b,stats:r.stats})}
let port=PORT,tries=0;
srv.on('error',e=>{if(e.code==='EADDRINUSE'&&tries<30){console.log(`Port ${port} sedang dipakai, mencoba ${port+1}...`);tries++;port++;setTimeout(()=>srv.listen(port),50)}else{console.error(e.message);process.exit(1)}});
const wss=new WebSocketServer({server:srv,maxPayload:2048});
wss.on('error',()=>{}); // error server ditangani di srv (mis. EADDRINUSE)
wss.on('connection',ws=>{ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.lastPos=0;
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.t!=='string')return;
  const r=ws.room,p=ws.player;
  switch(m.t){
  case 'host':{const c=String(m.code||'').toUpperCase();let room=rooms.get(c);
   if(room&&(!room.host||room.host.readyState!==1))room.host=ws;
   else{const code=mkCode();room={code,host:ws,players:new Map(),mode:'lobby',order:[],stats:[],qi:-1,qOpen:false,nid:1,dirty:false,t0:Date.now()};rooms.set(code,room)}
   ws.room=room;ws.role='host';tx(ws,{t:'hosted',code:room.code,board:board(room),mode:room.mode,stats:room.stats});break}
  case 'join':{const room=rooms.get(String(m.code||'').toUpperCase().trim());
   if(!room)return tx(ws,{t:'err',m:'Kode kelas tidak ditemukan.'});
   if(room.players.size>=MAXP)return tx(ws,{t:'err',m:'Kelas penuh.'});
   const name=String(m.name||'').replace(/[<>&"'`]/g,'').trim().slice(0,16)||'Siswa';
   const id=room.nid++,pl={id,name,color:COL[id%COL.length],x:-4,z:10,found:new Set(),score:0,answered:false,ws};
   room.players.set(id,pl);ws.room=room;ws.player=pl;ws.role='player';
   tx(ws,{t:'joined',id,color:pl.color,code:room.code,mode:room.mode,players:[...room.players.values()].filter(q=>q!==pl).map(q=>({id:q.id,name:q.name,color:q.color,x:q.x,z:q.z})),board:board(room)});
   toP(room,{t:'peer',id,name,color:pl.color,x:pl.x,z:pl.z},ws);sync(room);break}
  case 'pos':{if(!p)return;const n=Date.now();if(n-ws.lastPos<40)return;ws.lastPos=n;
   let x=+m.x,z=+m.z;if(!isFinite(x)||!isFinite(z))return;const e=(x/24)**2+(z/17.2)**2;if(e>1){const s=1/Math.sqrt(e);x*=s;z*=s}
   p.x=x;p.z=z;r.dirty=true;break}
  case 'found':{if(!p||!ORG.includes(m.id)||p.found.has(m.id))return;p.found.add(m.id);sync(r);break}
  case 'emo':{if(!p)return;const i=m.i|0;if(i<0||i>3)return;toP(r,{t:'emote',id:p.id,i});break}
  case 'ans':{if(!p||!r.qOpen||m.i!==r.qi||p.answered)return;p.answered=true;
   const q=r.order[r.qi],ok=m.id===q[1];let g=0;
   if(ok){g=100+Math.max(0,Math.round((DUR*1000-(Date.now()-r.qStart))/200));if(!r.firstRight){r.firstRight=true;g+=50}}
   p.score+=g;r.res.set(p.id,g);tx(ws,{t:'ack',i:r.qi});
   if([...r.players.values()].every(q=>q.answered))closeQ(r);break}
  case 'start':{if(ws.role!=='host'||!r||r.mode==='quiz')return;
   if(!r.players.size)return tx(ws,{t:'err',m:'Belum ada siswa di kelas.'});
   r.order=QB.slice().sort(()=>Math.random()-.5).slice(0,10);r.stats=[];r.qi=-1;r.mode='quiz';
   for(const q of r.players.values())q.score=0;sync(r);toP(r,{t:'mode',mode:'quiz'});toH(r,{t:'mode',mode:'quiz'});nextQ(r);break}
  case 'stop':{if(ws.role!=='host'||!r||r.mode!=='quiz')return;finish(r);break}
  case 'reset':{if(ws.role!=='host'||!r)return;for(const q of r.players.values())q.score=0;sync(r);break}
  }});
 ws.on('close',()=>{const r=ws.room;if(!r)return;
  if(ws.role==='host'){if(r.host===ws)r.host=null}
  else if(ws.player){r.players.delete(ws.player.id);toP(r,{t:'left',id:ws.player.id});sync(r);
   if(r.qOpen&&r.players.size&&[...r.players.values()].every(q=>q.answered))closeQ(r)}})});
setInterval(()=>{for(const r of rooms.values()){if(!r.dirty||!r.players.size)continue;r.dirty=false;
 toP(r,{t:'snap',p:[...r.players.values()].map(q=>[q.id,+q.x.toFixed(2),+q.z.toFixed(2)])})}},100);
setInterval(()=>{for(const w of wss.clients){if(!w.alive)w.terminate();else{w.alive=false;w.ping()}}
 for(const[c,r]of rooms)if((!r.host||r.host.readyState!==1)&&!r.players.size&&Date.now()-r.t0>600000)rooms.delete(c)},30000);
srv.listen(port,()=>{const P=srv.address().port,ips=Object.values(require('os').networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>i.address);
 console.log(`CELLBOUND Kelas berjalan di port ${P}`);console.log(`  Guru   : http://localhost:${P}/guru`);ips.forEach(ip=>console.log(`  Siswa  : http://${ip}:${P}/   (jaringan yang sama)`))});
