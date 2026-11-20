// CELLBOUND - Zona 2: The Protein Factory (macro 3D, seret langsung di dunia 3D) v2
(()=>{
const BC={A:0xff6b6b,U:0x6bb6ff,T:0x6bb6ff,G:0x6bff9a,C:0xffc66b},PAIR={A:'U',U:'A',G:'C',C:'G'},ee=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const CODONS=[['AUG','Met'],['GCU','Ala'],['AAA','Lys'],['GGA','Gly']],AAC={Met:0xff8a5c,Ala:0x6bff9a,Lys:0x8f8aff,Gly:0xffe27a},AAX=['Ser','Val','Leu','Pro'];
const pair=c=>c.split('').map(b=>PAIR[b]).join(''),shuf=a=>a.slice().sort(()=>Math.random()-.5),V3=(x,y,z)=>new T.Vector3(x,y,z),railY=x=>1.7+Math.sin((x-31.5)*.45)*.8,hex=n=>'#'+n.toString(16).padStart(6,'0');
const hitM=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),FOG=0x0d4a60;
let on=false,S2,C2,stage=0,errs=0,dest='',DRG=[],TW=[],LB=[],SP=[],AN=[],X={},mr,CH,beads=[],tube=null,fold=null,V=null,V2=null,lastAct=0,RO=null;
const cam={p:V3(0,8.8,18),l:V3(0,3.4,0),pf:1},camT={p:cam.p.clone(),l:cam.l.clone(),W:7};
const st=document.createElement('style');st.textContent=`#z2u{position:fixed;inset:0;pointer-events:none;display:none}#z2u>*{pointer-events:auto}
.z2top{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(520px,92vw);background:rgba(6,30,44,.88);border:1px solid #1d5b70;border-radius:14px;padding:10px 16px;text-align:center;font-size:12px;letter-spacing:.08em;color:#4ff0d0}
.z2t{margin-top:4px;letter-spacing:0;font-size:15px;color:#e8fbff;font-weight:600}.z2dots i{display:inline-block;width:26px;height:5px;border-radius:9px;background:#12384a;margin:6px 3px 0}.z2dots i.d{background:#4ff0d0}.z2dots i.c{background:#ffb347}
.z2hint{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(560px,92vw);background:rgba(6,30,44,.92);border:1px solid #ffb347;border-radius:14px;padding:12px 16px;font-size:14px;line-height:1.5;text-align:center}
.z2back{position:fixed;left:12px;top:calc(12px + env(safe-area-inset-top,0px));padding:8px 14px;font-size:13px}
.z2leg{position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top,0px));background:rgba(6,30,44,.88);border:1px solid #1d5b70;border-radius:14px;padding:8px 12px;font-size:12px;line-height:1.7}
.z2leg b{display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:5px;color:#fff;font-size:12px;margin:0 2px}
.z2l{position:fixed;left:0;top:0;pointer-events:none;font-size:12px;font-weight:600;background:rgba(6,30,44,.82);border:1px solid #4ff0d0;color:#e8fbff;padding:3px 10px;border-radius:99px;white-space:nowrap}`;
document.head.appendChild(st);st.textContent+='@media (max-width:640px){.z2leg{padding:5px 8px;font-size:11px;line-height:1.2}.z2leg br{display:none}.z2leg b{width:18px;height:18px;line-height:18px;font-size:11px}.z2top{top:calc(54px + env(safe-area-inset-top,0px));padding:8px 12px}.z2t{font-size:13px}}body.z2 #toast{bottom:calc(var(--z2h,90px) + 34px + env(safe-area-inset-bottom,0px))}';
const ui=document.createElement('div');ui.id='z2u';document.body.appendChild(ui);
const lbs=document.createElement('div');document.body.appendChild(lbs);
const chip=(l)=>`<b style="background:${hex(BC[l])}">${l}</b>`;
function head(n,title,hnt,leg){ui.innerHTML=`<div class="z2top"><b>ZONA 2 · THE PROTEIN FACTORY</b><div class="z2dots">${[1,2,3].map(i=>`<i class="${i<n?'d':i==n?'c':''}"></i>`).join('')}</div><div class="z2t">${title}</div></div><div class="z2hint" id="z2h">${hnt}</div><button class="alt z2back">← Zona 1</button>${leg?`<div class="z2leg">Pasangan basa<br>${chip('A')}↔${chip('U')}<br>${chip('G')}↔${chip('C')}</div>`:''}`;ui.querySelector('.z2back').onclick=exit;const hp=document.getElementById('z2h');if(window.ResizeObserver&&hp){if(RO)RO.disconnect();RO=new ResizeObserver(()=>document.documentElement.style.setProperty('--z2h',hp.offsetHeight+'px'));RO.observe(hp)}}
const hint=h=>{const e=document.getElementById('z2h');if(e)e.innerHTML=h};
const tw=(d,f,done)=>TW.push({t:0,d,f,done}),after=(s,fn)=>tw(s,()=>{},fn);
function lab(txt,t,dy=0){const el=document.createElement('div');el.className='z2l';el.innerHTML=txt;lbs.appendChild(el);const l={el,t,dy};LB.push(l);return l}
const rmLab=l=>{if(l){l.el.remove();LB=LB.filter(x=>x!==l)}};
function M(c,o={}){const cs=o.caustic;delete o.caustic;const m=new T.MeshPhysicalMaterial(Object.assign({color:c,roughness:.55,metalness:0,clearcoat:.2,clearcoatRoughness:.4},o));
 m.customProgramCacheKey=()=>'z2'+(cs?'c':'');
 m.onBeforeCompile=s=>{s.uniforms.uT=TU;s.fragmentShader='uniform float uT;\n'+s.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',`float fr=pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.2);outgoingLight+=diffuseColor.rgb*fr*${cs?'0.0':'0.22'};${cs?'vec2 q=vUv*40.0;float cs=sin(q.x*1.7+uT)+sin(q.y*1.9-uT*1.2)+sin((q.x+q.y)*1.3+uT*.8);cs=pow(max(cs*.33+.5,0.),4.0);outgoingLight+=vec3(.12,.5,.55)*cs*.08;':''}gl_FragColor=vec4(outgoingLight,clamp(diffuseColor.a+fr*.3,0.,1.));`)};return m}
const mesh=(g,m,p,s)=>{const o=new T.Mesh(g,m);if(p)o.position.set(...p);if(s)o.scale.set(...s);return o};
const sph=(r,c,o,seg=24)=>mesh(new T.SphereGeometry(r,seg,Math.round(seg*.7)),M(c,o));
// ---------- bentuk biologis ----------
const LT={};function letTex(l){if(LT[l])return LT[l];const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=hex(BC[l]);g.fillRect(0,0,128,128);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=8;g.strokeRect(6,6,116,116);g.fillStyle='#fff';g.font='800 84px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=6;g.fillText(l,64,70);return LT[l]=new T.CanvasTexture(c)}
function mkBase(l,s=1){const g=new T.Group(),m=M(BC[l],{emissive:BC[l],emissiveIntensity:.15,roughness:.4}),f=new T.MeshPhysicalMaterial({map:letTex(l),roughness:.4,clearcoat:.4});g.add(new T.Mesh(new T.BoxGeometry(.78,.78,.18),[m,m,m,m,f,m]));g.scale.setScalar(s);return g}
function blob(r,seed,amp){if(!amp)return new T.SphereGeometry(r,48,32);const g=new T.IcosahedronGeometry(r,4),p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const k=1+amp*(Math.sin(v.x*2.3+seed)*Math.sin(v.y*2.1+seed*2)+.6*Math.sin(v.z*3.1+seed*3)*Math.cos(v.x*1.7));v.multiplyScalar(k);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
function stick(a,b,r=.05,c=0xb9c7dd){const m=mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),8),M(c));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V3(0,1,0),b.clone().sub(a).normalize());return m}
function mkProtein(){const g=new T.Group(),hm=M(0xff5a6a,{emissive:0x3a0a10,roughness:.35}),bm=M(0xffd24a,{emissive:0x3a2a00,roughness:.35}),lm=M(0xa9bdd0,{roughness:.5});
 const tube=(pts,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(12,pts.length*4),r,10),m);
 const helix=(a,b)=>{const d=b.clone().sub(a),u=V3(1,0,0),v=V3(0,0,1),pts=[];for(let i=0;i<=40;i++){const t=i/40,an=t*6.2832*3.5;pts.push(a.clone().addScaledVector(d,t).addScaledVector(u,Math.cos(an)*.3).addScaledVector(v,Math.sin(an)*.3))}g.add(tube(pts,.11,hm))};
 const arrow=(a,b)=>{const d=b.clone().sub(a),L=d.length(),n=d.clone().normalize(),gr=new T.Group();const bx=mesh(new T.BoxGeometry(L-.35,.07,.34),bm);bx.position.x=-.175;const cn=mesh(new T.ConeGeometry(.3,.42,10),bm);cn.rotation.z=-Math.PI/2;cn.scale.z=.35;cn.position.x=L/2-.21;gr.add(bx,cn);gr.position.copy(a).add(b).multiplyScalar(.5);gr.quaternion.setFromUnitVectors(V3(1,0,0),n);g.add(gr)};
 const loop=(a,b,c)=>g.add(tube([a,c,b],.06,lm));
 helix(V3(-1,.9,0),V3(-1,-.9,.15));helix(V3(0,-1,-.2),V3(0,.9,-.1));helix(V3(1,.9,.1),V3(1,-.8,.2));
 loop(V3(-1,-.9,.15),V3(0,-1,-.2),V3(-.5,-1.3,0));loop(V3(0,.9,-.1),V3(1,.9,.1),V3(.5,1.25,0));
 arrow(V3(-.8,-.2,.95),V3(.8,-.2,.95));arrow(V3(.8,.4,.95),V3(-.8,.4,.95));
 loop(V3(.8,-.2,.95),V3(.8,.4,.95),V3(1.1,.1,1.0));loop(V3(1,-.8,.2),V3(-.8,-.2,.95),V3(.1,-.6,.9));
 const n=sph(.16,0x5a7bff,{},12),c=sph(.16,0xff5a5a,{},12);n.position.set(-1.5,1.25,.3);c.position.set(-.8,.4,.95);g.add(n,c);loop(V3(-1,.9,0),n.position.clone(),V3(-1.25,1.15,.15));return g}
window.mkDNA=function(turns,len,r){const g=new T.Group(),N=turns*14,a=[],b=[],d=new T.Object3D(),col=new T.Color();
 for(let i=0;i<=N;i++){const t=i/N,an=t*turns*6.2832,y=(t-.5)*len;a.push(V3(Math.cos(an)*r,y,Math.sin(an)*r));b.push(V3(Math.cos(an+Math.PI)*r,y,Math.sin(an+Math.PI)*r))}
 g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(a),N*4,.09,8),M(0x4fa8ff,{emissive:0x0a2a6a})),mesh(new T.TubeGeometry(new T.CatmullRomCurve3(b),N*4,.09,8),M(0xff6fa8,{emissive:0x6a1a3a})));
 const mk=()=>new T.InstancedMesh(new T.CylinderGeometry(.07,.07,r,6),M(0xffffff,{roughness:.5}),N+1),h1=mk(),h2=mk(),pairs=[['A','T'],['T','A'],['G','C'],['C','G']];
 for(let i=0;i<=N;i++){const pr=pairs[0|Math.random()*4];[[h1,a[i],pr[0]],[h2,b[i],pr[1]]].forEach(([h,p,l])=>{const c=V3(0,p.y,0),m=p.clone().add(c).multiplyScalar(.5);d.position.copy(m);d.quaternion.setFromUnitVectors(V3(0,1,0),c.clone().sub(p).normalize());d.updateMatrix();h.setMatrixAt(i,d.matrix);h.setColorAt(i,col.set(BC[l]))})}
 g.add(h1,h2);return g};
// ---------- dunia ----------
function build(){
 S2=new T.Scene();S2.background=new T.Color(FOG);S2.fog=new T.FogExp2(FOG,.022);
 C2=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,600);
 S2.add(new T.HemisphereLight(0xcff6ff,0x2a6a80,.95));
 const k=new T.DirectionalLight(0xfff0dd,.8);k.position.set(12,26,14);S2.add(k);
 const rl=new T.DirectionalLight(0x4ff0d0,.5);rl.position.set(-14,8,-16);S2.add(rl);
 const gt=nz2.clone();gt.needsUpdate=true;gt.wrapS=gt.wrapT=T.RepeatWrapping;gt.repeat.set(28,7);
 const gd=mesh(new T.PlaneGeometry(300,80),M(0x1b6b85,{roughness:1,clearcoat:0}),[50,-4.6,0]);gd.rotation.x=-Math.PI/2;S2.add(gd);
 // RE kasar: lembaran bergelombang bertumpuk + ribosom menempel
 const slab=(x,sx,sz,y,sy,col)=>{const g=new T.SphereGeometry(1,72,36),p=g.attributes.position;for(let i=0;i<p.count;i++){const X=p.getX(i),Y=p.getY(i),Z=p.getZ(i);if(Y>0)p.setY(i,Y+.12*Math.sin(X*sx*.55)*Math.cos(Z*sz*.7)*Y)}g.computeVertexNormals();S2.add(mesh(g,M(col,{transparent:true,opacity:.93,roughness:.4}),[x,y,0],[sx,sy,sz]))};
 for(const[x,sx,sz]of[[0,13.5,7.5],[26,9.5,6.8]]){slab(x,sx,sz,-.8,1.1,0x3d7fd6);slab(x,sx,sz,-2.4,.7,0x3470c6);slab(x,sx,sz,-3.8,.7,0x2c5fae)}
 const rib=new T.InstancedMesh(blob(.4,3,0),M(0xf0b445,{emissive:0x4a3000}),80),d=new T.Object3D();
 for(let i=0;i<80;i++){let x,z,inn;do{const cx=i<60?0:26,sx=i<60?12:8,sz=i<60?6.5:5.8;x=cx+(Math.random()*2-1)*sx;z=(Math.random()*2-1)*sz;inn=((x-cx)/(sx+1))**2+(z/(sz+1))**2}while(inn>.9||(i<60&&Math.abs(x)<3.6&&Math.abs(z)<3)||(i>=60&&Math.abs(x-26)<2.6&&Math.abs(z)<2.6));
  d.position.set(x,-.8+1.1*Math.sqrt(Math.max(0,1-inn*.8))*.9,z);d.rotation.set(Math.random()*6,Math.random()*6,0);d.updateMatrix();rib.setMatrixAt(i,d.matrix)}S2.add(rib);
 // ribosom utama: dua subunit organik
 const sub=(y,sx,sy,sz,col,seed)=>{const m=mesh(blob(1,seed,0),M(col,{emissive:0x3a2600,roughness:.55,bumpScale:2.2}),[0,y,0],[sx,sy,sz]);S2.add(m);};
 sub(1.9,2.3,1.3,1.8,0xe0983f,1);sub(5.0,1.8,.95,1.5,0xf4cf5e,2);
 // mRNA: untai tunggal dengan basa berhuruf
 mr=new T.Group();const HR=.62,PX=3.4,hel=x=>[3.55+HR*Math.cos(x*6.2832/PX),HR*Math.sin(x*6.2832/PX)];
 const pts=[];for(let x=-14;x<=30;x+=.25){const[y,z]=hel(x);pts.push(V3(x,y,z))}
 mr.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),pts.length*2,.11,8),M(0xb9c7dd,{emissive:0x1a2a44,bumpScale:.4})));
 const seq=[];for(let c=-3;c<=7;c++){const cod=c>=0&&c<=4?(c<4?CODONS[c][0]:'UAA'):shuf(['A','U','G','C']).slice(0,3).join('');for(let j=0;j<3;j++)seq.push([c*3.4+(j-1)*1.0,cod[j],c>=0&&c<=4])}
 seq.forEach(([x,l,main])=>{const b=mkBase(l,main?1:.85);b.position.set(x,3.55,.7);mr.add(b);const[y,z]=hel(x);mr.add(stick(V3(x,3.55,.62),V3(x,y,z)));const f=sph(.14,0xffb347,{},10);f.position.set(x,y,z);mr.add(f)});S2.add(mr);
 // bingkai situs A
 X.fr=new T.Group();[[0,.7,3.5,.07],[0,-.7,3.5,.07],[-1.75,0,.07,1.4],[1.75,0,.07,1.4]].forEach(([x,y,w,h])=>X.fr.add(mesh(new T.BoxGeometry(w,h,.1),new T.MeshBasicMaterial({color:0xffb347}),[x,y,0])));X.fr.position.set(0,3.55,.75);S2.add(X.fr);
 CH=new T.Group();CH.position.set(-4.55,5.15,.5);S2.add(CH);beads=[];tube=null;fold=null;
 const tl=mesh(new T.TorusGeometry(1.5,.34,16,40),M(0xffd34d,{emissive:0x7a5200,emissiveIntensity:.8}),[26,.5,0]);tl.rotation.x=Math.PI/2;S2.add(tl);
 // Golgi: sisterna tipis melengkung
 for(let i=0;i<5;i++){const q=Math.abs(i-2),g=new T.SphereGeometry(1,48,32);g.scale(.22,3.1-q*.25,2.6-q*.2);const p=g.attributes.position;for(let j=0;j<p.count;j++)p.setX(j,p.getX(j)+.06*(p.getY(j)**2*.5+p.getZ(j)**2*.5));g.computeVertexNormals();
  S2.add(mesh(g,M(new T.Color(0xff9a5c).lerp(new T.Color(0xffd9a0),i/4),{transparent:true,opacity:.92,emissive:0x5a2a08,roughness:.35}),[54+i*3.2,2.4,0]))}
 for(let i=0;i<12;i++)S2.add(sph(.28+Math.random()*.2,0xffe6b0,{transparent:true,opacity:.65},14)).children.at(-1).position.set(52+Math.random()*17,Math.random()*5.4-.3,(Math.random()*2-1)*4.4);
 const lis=new T.Group();lis.position.set(79,6,-1);lis.add(sph(2.4,0xb6ff4a,{transparent:true,opacity:.55,emissive:0x2a5a08},32));
 for(let i=0;i<7;i++){const q=sph(.26,0x7fcf3a,{},12);q.position.copy(rd()).multiplyScalar(1.2+Math.random()*.7);lis.add(q)}S2.add(lis);
 // membran sel: bilayer dengan kepala + ekor
 const nH=1200,hd=new T.InstancedMesh(new T.SphereGeometry(.34,12,10),M(0xffb36b,{emissive:0x5a2a08}),nH),tl2=new T.InstancedMesh(new T.CylinderGeometry(.07,.07,1.05,6),M(0xffe6b0),nH);let n=0;
 for(const[x,sg]of[[92.2,1],[95,-1]])for(let y=-2;y<8.2;y+=.8)for(let z=-9;z<9;z+=.8)if(n<nH){d.rotation.set(0,0,0);d.position.set(x,y,z);d.updateMatrix();hd.setMatrixAt(n,d.matrix);d.position.set(x+sg*.62,y,z);d.rotation.set(0,0,Math.PI/2);d.updateMatrix();tl2.setMatrixAt(n++,d.matrix)}
 S2.add(hd,tl2);S2.add(mesh(new T.BoxGeometry(2.6,10.4,18),M(0x4ff0d0,{transparent:true,opacity:.1,depthWrite:false,clearcoat:0}),[93.6,3.1,0]));
 const PN=250,pg=new T.BufferGeometry(),pp=new Float32Array(PN*3);for(let i=0;i<PN;i++)pp.set([-20+Math.random()*130,-1+Math.random()*14,-14+Math.random()*24],i*3);
 pg.setAttribute('position',new T.BufferAttribute(pp,3));S2.add(new T.Points(pg,new T.PointsMaterial({color:0x9ffff0,size:.12,transparent:true,opacity:.5,depthWrite:false})));
 AN.length=0;AN.push((t,dt)=>{for(let i=0;i<PN;i++){pp[i*3+1]+=dt*.12;if(pp[i*3+1]>13)pp[i*3+1]=-1;pp[i*3]+=Math.sin(t+i)*dt*.2}pg.attributes.position.needsUpdate=true});
 for(let i=0;i<24;i++){const s=new T.Sprite(new T.SpriteMaterial({map:bt,color:i%3?0x6ffff0:0xffd9a0,transparent:true,opacity:.03+Math.random()*.035,blending:T.AdditiveBlending,depthWrite:false}));s.position.set(-10+Math.random()*115,1+Math.random()*7,-8-Math.random()*6);s.scale.setScalar(2+Math.random()*4);S2.add(s)}
}
// ---------- drag ----------
const el=R.domElement,rc=new T.Raycaster(),mv=new T.Vector2(),pl=new T.Plane(),pt=new T.Vector3(),off=new T.Vector3();let drag=null;
function ray(e){const r=el.getBoundingClientRect();mv.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);rc.setFromCamera(mv,C2)}
const hits=()=>rc.intersectObjects(DRG.filter(d=>!d.lock).map(d=>d.hit),false)[0];
function mkDrag(obj,r,o){const h=new T.Mesh(new T.SphereGeometry(r,10,8),hitM);if(o&&o.hc)h.position.copy(o.hc);obj.add(h);const d=Object.assign({obj,hit:h,home:obj.position.clone(),lock:false,ph:Math.random()*6},o);h.userData.d=d;DRG.push(d);return d}
el.addEventListener('pointerdown',e=>{if(!on)return;lastAct=performance.now();ray(e);const h=hits();if(!h)return;const d=h.object.userData.d;drag=d;d.moved=false;d.start=d.obj.position.clone();pl.set(V3(0,0,1),-d.obj.position.z);rc.ray.intersectPlane(pl,pt);off.copy(d.obj.position).sub(pt);d.dragging=true;el.style.cursor='grabbing';try{el.setPointerCapture(e.pointerId)}catch{}});
el.addEventListener('pointermove',e=>{if(!on)return;ray(e);if(!drag){el.style.cursor=hits()?'grab':'';return}
 if(!rc.ray.intersectPlane(pl,pt))return;const p=pt.clone().add(off),o=drag.obj;if(drag.rail){const x=Math.min(51.8,Math.max(31.5,p.x));o.position.set(x,railY(x),0)}else{o.position.x=p.x;o.position.y=Math.max(-.5,p.y)}if(o.position.distanceTo(drag.start)>.4)drag.moved=true});
const up=()=>{if(!drag)return;const d=drag;drag=null;d.dragging=false;el.style.cursor='';lastAct=performance.now();if(!d.moved){d.obj.position.copy(d.start);return}if(d.drop&&d.drop(d))return;back(d)};
el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
function back(d){const f=d.obj.position.clone();d.busy=true;tw(.5,k=>d.obj.position.lerpVectors(f,d.home,ee(k)),()=>d.busy=false)}
// ---------- efek ----------
function spark(p,col,n,dx){const g=new T.BufferGeometry(),pos=new Float32Array(n*3),vl=[];for(let i=0;i<n;i++){pos.set([p.x,p.y,p.z],i*3);const q=rd();vl.push(q.x*5+dx,Math.abs(q.y)*4+1,q.z*5)}
 g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.Points(g,new T.PointsMaterial({color:col,size:.35,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));S2.add(m);SP.push({m,vl,l:0})}
function ring(p,r,col=0xffb347){const m=mesh(new T.TorusGeometry(r,.08,8,48),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.8}),[p.x,p.y,p.z]);S2.add(m);const f=(t)=>{m.scale.setScalar(1+Math.sin(t*4)*.07);m.material.opacity=.55+Math.sin(t*4)*.3};AN.push(f);m.userData.f=f;return m}
const rmRing=m=>{if(m){S2.remove(m);AN.splice(AN.indexOf(m.userData.f),1)}};
const camTo=(px,py,pz,lx,ly,lz,W=7)=>{camT.p.set(px,py,pz);camT.l.set(lx,ly,lz);camT.W=W};
const setFr=c=>X.fr&&X.fr.children.forEach(m=>m.material.color.set(c));
// ---------- TAHAP 1: translasi ----------
const A_SITE=V3(0,3.1,.9),DOCK=V3(0,4.4,2.1);
function mkT(an,aa,col){const g=new T.Group(),tm=M(0x6fd0e8,{emissive:0x0a3a55,roughness:.35}),tb=(pts,r)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,r,10),tm);
 g.add(tb([V3(0,1.7,0),V3(0,.9,0),V3(0,.1,0),V3(0,-.7,0),V3(0,-1.1,0)],.13),tb(Array.from({length:21},(_,i)=>{const x=-1.5+i*.15;return V3(x,-1.6+.5*Math.cos(x*3.1416),.5*Math.sin(x*3.1416))}),.09));
 [-1,1].forEach(s=>{g.add(tb([V3(0,.35,0),V3(s*.55,.5,0),V3(s*1.0,.25,0),V3(s*.75,-.1,0),V3(s*.3,.02,0)],.09));const q=sph(.2,0x9fe6f5,{emissive:0x0a3a55},14);q.position.set(s*1.0,.25,0);g.add(q)});
 const b=sph(.5,col,{emissive:col,emissiveIntensity:.35});b.position.y=2.15;g.add(b);
 for(let j=0;j<3;j++){const p=mkBase(an[j]);p.position.set((j-1)*1.0,-1.6,0);g.add(p,stick(V3((j-1)*1,-1.6,-.06),V3((j-1)*1,-1.6+.5*Math.cos((j-1)*3.1416),0),.05,0x6fd0e8))}return g}
function s1(){stage=1;errs=0;head(1,'Tahap 1 · Penerjemahan (translasi)','Cocokkan huruf: seret <b>tRNA</b> yang huruf bawahnya <b>berpasangan</b> dengan <b>kodon di bingkai oranye</b> ke ribosom. Bingkai menyala <b style="color:#6bff9a">hijau</b> bila cocok, <b style="color:#ff6b6b">merah</b> bila salah.',1);camTo(0,9.8,20.5,0,4.6,0,9.6);cod(0)}
function cod(i){if(i>=4)return stop();X.i=i;const[c,aa]=CODONS[i],an=pair(c);rmLab(X.cl);X.cl=lab(`Kodon <b>${c}</b> (cari: <b>${an}</b>)`,V3(0,5.1,.7));setFr(0xffb347);
 const pool=shuf(['UAG','CGU','AAA','GCU','UUC','CCA','GGA','UAC','CGA','UUU','CCU','AUG','GGC','CAU'].filter(a=>a!==an&&a!==c&&!a.split('').every((b,j)=>b===an[j]))).slice(0,2);
 const o=shuf([[an,aa,true],[pool[0],AAX[0|Math.random()*4],false],[pool[1],AAX[0|Math.random()*4],false]]);DRG=[];
 o.forEach(([a,x,ok],j)=>{const g=mkT(a,x,AAC[x]||0xdddddd);g.position.set(-6.4+j*6.4,7.3,2.8);g.userData.rs=.85;g.scale.setScalar(.01);S2.add(g);tw(.6,k=>g.scale.setScalar(Math.max(.01,.85*ee(k))));
  const l=lab(`tRNA · ${x}`,g,2.3);mkDrag(g,2.3,{ok,an:a,aa:x,lab:l,bob:1,hc:V3(0,.3,0),tgt:()=>A_SITE,near:()=>{const p=g.position;return Math.hypot(p.x,p.y-3.1)<2.6},drop:d=>{const p=d.obj.position;if(Math.hypot(p.x,p.y-3.1)>2.6)return false;
   if(!d.ok){errs++;lastAct=-1e9;toast(`❌ Antikodon <b>${d.an}</b> tidak berpasangan dengan kodon <b>${c}</b>. Pasangan yang benar: <b>${an}</b> (A↔U, G↔C). Coba tRNA yang berdenyut.`,true,4800);return false}accept(d,i,aa);return true}})})}
function accept(d,i,aa){DRG.forEach(x=>x.lock=true);setFr(0x6bff9a);const f=d.obj.position.clone();tw(.45,k=>d.obj.position.lerpVectors(f,DOCK,ee(k)),()=>{
 for(let j=0;j<3;j++){const a=V3((j-1)*1.0,3.55,.7),b=V3((j-1)*1.0,2.8,2.1),m=mesh(new T.CylinderGeometry(.04,.04,a.distanceTo(b),6),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8}),[(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2]);m.quaternion.setFromUnitVectors(V3(0,1,0),b.clone().sub(a).normalize());S2.add(m);tw(1.6,k=>m.material.opacity=.8*(1-k),()=>S2.remove(m))}
 const k0=beads.length,col=AAC[aa],b=sph(.42,col,{emissive:col,emissiveIntensity:.3});CH.add(b);const w=d.obj.localToWorld(V3(0,2.15,0));b.position.copy(CH.worldToLocal(w));beads.push(b);
 const from=b.position.clone(),to=V3(1.35-k0*.9,k0*.35+Math.sin(k0*1.3)*.35-.55,k0*.05);tw(.9,k=>b.position.lerpVectors(from,to,ee(k)),rebuild);
 toast(`✅ Benar! ${CODONS[i][0]} ↔ ${d.an}: asam amino <b>${aa}</b> ditambahkan ke rantai polipeptida.`,false,2800);spark(w,col,30,0);
 after(1.0,()=>{DRG.forEach(x=>{rmLab(x.lab);const o=x.obj;tw(.5,k=>o.scale.setScalar(Math.max(.001,1-ee(k))),()=>S2.remove(o))});const x0=mr.position.x;tw(1,k=>mr.position.x=x0-3.4*ee(k),()=>cod(i+1))})})}
function rebuild(){if(tube){CH.remove(tube);tube.geometry.dispose()}if(beads.length>1){tube=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(beads.map(b=>b.position.clone())),40,.1,8),M(0xe6e6ff,{bumpScale:.3}));CH.add(tube)}}
function stop(){setFr(0xff6b6b);rmLab(X.cl);X.cl=lab('Kodon <b>UAA</b> = STOP (tidak ada tRNA)',V3(0,5.1,.7));hint('Kodon <b>STOP</b>: faktor pelepas memutus rantai. <b>Polipeptida</b> lepas dari ribosom!');
 after(1.8,()=>{rmLab(X.cl);const f=CH.position.clone(),to=V3(26,5.0,3.4);camTo(26,8,15,26,2.8,0);tw(2,k=>{const e=ee(k);CH.position.lerpVectors(f,to,e);CH.position.y+=Math.sin(e*Math.PI)*2},s2)})}
// ---------- TAHAP 2 ----------
function s2(){stage=2;head(2,'Tahap 2 · RE kasar: translokasi, pelipatan, vesikel','Seret <b>polipeptida</b> ke <b>translokon</b> (cincin emas) pada membran RE kasar agar masuk ke lumen RE.');X.ring=ring(V3(26,.9,0),2.2);
 X.cl=lab('Polipeptida',CH,1.2);mkDrag(CH,3,{hc:V3(0,.5,0),tgt:()=>V3(26,.9,0),bob:1,drop:d=>{const p=d.obj.position;if(Math.hypot(p.x-26,p.y-.9)>3.2)return false;enter(d);return true}})}
function enter(d){d.lock=true;rmRing(X.ring);rmLab(X.cl);const f=CH.position.clone();hint('Protein masuk ke lumen RE. Di sini ia <b>dilipat</b> menjadi struktur 3D oleh <b>chaperone</b>.');
 tw(1.4,k=>{CH.position.lerpVectors(f,V3(26,1.7,.2),ee(k));CH.scale.setScalar(1-.4*ee(k))},()=>{
  fold=mkProtein();fold.scale.setScalar(.01);CH.add(fold);X.fl=lab('Pelipatan protein',CH,2.0);
  tw(1.5,k=>{const e=ee(k);fold.scale.setScalar(Math.max(.01,1.5*e));beads.forEach(b=>b.scale.setScalar(Math.max(.001,1-e)));if(tube)tube.scale.setScalar(Math.max(.001,1-e))},()=>{beads.forEach(b=>CH.remove(b));if(tube)CH.remove(tube);bud()})})}
function bud(){V=new T.Group();V.position.set(31.5,1.7,0);V.add(sph(1.8,0xbfe8ff,{transparent:true,opacity:.34,emissive:0x1a4a6a,clearcoat:1,depthWrite:false},32));V.scale.setScalar(.01);S2.add(V);rmLab(X.fl);X.vl=lab('Vesikel transpor',V,2.6);
 tw(1.3,k=>V.scale.setScalar(Math.max(.01,ee(k))),()=>{const f=CH.position.clone();tw(.9,k=>CH.position.lerpVectors(f,V.position,ee(k)),()=>{V.attach(CH);rail()})})}
function rail(){hint('Seret <b>vesikel</b> menyusuri jalur menuju <b>sisi cis badan Golgi</b>.');camTo(41,9,31,41,1.8,0,12.5);
 const pts=[];for(let x=31.5;x<=52;x+=.5)pts.push(V3(x,railY(x),0));const rt=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),80,.08,6),new T.MeshBasicMaterial({color:0x4ff0d0,transparent:true,opacity:.5}));S2.add(rt);
 for(let i=0;i<5;i++){const s=mesh(new T.SphereGeometry(.18,10,8),new T.MeshBasicMaterial({color:0x9ffff0}));S2.add(s);AN.push(t=>{const x=31.5+((t*3+i*4)%20.5);s.position.set(x,railY(x),0)})}
 X.rls=[lab('Retikulum Endoplasma',V3(26,3.2,-.5)),lab('Badan Golgi',V3(58,6.4,0))];
 mkDrag(V,2.4,{rail:true,tgt:()=>V3(52,railY(52),0),drop:d=>{if(d.obj.position.x<49.5)return true;arrive(d);return true}})}
// ---------- TAHAP 3 ----------
function arrive(d){d.lock=true;rmLab(X.vl);(X.rls||[]).forEach(rmLab);const f=V.position.clone();tw(.7,k=>V.position.lerpVectors(f,V3(53.5,2.2,0),ee(k)),()=>{
 tw(.7,k=>V.scale.setScalar(Math.max(.001,1-ee(k))),()=>{S2.remove(V);S2.attach(CH);CH.scale.setScalar(.6);spark(V3(54,2.2,0),0xffd9a0,40,2);toast('Vesikel menyatu dengan sisterna Golgi (sisi cis).',false,2600);golgi()})})}
function golgi(){stage=3;head(3,'Tahap 3 · Badan Golgi: modifikasi & pengiriman','Seret <b>2 gugus gula</b> (biru) ke <b>situs pengikat</b> yang berdenyut pada protein: ini <b>glikosilasi</b>.');camTo(60,8.5,19,60,2.8,0,6.5);
 const f=CH.position.clone();tw(2,k=>{const e=ee(k);CH.position.set(f.x+(60-f.x)*e,f.y+(3.4-f.y)*e,f.z+(3.4-f.z)*e);CH.scale.setScalar(.6+.7*e)},()=>{
  const socks=[V3(1.25,.3,.7),V3(-1.15,.55,.6)].map(p=>{const r=mesh(new T.TorusGeometry(.42,.08,8,28),new T.MeshBasicMaterial({color:0xffffff}),[p.x,p.y,p.z]);CH.add(r);r.userData.f=false;AN.push(t=>{if(!r.userData.f)r.scale.setScalar(1+Math.sin(t*5)*.15)});return r});
  X.fl=lab('Protein di Golgi',V3(60,6.2,3.4));let filled=0;
  [57,63].forEach(x=>{const t=mesh(new T.DodecahedronGeometry(.65),M(0x59a8ff,{emissive:0x1a4a8a,emissiveIntensity:.7}),[x,1.5,3.8]);S2.add(t);const l=lab('gugus gula',t,1.4);
   mkDrag(t,1.5,{bob:1,hc:V3(0,0,0),lab:l,tgt:()=>{const s=socks.find(s=>!s.userData.f)||socks[0];return CH.localToWorld(s.position.clone())},drop:d=>{
    for(const s of socks){if(s.userData.f)continue;const w=CH.localToWorld(s.position.clone());if(Math.hypot(d.obj.position.x-w.x,d.obj.position.y-w.y)<2.6){s.userData.f=true;d.lock=true;rmLab(l);CH.attach(d.obj);d.obj.position.copy(s.position);d.obj.scale.setScalar(.45);spark(w,0x59a8ff,20,0);if(++filled===2)glyco();return true}}return false}})})})}
function glyco(){toast('✅ Glikosilasi selesai! Protein sudah dimodifikasi dan siap dikemas.',false,2800);rmLab(X.fl);
 after(1.5,()=>{V2=new T.Group();V2.position.set(67.8,2.4,0);V2.add(sph(1.7,0xbfe8ff,{transparent:true,opacity:.34,emissive:0x1a4a6a,clearcoat:1,depthWrite:false},32));V2.scale.setScalar(.01);S2.add(V2);
  tw(1.2,k=>V2.scale.setScalar(Math.max(.01,ee(k))),()=>{const f=CH.position.clone(),sc=CH.scale.x;tw(1,k=>{CH.position.lerpVectors(f,V2.position,ee(k));CH.scale.setScalar(sc+(.38-sc)*ee(k))},()=>{V2.attach(CH);sort()})})})}
function sort(){dest=Math.random()<.5?'lisosom':'membran';camTo(80,11,34,80,3.5,0,16.5);
 hint(dest==='lisosom'?'Vesikel baru terbentuk di sisi <b>trans</b>. Protein ini adalah <b>enzim pencernaan</b> untuk mencerna sampah sel, jadi tujuannya <b style="color:#9bff4a">LISOSOM (hijau)</b> di dalam sel. Seret vesikel ke sana!':'Vesikel baru terbentuk di sisi <b>trans</b>. Protein ini adalah <b>hormon</b> yang harus dikeluarkan dari sel, jadi tujuannya <b style="color:#4ff0d0">MEMBRAN SEL (biru)</b> lalu keluar sel. Seret vesikel ke sana!');
 const nar=innerWidth<640;X.sg=[lab('<span style="color:#9bff4a">●</span> LISOSOM'+(nar?'':' · mencerna sampah sel'),V3(79,9.6,-1)),lab('<span style="color:#4ff0d0">●</span> MEMBRAN SEL'+(nar?'':' · keluar dari sel'),V3(92,9.4,0)),lab(nar?'LUAR →':'LUAR SEL →',V3(101,3.5,0))];const gl=new T.Sprite(new T.SpriteMaterial({map:bt,color:0xcff6ff,transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false}));gl.position.set(108,3,0);gl.scale.setScalar(44);S2.add(gl);
 guide(V3(69.8,2.4,0),V3(79,6,-1),0x9bff4a);guide(V3(69.8,2.4,0),V3(90.5,2.4,0),0x4ff0d0);X.r1=ring(V3(79,6,-1),3.4,0x9bff4a);X.r2=ring(V3(92,2.4,0),3.4,0x4ff0d0);X.r2.rotation.y=Math.PI/2;
 mkDrag(V2,2.2,{tgt:()=>dest==='lisosom'?V3(79,6,-1):V3(92,2.4,0),drop:d=>{const p=d.obj.position;let where=null;if(Math.hypot(p.x-79,p.y-6)<4.2)where='lisosom';else if(Math.hypot(p.x-92,p.y-2.4)<4.2)where='membran';if(!where)return false;
  if(where!==dest){errs++;lastAct=-1e9;toast(where==='lisosom'?'❌ Lisosom akan <b>mencerna</b> hormon ini. Hormon harus dikeluarkan lewat <b>membran sel</b> (eksositosis).':'❌ Enzim pencernaan harus ke <b>lisosom</b>, bukan dikeluarkan dari sel.',true,4800);return false}deliver(d,where);return true}})}
function guide(a,b,col){const dots=[];for(let i=0;i<9;i++){const q=mesh(new T.SphereGeometry(.17,8,6),new T.MeshBasicMaterial({color:col}));S2.add(q);dots.push(q)}const f=t=>dots.forEach((q,i)=>q.position.lerpVectors(a,b,(t*.22+i/9)%1));AN.push(f);(X.gd=X.gd||[]).push({f,dots})}
function deliver(d,where){d.lock=true;rmRing(X.r1);rmRing(X.r2);(X.gd||[]).forEach(g=>{AN.splice(AN.indexOf(g.f),1);g.dots.forEach(q=>S2.remove(q))});(X.sg||[]).forEach(rmLab);const f=V2.position.clone(),to=where==='lisosom'?V3(79,6,-1):V3(91.4,2.4,0);
 tw(1.4,k=>V2.position.lerpVectors(f,to,ee(k)),()=>{tw(.8,k=>V2.scale.setScalar(Math.max(.001,1-ee(k))),()=>{S2.remove(V2);
  if(where==='lisosom'){spark(to,0xb6ff4a,70,0);spark(to,0x7fffa0,40,0);toast('Vesikel menyatu dengan lisosom: enzim aktif mencerna sampah sel.',false,3200);hint('<b>Fusi dengan lisosom</b>: enzim hidrolitik dilepas di dalam lisosom.')}
  else{spark(to,0xffd9a0,80,7);toast('Eksositosis: vesikel menyatu dengan membran dan melepas hormon ke luar sel.',false,3200);hint('<b>Eksositosis</b>: isi vesikel dilepas ke luar sel.')}
  after(3.2,finish)})})}
function finish(){const sc=Math.max(30,100-errs*10);card(`<span class="tag">ZONA 2 SELESAI</span><h2>Skor ${sc}/100</h2><p>Jalur protein yang kamu bangun: <b>ribosom → RE kasar → vesikel → Golgi → vesikel → ${dest==='membran'?'membran sel (eksositosis)':'lisosom'}</b>.</p><p class="fact">Salah pasang/tujuan: ${errs} kali. Antikodon berpasangan dengan kodon (A↔U, G↔C); Golgi memodifikasi lalu menyortir protein ke tujuannya.</p><div class="row"><button class="alt" id="z2re">Main lagi</button><button id="z2ex">Kembali ke Zona 1</button></div>`);
 $('z2re').onclick=()=>{close();start()};$('z2ex').onclick=()=>{close();exit()}}
// ---------- siklus ----------
function start(){if(MP){toast('Zona 2 belum tersedia di mode kelas.',true);return}
 TW.length=0;DRG=[];LB.forEach(l=>l.el.remove());LB=[];SP=[];X={};beads=[];tube=null;fold=null;V=V2=null;drag=null;AN.length=0;build();on=true;phase='z2';document.body.classList.add('z2');close();lastAct=performance.now();
 ['hud','lbls','act','q','help','emo'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='none'});ui.style.display='block';cam.p.set(0,10,21);cam.l.set(0,3.4,0);s1()}
function exit(){on=false;phase='explore';document.body.classList.remove('z2');if(RO)RO.disconnect();TW.length=0;LB.forEach(l=>l.el.remove());LB=[];ui.style.display='none';const cp=comp&&comp.passes[0];if(cp){cp.scene=S;cp.camera=C}
 ['hud','lbls','help'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display=''});$('lbls').style.display='block'}
window.startZone2=start;
window.z2dbg={sort(d){TW.length=0;DRG=[];V2=new T.Group();V2.position.set(67.8,2.4,0);V2.add(sph(1.7,0xbfe8ff,{transparent:true,opacity:.34,emissive:0x1a4a6a,clearcoat:1,depthWrite:false},32));const pr=mkProtein();pr.scale.setScalar(.5);V2.add(pr);S2.add(V2);stage=3;head(3,'Tahap 3 · Badan Golgi','');dest=d||'membran';cam.p.set(80,11,34);cam.l.set(80,3.5,0);sort();dest=d||'membran';hint(dest==='lisosom'?'Protein ini adalah <b>enzim pencernaan</b>, jadi tujuannya <b style="color:#9bff4a">LISOSOM (hijau)</b>.':'Protein ini adalah <b>hormon</b>, jadi tujuannya <b style="color:#4ff0d0">MEMBRAN SEL (biru)</b> lalu keluar sel.')},skip1(){TW.length=0;DRG=[];rmLab(X.cl);X.cl=null;setFr(0x6bff9a);
 [['Met',0],['Ala',1],['Lys',2],['Gly',3]].forEach(([aa,k])=>{const col=AAC[aa],b=sph(.42,col,{emissive:col,emissiveIntensity:.3});CH.add(b);b.position.set(1.35-k*.9,k*.35+Math.sin(k*1.3)*.35-.55,k*.05);beads.push(b)});rebuild();
 CH.position.set(26,5.0,3.4);camTo(26,8,15,26,2.8,0);s2()}};
const tv=new T.Vector3();
window.z2render=(dt,t)=>{if(!on||!S2)return false;TU.value=t;
 for(let i=TW.length-1;i>=0;i--){const a=TW[i];a.t+=dt*(window.z2speed||1);const k=Math.min(1,a.t/a.d);a.f(k);if(k>=1){TW.splice(i,1);a.done&&a.done()}}
 AN.forEach(f=>f(t,dt));
 const idle=performance.now()-lastAct>9000;
 for(const d of DRG){if(d.lock||d.dragging||d.busy)continue;if(d.bob)d.obj.position.y=d.home.y+Math.sin(t*1.6+d.ph)*.22;
  if(idle&&d.ok!==false){const rs=d.obj.userData.rs||1;d.obj.scale.setScalar(rs*(1+.12*Math.sin(t*6)));d.pp=true}else if(d.pp){d.obj.scale.setScalar(d.obj.userData.rs||1);d.pp=false}}
 if(stage===1&&X.fr){const dg=DRG.find(d=>d.dragging&&d.near);if(dg&&dg.near())setFr(dg.ok?0x6bff9a:0xff6b6b);else if(!DRG.some(d=>d.lock))setFr(0xffb347);X.fr.scale.setScalar(1+Math.sin(t*4)*.015)}
 for(let i=SP.length-1;i>=0;i--){const s=SP[i];s.l+=dt;const a=s.m.geometry.attributes.position.array;for(let j=0;j<a.length/3;j++){a[j*3]+=s.vl[j*3]*dt;a[j*3+1]+=s.vl[j*3+1]*dt;a[j*3+2]+=s.vl[j*3+2]*dt;s.vl[j*3+1]-=6*dt}s.m.geometry.attributes.position.needsUpdate=true;s.m.material.opacity=Math.max(0,1-s.l/1.8);if(s.l>1.8){S2.remove(s.m);SP.splice(i,1)}}
 if(fold)fold.rotation.y+=dt*.5;if(V)V.rotation.y+=dt*.2;
 const e=1-Math.exp(-dt*2.2*(window.z2speed||1));cam.p.lerp(camT.p,e);cam.l.lerp(camT.l,e);const asp=innerWidth/innerHeight,D=camT.p.distanceTo(camT.l),need=Math.min(2.4,Math.max(1,camT.W/(.445*D*asp)));cam.pf+=(need-cam.pf)*e;S2.fog.density=.022/Math.max(1,cam.pf);C2.position.set(cam.l.x+(cam.p.x-cam.l.x)*cam.pf+Math.sin(t*.3)*.25,cam.l.y+(cam.p.y-cam.l.y)*cam.pf+Math.sin(t*.4)*.15,cam.l.z+(cam.p.z-cam.l.z)*cam.pf);C2.lookAt(cam.l);
 for(const l of LB){(l.t.isVector3?tv.copy(l.t):l.t.getWorldPosition(tv));tv.y+=l.dy;tv.project(C2);l.el.style.display=tv.z<1?'block':'none';l.el.style.transform=`translate(${(tv.x*.5+.5)*innerWidth}px,${(-tv.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`}
 const cp=comp&&comp.passes[0];if(cp){cp.scene=S2;cp.camera=C2;comp.render()}else R.render(S2,C2);return true};
window.z2info=()=>({stage,errs,dest,drags:DRG.filter(d=>!d.lock&&!d.busy).map(d=>{const p=d.obj.position.clone().project(C2),q=d.tgt?d.tgt().clone().project(C2):p;return{ok:d.ok!==false,sx:(p.x*.5+.5)*innerWidth,sy:(-p.y*.5+.5)*innerHeight,tx:(q.x*.5+.5)*innerWidth,ty:(-q.y*.5+.5)*innerHeight}})});
addEventListener('resize',()=>{if(C2){C2.aspect=innerWidth/innerHeight;C2.updateProjectionMatrix()}});
const bz=document.getElementById('z2s');if(bz)bz.onclick=start;
// DNA heliks ganda di nukleus Zona 1 (menggantikan simpul kromatin)
try{chro.visible=false;[[-2.2,0,0,0,0,.3],[1.6,-.9,-1.9,1.2,0,0],[-.2,1.7,1.6,0,0,1.3]].forEach(([x,y,z,rx,ry,rz])=>{const h=mkDNA(4,5.2,.5);h.position.set(x,y,z);h.rotation.set(rx,ry,rz);nuc.add(h)})}catch(e){console.warn('dna',e)}
})();
