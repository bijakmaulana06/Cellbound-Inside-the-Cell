// CELLBOUND - beranda 3D: Cellcy menyapa (melambai), mengikuti pointer, melompat saat diklik.
(()=>{
const T=THREE,$=id=>document.getElementById(id),cv=$('stage'),box=$('hero3d'),bub=$('bubble'),fb=$('fallback');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let R;try{R=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){return fail()}
function fail(){fb.style.display='block';cv.style.display='none';bub.style.display='none';document.body.classList.add('ready')}
R.setClearColor(0x000000,0);R.setPixelRatio(Math.min(devicePixelRatio||1,2));
const S=new T.Scene(),C=new T.PerspectiveCamera(28,1,.1,60);
// ---------- cahaya ala studio mewah: kunci hangat + rim teal & emas ----------
S.add(new T.HemisphereLight(0xcff6ff,0x25465a,.85));
const key=new T.DirectionalLight(0xfff1dc,1.05);key.position.set(2.2,3.6,4.5);S.add(key);
const rimT=new T.DirectionalLight(0x4ff0d0,.9);rimT.position.set(3,2.2,-3);S.add(rimT);
const rimG=new T.DirectionalLight(0xffc36b,.8);rimG.position.set(-3.2,2,-2.6);S.add(rimG);
// ---------- tekstur bantu ----------
const radial=(stops,sz=128)=>{const c=document.createElement('canvas');c.width=c.height=sz;const g=c.getContext('2d'),r=g.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);stops.forEach(([o,col])=>r.addColorStop(o,col));g.fillStyle=r;g.fillRect(0,0,sz,sz);return new T.CanvasTexture(c)};
const glowTex=radial([[0,'rgba(255,255,255,1)'],[.35,'rgba(255,255,255,.35)'],[1,'rgba(255,255,255,0)']]);
const shadowTex=radial([[0,'rgba(0,0,0,.55)'],[.6,'rgba(0,0,0,.22)'],[1,'rgba(0,0,0,0)']]);
// ---------- panggung: pelataran berkilau + cincin emas ----------
const stage=new T.Group();S.add(stage);
const plat=new T.Mesh(new T.CylinderGeometry(1.35,1.5,.14,72),new T.MeshStandardMaterial({color:0x0b3040,metalness:.35,roughness:.32}));plat.position.y=-.07;stage.add(plat);
const rim=new T.Mesh(new T.TorusGeometry(1.43,.028,12,120),new T.MeshBasicMaterial({color:0xf2c46b}));rim.rotation.x=Math.PI/2;stage.add(rim);
const ringGlow=new T.Mesh(new T.RingGeometry(.95,1.32,80),new T.MeshBasicMaterial({color:0x4ff0d0,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));ringGlow.rotation.x=-Math.PI/2;ringGlow.position.y=.006;stage.add(ringGlow);
const shadow=new T.Mesh(new T.PlaneGeometry(2.6,2.6),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;stage.add(shadow);
const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0x4ff0d0,transparent:true,opacity:.34,blending:T.AdditiveBlending,depthWrite:false}));halo.position.set(0,1.0,-1.4);halo.scale.setScalar(3.6);S.add(halo);
const halo2=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xf2c46b,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false}));halo2.position.set(.4,.4,-1.1);halo2.scale.setScalar(2.4);S.add(halo2);
// ---------- gelembung organel yang mengorbit ----------
const cols=[0x4ff0d0,0xf2c46b,0xff7ad9,0x8fb7ff,0xb6ff4a,0xff9d5c,0xc58bff,0x6bffb0],bubbles=[];
cols.forEach((c,i)=>{const r=.1+(i%3)*.06,m=new T.Mesh(new T.SphereGeometry(r,28,20),new T.MeshPhysicalMaterial({color:c,transparent:true,opacity:.62,roughness:.12,clearcoat:1,clearcoatRoughness:.1,emissive:c,emissiveIntensity:.28}));
 m.userData={a:i/cols.length*6.283,rad:1.4+(i%4)*.2,sp:.22+(i%3)*.07,y:.35+(i*.23)%1.6,ph:i*1.3};S.add(m);bubbles.push(m)});
// ---------- debu emas ----------
const PN=reduce?50:170,pg=new T.BufferGeometry(),pp=new Float32Array(PN*3);
for(let i=0;i<PN;i++){const a=Math.random()*6.283,r=.6+Math.random()*2.8;pp.set([Math.cos(a)*r,Math.random()*3.2,Math.sin(a)*r-.4],i*3)}
pg.setAttribute('position',new T.BufferAttribute(pp,3));
S.add(new T.Points(pg,new T.PointsMaterial({map:glowTex,color:0xffe3a3,size:.085,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false})));
// ---------- percikan saat diklik ----------
const sparks=[];
function burst(x,y,z,n=70){const g=new T.BufferGeometry(),pos=new Float32Array(n*3),vl=[];for(let i=0;i<n;i++){pos.set([x,y,z],i*3);const a=Math.random()*6.283,u=Math.random()*2-1,s=Math.sqrt(1-u*u),sp=1.2+Math.random()*2.2;vl.push(Math.cos(a)*s*sp,Math.abs(u)*sp+.8,Math.sin(a)*s*sp)}
 g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.Points(g,new T.PointsMaterial({map:glowTex,color:Math.random()<.5?0xffe3a3:0x7fffe6,size:.16,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));S.add(m);sparks.push({m,vl,l:0})}
// ---------- Cellcy ----------
let rig=null,hit=null,hopT=1,waveUntil=0,wv=0,lookX=0,lookY=0,tx=0,ty=0,over=null,nextAuto=0,t0=performance.now();
const hitMesh=new T.Mesh(new T.CylinderGeometry(.95,.95,1.9,12),new T.MeshBasicMaterial({visible:false}));hitMesh.position.y=.95;S.add(hitMesh);
function onModel(scene){rig=new CellcyHomeRig(scene);rig.root.position.y=.05;stage.add(rig.root);rig.pose(0,{});document.body.classList.add('ready');
 setTimeout(()=>greet(0),700);nextAuto=performance.now()+9000}
const loader=new T.GLTFLoader();
function load(){
 if(location.protocol==='file:'){const sc=document.createElement('script');sc.src='models/Cellcy.b64.js';
  sc.onload=()=>{try{const b=atob(window.CELLCY_GLB),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);loader.parse(u.buffer,'',g=>onModel(g.scene),fail)}catch(e){fail()}};sc.onerror=fail;document.head.appendChild(sc)}
 else loader.load('models/Cellcy.glb',g=>onModel(g.scene),undefined,fail)}
load();
// ---------- sapaan ----------
const hello=['Halo! 👋','Aku Cellcy, pemandu selmu!','Ayo jelajahi dunia di dalam sel!','Pilih zona atau gabung kelas ya ✨'];let hi=0,bt=0;
function say(txt,ms=3600){clearTimeout(bt);bub.textContent=txt;bub.classList.add('show');bt=setTimeout(()=>bub.classList.remove('show'),ms)}
function wave(sec=2.6){waveUntil=Math.max(waveUntil,performance.now()+sec*1000)}
function hop(){hopT=0;if(rig)burst(0,1.45,0,60)}
function greet(i){say(hello[i%hello.length]);wave(2.8)}
$('sapa').addEventListener('click',()=>{hi=(hi+1)%hello.length;greet(hi);hop()});
// ---------- interaksi ----------
const rc=new T.Raycaster(),mv=new T.Vector2();let px=0,py=0;
function ptr(e){const r=cv.getBoundingClientRect();mv.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
 tx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(innerWidth*.45)));ty=Math.max(-1,Math.min(1,-(e.clientY-(r.top+r.height*.4))/(innerHeight*.45)));px=mv.x;py=mv.y}
addEventListener('pointermove',ptr,{passive:true});
cv.addEventListener('pointerdown',e=>{ptr(e);if(!rig)return;rc.setFromCamera(mv,C);const onHim=rc.intersectObject(hitMesh,false).length>0;
 if(onHim){hi=(hi+1)%hello.length;greet(hi);hop()}else{wave(1.8);burst((mv.x*1.6),1.0+mv.y*.8,0,40)}});
cv.addEventListener('pointerenter',()=>{if(rig&&performance.now()>waveUntil+1500)wave(1.6)});
document.querySelectorAll('[data-say]').forEach(el=>{
 const on=()=>{over={x:-.9,y:.05};say(el.dataset.say,4200);wave(1.4)},off=()=>{over=null};
 el.addEventListener('mouseenter',on);el.addEventListener('mouseleave',off);el.addEventListener('focusin',on);el.addEventListener('focusout',off)});
// ---------- ukuran & loop ----------
function size(){const w=cv.clientWidth||300,h=cv.clientHeight||300;R.setSize(w,h,false);C.aspect=w/h;const tn=Math.tan(14*Math.PI/180);C.userData.d=Math.max(7.8,2.0/(tn*C.aspect));C.updateProjectionMatrix()}
addEventListener('resize',size);size();new ResizeObserver(size).observe(cv);
let last=performance.now(),camx=0,camy=0;
function frame(){requestAnimationFrame(frame);if(document.hidden)return;
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000),t=(now-t0)/1000;last=now;
 const tgx=over?over.x:tx,tgy=over?over.y:ty,k=Math.min(1,dt*5);lookX+=(tgx-lookX)*k;lookY+=(tgy-lookY)*k;
 if(rig){const waving=now<waveUntil;wv+=((waving?1:0)-wv)*Math.min(1,dt*(waving?7:5));
  if(!reduce&&now>nextAuto&&!waving){greet(Math.floor(Math.random()*hello.length));nextAuto=now+7000+Math.random()*4000}
  if(hopT<1)hopT=Math.min(1,hopT+dt/.65);
  rig.pose(t,{wave:wv,lookX:lookX,lookY:lookY,hop:hopT<1?hopT:0});
  rig.root.rotation.y+=((lookX*.28)-rig.root.rotation.y)*Math.min(1,dt*4);
  hitMesh.position.y=.95+(hopT<1?Math.sin(hopT*Math.PI)*.28:0)}
 // dekor
 bubbles.forEach(m=>{const u=m.userData;u.a+=dt*u.sp*(reduce?.3:1);m.position.set(Math.cos(u.a)*u.rad,u.y+Math.sin(t*1.2+u.ph)*.12,Math.sin(u.a)*u.rad*.55-.3)});
 ringGlow.material.opacity=.18+Math.sin(t*2)*.07;ringGlow.rotation.z=t*.15;halo.material.opacity=.3+Math.sin(t*1.3)*.05;
 if(!reduce){for(let i=0;i<PN;i++){pp[i*3+1]+=dt*(.06+(i%5)*.01);if(pp[i*3+1]>3.2)pp[i*3+1]=0}pg.attributes.position.needsUpdate=true}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.l+=dt;const a=s.m.geometry.attributes.position.array;for(let j=0;j<a.length/3;j++){a[j*3]+=s.vl[j*3]*dt;a[j*3+1]+=s.vl[j*3+1]*dt;a[j*3+2]+=s.vl[j*3+2]*dt;s.vl[j*3+1]-=3.2*dt}s.m.geometry.attributes.position.needsUpdate=true;s.m.material.opacity=Math.max(0,1-s.l/1.4);if(s.l>1.4){S.remove(s.m);s.m.geometry.dispose();sparks.splice(i,1)}}
 // kamera: parallax lembut mengikuti pointer
 camx+=(px*.35-camx)*Math.min(1,dt*3);camy+=(py*.18-camy)*Math.min(1,dt*3);
 C.position.set(camx,1.2+camy,C.userData.d);C.lookAt(0,.62,0);R.render(S,C)}
frame();
window.__home={wave,hop,say,get rig(){return rig},set lookNow(v){tx=v.x;ty=v.y}};
})();
