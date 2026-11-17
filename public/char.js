// CELLBOUND - karakter pemain 3D "Cellcy" (rig AccuRig dari FBX, animasi prosedural).
// Model: public/models/Cellcy.glb (1 mesh skinned, 94 tulang, tanpa klip animasi).
// Animasi dibuat langsung di tulang: jalan, diam (napas), dan 4 gerakan emote.
(()=>{
const FILE='models/Cellcy.glb',SCALE=3,HEAD=1.7*SCALE,TAU=Math.PI*2,D=Math.PI/180;
const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const _q=new T.Quaternion(),_v1=new T.Vector3(),_v2=new T.Vector3();

// P (posisi) -> actor (arah hadap) -> lean (condong) -> body (geser/bob + model)
const actor=new T.Group(),lean=new T.Group(),body=new T.Group();
actor.add(lean);lean.add(body);P.add(actor);

// aura di kaki: penanda posisi pemain + warna pemain di mode kelas
const aura=new T.Mesh(new T.TorusGeometry(1.35,.07,8,48),new T.MeshBasicMaterial({color:0x4ff0d0,transparent:true,opacity:.5,depthWrite:false}));
aura.rotation.x=-Math.PI/2;aura.position.y=.06;aura.renderOrder=2;P.add(aura);
// bayangan kontak lembut
const sh=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,4,64,64,62);
 r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(.55,'rgba(0,0,0,.28)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
 const m=new T.Mesh(new T.PlaneGeometry(2.6,2),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,opacity:.9}));
 m.rotation.x=-Math.PI/2;m.position.y=.03;m.renderOrder=1;return m})();P.add(sh);
window.CHAR_HEAD=HEAD;

// ---------- indikator memuat ----------
const badge=document.createElement('div');
badge.style.cssText='position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:6;pointer-events:none;background:rgba(6,30,44,.9);border:1px solid #1d5b70;border-radius:999px;padding:8px 16px;font:600 12px Sora,system-ui,sans-serif;color:#8fb7c4';
badge.textContent='Memuat karakter…';
document.body.appendChild(badge);

// =====================================================================
// RIG: kumpulkan tulang + sumbu putar tubuh di ruang induknya
// =====================================================================
const NORMB=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const NAMES={
 pelvis:'pelvis',spine1:'spine01',spine2:'spine02',spine3:'spine03',neck:'neck01',head:'head',
 clavL:'claviclel',armL:'upperarml',foreL:'lowerarml',handL:'handl',
 clavR:'clavicler',armR:'upperarmr',foreR:'lowerarmr',handR:'handr',
 thighL:'thighl',calfL:'calfl',footL:'footl',ballL:'balll',
 thighR:'thighr',calfR:'calfr',footR:'footr',ballR:'ballr'
};
const FINGERS=['index','middle','pinky','thumb'];

function buildRig(root){
 root.updateMatrixWorld(true);
 const byName={};root.traverse(o=>{if(o.isBone)byName[NORMB(o.name)]=o});
 const B={},list=[];
 const add=(key,name)=>{
  const b=byName[NORMB(name)];if(!b)return null;
  const pw=new T.Quaternion();(b.parent||root).getWorldQuaternion(pw);
  const inv=pw.clone().invert();
  const e={b,rest:b.quaternion.clone(),
   ax:X.clone().applyQuaternion(inv).normalize(),   // kiri-kanan (pitch)
   ay:Y.clone().applyQuaternion(inv).normalize(),   // atas-bawah (yaw)
   az:Z.clone().applyQuaternion(inv).normalize()};  // depan-belakang (roll)
  B[key]=e;list.push(e);return e;
 };
 for(const k in NAMES)add(k,NAMES[k]);
 for(const s of ['l','r'])for(const f of FINGERS)for(let i=1;i<=3;i++)add(f+i+s,f+'_0'+i+'_'+s);
 // sudut lengan saat pose istirahat (dari bawah, positif ke arah luar)
 const phi=s=>{const a=B['arm'+s];if(!a)return 0;
  const p1=a.b.getWorldPosition(new T.Vector3()),p2=B['fore'+s]?B['fore'+s].b.getWorldPosition(new T.Vector3()):p1;
  const d=p2.sub(p1).normalize();return Math.atan2(d.x,-d.y)};
 // tinggi tulang bola kaki di atas titik asal model (untuk menapak tanah)
 const rootY=root.getWorldPosition(new T.Vector3()).y;
 const footY=B.ballL?B.ballL.b.getWorldPosition(new T.Vector3()).y-rootY:0;
 return {B,list,footY,phiL:phi('L'),phiR:phi('R')};
}

// putar tulang: rest -> rotasi sumbu X, Y, Z (ruang induk)
function rot(e,rx,ry,rz){
 if(!e)return;const q=e.b.quaternion;q.copy(e.rest);
 if(rx)q.premultiply(_q.setFromAxisAngle(e.ax,rx));
 if(ry)q.premultiply(_q.setFromAxisAngle(e.ay,ry));
 if(rz)q.premultiply(_q.setFromAxisAngle(e.az,rz));
}

// =====================================================================
// KURVA SIKLUS JALAN (0..1 = satu langkah penuh dua kaki)
// =====================================================================
function cyc(k,u){
 u-=Math.floor(u);const n=k.length;let i=n-1;
 for(let j=0;j<n;j++)if(k[j][0]<=u)i=j;
 const k0=k[(i-1+n)%n],k1=k[i],k2=k[(i+1)%n],k3=k[(i+2)%n];
 let a=k1[0],b=k2[0];if(b<=a)b+=1;
 let x=u;if(x<a){x+=1;b+=1}
 let s=(x-a)/(b-a);s=s<0?0:s>1?1:s;
 return .5*((2*k1[1])+(-k0[1]+k2[1])*s+(2*k0[1]-5*k1[1]+4*k2[1]-k3[1])*s*s+(-k0[1]+3*k1[1]-3*k2[1]+k3[1])*s*s*s);
}
// derajat. kaki kiri: 0 = tumit menyentuh, 0.5 = ujung kaki lepas
const K_THIGH=[[0,23],[.12,19],[.3,6],[.5,-14],[.62,-12],[.78,6],[.9,20],[1,23]];
const K_KNEE =[[0,7],[.1,18],[.25,10],[.4,6],[.5,16],[.62,42],[.72,56],[.82,38],[.92,12],[1,7]];
const K_ANKLE=[[0,-7],[.12,2],[.3,3],[.45,8],[.56,16],[.64,2],[.76,-8],[.9,-10],[1,-7]];
const K_TOE  =[[0,0],[.4,0],[.5,6],[.58,14],[.66,2],[.8,0],[1,0]];

function zeroPose(){return{
 pP:0,pY:0,pR:0, s1P:0,s1Y:0,s1R:0, s2P:0,s2Y:0,s2R:0, s3P:0,s3Y:0,s3R:0,
 hP:0,hY:0,hR:0, clL:0,clR:0,
 eL:0,eR:0, fL:0,fR:0, elL:0,elR:0, wL:0,wR:0, wzL:0,wzR:0, eyL:0,eyR:0,
 tL:0,tR:0, oL:0,oR:0, kL:0,kR:0, aL:0,aR:0, bL:0,bR:0,
 curlL:0,curlR:0, thumbL:0,thumbR:0
}}

// pose diam: napas, geser berat badan, kepala melihat sekitar
function idlePose(t){
 const p=zeroPose(),br=Math.sin(t*1.55),sw=Math.sin(t*.42);
 p.kL=p.kR=6*D; p.oL=p.oR=2.5*D;
 p.eL=p.eR=(7+br*.6)*D; p.elL=p.elR=(11+br*.8)*D; p.fL=p.fR=1.5*D*Math.sin(t*.9);
 p.s1R=-1.1*D*sw; p.pR=1.6*D*sw;
 p.s2P=1.3*D*br; p.s3P=.8*D*br; p.clL=p.clR=.6*D*br;
 p.hY=3.2*D*Math.sin(t*.33+.6); p.hP=(1.2+1.1*Math.sin(t*.52))*D; p.hR=-1.4*D*sw;
 p.s1Y=1.2*D*Math.sin(t*.27);
 p.curlL=.22;p.curlR=.22;p.thumbL=.06;p.thumbR=.06;
 return p;
}
// pose jalan: satu siklus penuh, fasa 0 = kaki kiri mendarat
function walkPose(u,t){
 const p=zeroPose(),ur=(u+.5)%1;
 const c=Math.cos(u*TAU),s=Math.sin(u*TAU);
 p.tL=cyc(K_THIGH,u)*D;      p.tR=cyc(K_THIGH,ur)*D;
 p.kL=(cyc(K_KNEE,u)+2)*D;   p.kR=(cyc(K_KNEE,ur)+2)*D;
 p.aL=cyc(K_ANKLE,u)*D;      p.aR=cyc(K_ANKLE,ur)*D;
 p.bL=cyc(K_TOE,u)*D;        p.bR=cyc(K_TOE,ur)*D;
 p.oL=p.oR=1.5*D;
 // panggul: oleng ke sisi tumpuan + rotasi + naik-turun halus
 p.pY=-5.5*D*c; p.pR=3.2*D*s; p.pP=1.8*D;
 // tulang belakang melawan rotasi panggul, badan condong sedikit
 p.s1Y=4.2*D*c; p.s2Y=2.4*D*c; p.s3Y=1.4*D*c;
 p.s1R=-1.8*D*s; p.s2P=4.6*D; p.s3P=1.6*D;
 // lengan mengayun berlawanan kaki, siku menekuk saat ke depan
 const swL=-18*D*c,swR=18*D*c;
 p.fL=swL; p.fR=swR;
 p.eL=p.eR=(6+Math.abs(c)*1.5)*D;
 p.elL=(11+10*Math.max(0,-c))*D; p.elR=(11+10*Math.max(0,c))*D;
 p.wL=p.wR=3*D*Math.sin(u*TAU+.4);
 // kepala menstabilkan pandangan
 p.hY=-(p.pY+p.s1Y+p.s2Y+p.s3Y)*.55;
 p.hP=(1.4+1.4*Math.sin(u*TAU*2+1))*D;
 p.hR=-p.pR*.55;
 p.curlL=.3;p.curlR=.3;p.thumbL=.08;p.thumbR=.08;
 // putaran halus bebas dari gerak badan
 p.s2P+=.5*D*Math.sin(t*1.4);
 return p;
}

// =====================================================================
// EMOTE: gesture singkat sesuai emoji yang dipilih
// =====================================================================
const EMO_DUR=[2.8,2.2,3.2,2.6];
function emotePose(i,t){
 const p={};
 if(i===0){ // 👋 lambaikan tangan kanan (telapak terbuka)
  const k=Math.sin(t*9.5),k2=Math.sin(t*9.5-.7);
  p.eR=1.32+.14*k; p.fR=.18+.04*Math.abs(k);
  p.elR=1.42+.18*k2; p.wR=-.25+.35*k; p.wzR=.12*k; p.clR=.16;
  p.hR=.08+.05*k; p.hY=-.06; p.eL=.05;
  p.curlR=.1; p.thumbR=-.05;
 }else if(i===1){ // 👍 genggam lalu acungkan jempol
  const k=Math.max(0,Math.sin(t*6.5));
  p.eR=1.1+.06*k; p.fR=.5; p.elR=1.45+.08*k;
  p.wR=.2; p.wzR=-.6; p.clR=.14;
  p.curlR=1.55; p.thumbR=0;
  p.hP=.05; p.hR=-.04; p.pP=-.02;
  p.eL=.06;
 }else if(i===2){ // 🤔 tangan menyentuh dagu
  const k=Math.sin(t*2.1);
  p.eR=.3; p.eyR=1.7; p.fR=.9; p.elR=1.5+.05*k;
  p.wR=.1; p.wzR=.6; p.curlR=1.35; p.thumbR=.3;
  p.hP=.12+.02*k; p.hR=.12; p.hY=.06+.05*k;
  p.s2P=.03; p.s1R=.02; p.pR=.02;
  p.eL=.05; p.elL=.12;
 }else{ // 🎉 kedua tangan ke atas + lompat kecil
  const kL=Math.sin(t*7),kR=Math.sin(t*7+.9);
  p.eL=2.35+.06*kL; p.eR=2.35+.06*kR; p.fL=p.fR=.25;
  p.elL=.35-.1*kL; p.elR=.35-.1*kR; p.clL=.25; p.clR=.25;
  p.hP=-.14+.04*kL; p.s2P=-.04; p.pP=-.03;
  p.curlL=p.curlR=.06;
 }
 return p;
}

// =====================================================================
// TERAPKAN POSE KE TULANG
// =====================================================================
function applyPose(r,p){
 const B=r.B;
 rot(B.pelvis,p.pP,p.pY,p.pR);
 rot(B.spine1,p.s1P*.4,p.s1Y*.5,p.s1R*.6);
 rot(B.spine2,p.s1P*.6+p.s2P,p.s1Y*.8+p.s2Y,p.s1R*.8+p.s2R);
 rot(B.spine3,p.s3P,p.s3Y,p.s3R);
 rot(B.neck,p.hP*.35,p.hY*.35,p.hR*.35);
 rot(B.head,p.hP*.65,p.hY*.65,p.hR*.65);
 rot(B.clavL,0,0,p.clL);
 rot(B.clavR,0,0,-p.clR);
 rot(B.armL,-p.fL,p.eyL,p.eL-r.phiL);
 rot(B.armR,-p.fR,p.eyR,-p.eR-r.phiR);
 rot(B.foreL,-p.elL,0,0);
 rot(B.foreR,-p.elR,0,0);
 rot(B.handL,p.wL,0,p.wzL);
 rot(B.handR,-p.wR,0,p.wzR);
 rot(B.thighL,-p.tL,0,p.oL);
 rot(B.thighR,-p.tR,0,-p.oR);
 rot(B.calfL,p.kL,0,0);
 rot(B.calfR,p.kR,0,0);
 rot(B.footL,p.aL,0,0);
 rot(B.footR,p.aR,0,0);
 rot(B.ballL,p.bL,0,0);
 rot(B.ballR,p.bR,0,0);
 // jari: menggenggam = putar ke arah telapak (kiri dan kanan berlawanan)
 const sgn=s=>s==='l'?1:-1;
 const hand=(s,curl,thumb)=>{
  const c=sgn(s);
  for(const f of ['index','middle','pinky']){
   B[f+'1'+s]&&rot(B[f+'1'+s],c*curl,0,0);
   B[f+'2'+s]&&rot(B[f+'2'+s],c*curl*1.1,0,0);
   B[f+'3'+s]&&rot(B[f+'3'+s],c*curl*.7,0,0);
  }
  B['thumb1'+s]&&rot(B['thumb1'+s],c*thumb*.8,0,0);
  B['thumb2'+s]&&rot(B['thumb2'+s],c*thumb*.5,0,0);
 };
 hand('l',p.curlL,p.thumbL);
 hand('r',p.curlR,p.thumbR);
}

// =====================================================================
// AVATAR (pemain + teman di mode kelas)
// =====================================================================
let ready=false,tpl=null;
const FOOT_LIFT=.05;                 // toleransi kaki di atas lantai
function makeAvatar(model,color,groups){
 const g=groups||{};
 const a=g.actor||new T.Group(),l=g.lean||new T.Group(),b=g.body||new T.Group();
 if(!groups){a.add(l);l.add(b)}
 b.add(model);model.scale.setScalar(SCALE);
 const rig=buildRig(model);
 // lingkaran warna di kaki
 let rg=null;
 if(!groups){
  rg=new T.Mesh(new T.TorusGeometry(1.35,.07,8,40),new T.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}));
  rg.rotation.x=-Math.PI/2;rg.position.y=.06;a.add(rg);
 }
 const st={phase:Math.random()*TAU,walk:0,face:0,faceT:0,emo:null,grounded:0};
 return {actor:a,lean:l,body:b,rig,st,rg,
  emote(i){if(i>=0&&i<EMO_DUR.length)st.emo={i,t:0}},
  setColor(c){if(rg)rg.material.color.set(c)},
  update(dt,t,speed,vx,vz){
   const walkT=Math.min(1,speed/1.75);
   st.walk+=(walkT-st.walk)*(1-Math.exp(-dt*7));
   if(st.walk>.02)st.phase+=dt*TAU*Math.min(2.6,Math.max(.55,speed/2.1));
   const u=(st.phase/TAU)%1;
   const wp=walkPose(u,t),ip=idlePose(t),w=st.walk;
   const p=zeroPose();for(const k in p)p[k]=ip[k]+(wp[k]-ip[k])*w;
   // emote (tumpang tindih dengan jalan)
   let hop=0;
   if(st.emo){
    const e=st.emo;e.t+=dt;
    const dur=EMO_DUR[e.i];
    if(e.t>dur+.45)st.emo=null;
    else{
     const inW=Math.min(1,e.t/.26),outW=Math.min(1,Math.max(0,(dur+.45-e.t)/.4));
     const ew=inW*inW*(3-2*inW)*outW*outW*(3-2*outW);
     const ep=emotePose(e.i,e.t);
     for(const k in ep)p[k]=p[k]+(ep[k]-p[k])*ew;
     if(e.i===3){const q=Math.max(0,Math.sin(e.t*7.4));hop=.28*q*ew*Math.max(0,1-e.t/1.9)}
    }
   }
   // arah hadap
   if(speed>.4&&vx!==undefined)st.faceT=Math.atan2(vx,vz);
   let d=st.faceT-st.face;d=((d+Math.PI)%TAU+TAU)%TAU-Math.PI;
   st.face+=d*(1-Math.exp(-dt*9));
   a.rotation.y=st.face;
   // pose tulang
   applyPose(rig,p);
   // condong badan + langkah menyamping
   l.rotation.x=(-.02*w+(p.s2P*.35))*(1);
   l.rotation.z=-p.pR*.5;
   b.position.x=.055*w*Math.sin(u*TAU);
   // tapak kaki: turunkan/naikkan badan agar kaki tumpuan menapak lantai
   b.position.y=0;
   b.getWorldPosition(_v1);
   let low=0;
   if(rig.B.ballL){
    low=Math.min(rig.B.ballL.b.getWorldPosition(_v2).y,rig.B.ballR.b.getWorldPosition(_v2).y);
    const dy=low-_v1.y-rig.footY+FOOT_LIFT;
    b.position.y=-dy*(.55+.42*Math.min(1,st.walk+.35));
   }
   b.position.y+=hop;
   if(rg)rg.material.opacity=.36+Math.sin(t*2.4+st.phase)*.09;
  }
 };
}

// pemain memakai grup yang sudah ada (aura + bayangan sudah di P)
let player=null;
function onModel(g){
 tpl=g.scene;
 tpl.traverse(o=>{
  if(o.isMesh){
   o.frustumCulled=false;o.renderOrder=3;
   const m=o.material;
   if(m){m.side=T.DoubleSide;m.shadowSide=T.DoubleSide;if(m.map)m.map.anisotropy=4;
    if(m.normalMap){m.normalScale.set(.9,.9)}
    m.envMapIntensity=.55;m.roughness=Math.min(1,(m.roughness||.8)+.05)}
  }
 });
 player=makeAvatar(tpl,0x4ff0d0,{actor,lean,body});
 ready=true;probe.visible=false;
 badge.remove();
 if(typeof toast==='function')toast('Karakter <b>Cellcy</b> siap! Jelajahi sel dengan <b>WASD</b>, joystick, atau klik lantai.',false,3200);
}
function onProgress(p){
 if(p&&p.total)badge.textContent='Memuat karakter… '+Math.round(p.loaded/p.total*100)+'%';
 else if(p&&p.loaded)badge.textContent='Memuat karakter… '+(p.loaded/1048576).toFixed(1)+' MB';
}
function onError(e){
 badge.remove();probe.visible=true;
 console.warn('Gagal memuat karakter 3D:',e);
 if(typeof toast==='function')toast('Model karakter gagal dimuat, memakai probe. Pastikan <b>public/models/Cellcy.glb</b> ada.',true,6000);
}
const loader=T.GLTFLoader?new T.GLTFLoader():null;
if(!loader)onError('GLTFLoader tidak tersedia');
else if(location.protocol==='file:'){// berkas lokal tidak bisa di-XHR: pakai salinan base64
 const sc=document.createElement('script');sc.src='models/Cellcy.b64.js';
 sc.onload=()=>{try{
  const b=atob(window.CELLCY_GLB||''),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  loader.parse(u.buffer,'',onModel,onError);
 }catch(err){onError(err)}};
 sc.onerror=()=>onError('models/Cellcy.b64.js tidak ditemukan');
 document.head.appendChild(sc);
}else loader.load(FILE,onModel,onProgress,onError);

// ---------- animasi tiap frame ----------
window.charTick=(dt,t,speed)=>{
 if(!ready||!player){
  // cadangan: probe melayang seperti versi lama
  probe.position.y=1.3+Math.sin(t*2)*.15;
  ring.rotation.z=vel.x*.04;ring.rotation.x=Math.PI/2+vel.z*.04;core.rotation.y=t;core.rotation.x=t*.6;
  aura.material.opacity=.3+Math.sin(t*2)*.1;
  return;
 }
 player.update(dt,t,speed||0,vel.x,vel.z);
 aura.material.opacity=.42+Math.sin(t*2.6)*.12;
 aura.scale.setScalar(1+Math.sin(t*2.6)*.04);
 sh.material.opacity=.75+.15*Math.sin(t*1.3);
};

// emote pemain (dipanggil mp.js saat tombol 1-4 / emoji ditekan)
window.charEmote=i=>{if(player)player.emote(i)};

// warna pemain (dipakai mode kelas)
window.setPlayerColor=hex=>{
 aura.material.color.set(hex);
 if(player)player.setColor(hex);
 if(typeof core!=='undefined'&&core.material){core.material.color.set(hex);core.material.emissive.set(hex)}
};

// ---------- avatar pemain lain (mode kelas) ----------
window.charPeer=color=>{
 if(!ready||!tpl)return null;
 const root=T.SkeletonUtils.clone(tpl);
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
 const av=makeAvatar(root,color,null);
 return{obj:av.actor,update:(dt,t,speed,vx,vz)=>av.update(dt,t,speed,vx,vz),emote:i=>av.emote(i),setColor:c=>av.setColor(c)};
};
})();
