// CELLBOUND - karakter pemain 3D "Cellcy" (GLTF + animasi prosedural)
// Dipakai di Zona 1: menggantikan probe sebagai tokoh yang dikendalikan pemain.
// Model: public/models/Cellcy.glb (rig Mixamo, tanpa animasi -> digerakkan lewat bone).
(()=>{
const FILE='models/Cellcy.glb',SCALE=3,HEAD=1.7*SCALE;
const X=new T.Vector3(1,0,0),Z=new T.Vector3(0,0,1),_q=new T.Quaternion(),_q2=new T.Quaternion(),_wq=new T.Quaternion();
let ready=false,tpl=null,rig=null;
// P (posisi) -> actor (arah hadap) -> lean (condong) -> body (naik-turun + model)
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

const norm=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const findBone=(root,want)=>{let f=null;root.traverse(o=>{if(!f&&o.isBone&&norm(o.name).endsWith(want))f=o});return f};
// sumbu putar tubuh (kiri-kanan = X, depan-belakang = Z) di ruang lokal tiap bone,
// plus sudut untuk menurunkan lengan dari pose-T menjadi pose santai.
function rigInfo(root,tmpl){
 const base={};if(tmpl)for(const d of tmpl)base[d.key]=d;
 root.updateMatrixWorld(true);
 const mk=(want,key,tip)=>{
  const b=findBone(root,want);if(!b)return null;
  if(base[key])return {key,b,rest:base[key].rest.clone(),axisX:base[key].axisX.clone(),axisZ:base[key].axisZ.clone(),lower:base[key].lower};
  const q=new T.Quaternion();b.getWorldQuaternion(q);
  const inv=q.clone().invert();
  const axisX=X.clone().applyQuaternion(inv).normalize(),axisZ=Z.clone().applyQuaternion(inv).normalize();
  let lower=0;const tb=tip?findBone(root,tip):null;
  if(tb){// arah tulang (bahu->siku) di dunia, lalu putar ke bawah mengelilingi sumbu Z tubuh
   const sh=b.getWorldPosition(new T.Vector3()),el=tb.getWorldPosition(new T.Vector3());
   const d=el.sub(sh).normalize(),a=Math.atan2(d.y,d.x);
   let th=-Math.PI/2-a;th=Math.atan2(Math.sin(th),Math.cos(th));
   lower=Math.max(-1.45,Math.min(1.45,th*.86));
  }
  return {key,b,rest:b.quaternion.clone(),axisX,axisZ,lower};
 };
 return [['hips','hips'],['leftupleg','lup'],['rightupleg','rup'],['leftarm','larm','leftforearm'],['rightarm','rarm','rightforearm'],['spine1','spine'],['head','head']]
  .map(([a,k,t])=>mk(a,k,t)).filter(Boolean);
}
function pose(bones,o){
 const put=(key,swing,bend)=>{
  const d=bones.find(x=>x.key===key);if(!d)return;
  d.b.quaternion.copy(d.rest);
  if(swing)d.b.quaternion.multiply(_q.setFromAxisAngle(d.axisX,swing));
  const lo=(d.lower||0)+(bend||0);
  if(lo)d.b.quaternion.multiply(_q2.setFromAxisAngle(d.axisZ,lo));
 };
 put('lup',o.lup);put('rup',o.rup);put('larm',o.larm);put('rarm',o.rarm);
 put('spine',o.spine);put('head',o.head);
}

// ---------- muat model ----------
const loader=T.GLTFLoader?new T.GLTFLoader():null;
function onModel(g){
 tpl=g.scene;
 tpl.traverse(o=>{
  if(o.isMesh){
   o.frustumCulled=false;o.renderOrder=3;
   const m=o.material;
   if(m){m.side=T.DoubleSide;m.shadowSide=T.DoubleSide;if(m.map)m.map.anisotropy=4;
    if(m.normalMap){m.normalScale.set(.85,.85)}
    m.envMapIntensity=.6}
  }
 });
 body.add(tpl);tpl.scale.setScalar(SCALE);
 P.updateMatrixWorld(true);
 rig=rigInfo(tpl);
 ready=true;probe.visible=false;body.position.y=0;
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
let phase=0,face=0,faceT=0;
window.charTick=(dt,t,speed)=>{
 if(!ready){
  // cadangan: probe melayang seperti versi lama
  probe.position.y=1.3+Math.sin(t*2)*.15;
  ring.rotation.z=vel.x*.04;ring.rotation.x=Math.PI/2+vel.z*.04;core.rotation.y=t;core.rotation.x=t*.6;
  aura.material.opacity=.3+Math.sin(t*2)*.1;
  return;
 }
 const bones=rig;
 const move=Math.min(1,speed/6);
 phase+=dt*(2.8+speed*1.35);
 const sw=Math.sin(phase),sw2=-sw;
 const leg=.55*move+.02,arm=.3*move+.04;
 pose(bones,{
  lup:sw*leg,rup:sw2*leg,
  larm:sw2*arm,rarm:sw*arm,
  spine:Math.sin(phase*2)*.025*move,
  head:Math.sin(phase*2+.4)*.03*move-Math.sin(t*.7)*.012
 });
 body.position.y=move>.03?Math.abs(Math.sin(phase))*.09*move:Math.sin(t*1.7)*.02;
 lean.rotation.x=.09*move;
 lean.rotation.z=Math.sin(phase)*.02*move;
 // arah hadap mengikuti gerak
 if(speed>.4)faceT=Math.atan2(vel.x,vel.z);
 let d=faceT-face;d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 face+=d*(1-Math.exp(-dt*9));
 actor.rotation.y=face;
 // aura
 aura.material.opacity=.42+Math.sin(t*2.6)*.12;
 aura.scale.setScalar(1+Math.sin(t*2.6)*.04);
};

// warna pemain (dipakai mode kelas)
window.setPlayerColor=hex=>{
 aura.material.color.set(hex);
 core.material.color.set(hex);core.material.emissive.set(hex);
};

// ---------- versi ringkas untuk avatar pemain lain (mode kelas) ----------
window.charPeer=color=>{
 if(!ready||!tpl||!T.SkeletonUtils)return null;
 const root=T.SkeletonUtils.clone(tpl);root.scale.setScalar(SCALE);
 const holder=new T.Group();holder.add(root);
 const rg=new T.Mesh(new T.TorusGeometry(1.35,.07,8,40),new T.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}));
 rg.rotation.x=-Math.PI/2;rg.position.y=.06;holder.add(rg);
 const bones=rigInfo(root,rig),lean2=new T.Group();
 // pindahkan root ke dalam lean agar bisa condong
 holder.remove(root);lean2.add(root);holder.add(lean2);
 const st={phase:Math.random()*6,face:0,faceT:0};
 return {
  obj:holder,
  update(dt,t,speed,vx,vz){
   st.phase+=dt*(2.8+speed*1.35);
   const mv=Math.min(1,speed/6),sw=Math.sin(st.phase),sw2=-sw,leg=.55*mv+.02,arm=.3*mv+.04;
   pose(bones,{lup:sw*leg,rup:sw2*leg,larm:sw2*arm,rarm:sw*arm,spine:Math.sin(st.phase*2)*.025*mv,head:Math.sin(st.phase*2+.4)*.03*mv});
   root.position.y=mv>.03?Math.abs(Math.sin(st.phase))*.09*mv:Math.sin(t*1.7+st.phase)*.02;
   lean2.rotation.x=.09*mv;
   if(speed>.35)st.faceT=Math.atan2(vx,vz);
   let d=st.faceT-st.face;d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
   st.face+=d*(1-Math.exp(-dt*8));
   holder.rotation.y=st.face;
   rg.material.opacity=.38+Math.sin(t*2.2+st.phase)*.1;
  }
 };
};
})();
