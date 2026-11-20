// CELLBOUND - rig animasi prosedural Cellcy untuk beranda (berdiri sendiri, tanpa dependensi game).
// Model: rig Mixamo tanpa animasi bawaan (pose T) -> semua gerakan dihitung dari tulang.
(()=>{
const T=THREE,Q1=new T.Quaternion(),Q2=new T.Quaternion(),Q3=new T.Quaternion(),Q4=new T.Quaternion(),E=new T.Euler(),VX=new T.Vector3(1,0,0),VZ=new T.Vector3(0,0,1);
const CFG=window.CELLCY_HOME_CFG=Object.assign({waveAxis:'x',waveSign:1,foreAxis:'y',foreSign:1,foreWave:1.3,yawSign:1,pitchSign:-1,down:1.2,up:-0.45},window.CELLCY_HOME_CFG||{});
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
class Rig{
 constructor(scene){this.root=new T.Group();this.model=new T.Group();this.model.add(scene);this.root.add(this.model);this.b={};
  scene.traverse(o=>{if(o.isBone){this.b[o.name.replace(/^mixamorig:?/,'')]=o;o.userData.q0=o.quaternion.clone()}if(o.isMesh)o.frustumCulled=false});
  this.root.updateMatrixWorld(true);const iq=this.root.getWorldQuaternion(new T.Quaternion()).invert();this.rest={};
  ['LeftArm','RightArm'].forEach(n=>this.rest[n]=iq.clone().multiply(this.b[n].getWorldQuaternion(new T.Quaternion())))}
 loc(n,x=0,y=0,z=0){const o=this.b[n];if(!o)return;o.quaternion.copy(o.userData.q0).multiply(Q1.setFromEuler(E.set(x,y,z)))}
 // lengan: 'lower' = sudut turun dari horizontal (negatif = terangkat), 'swing' = ayun maju(+)/mundur(-)
 arm(side,lower,swing=0){const o=this.b[side+'Arm'];if(!o)return;const sg=side==='Left'?-1:1;
  Q1.setFromAxisAngle(VZ,sg*lower);Q2.setFromAxisAngle(VX,-swing);Q2.multiply(Q1).multiply(this.rest[side+'Arm']);
  this.root.getWorldQuaternion(Q3);Q3.multiply(Q2);o.parent.getWorldQuaternion(Q4).invert();o.quaternion.copy(Q4.multiply(Q3))}
 fore(side,ang,ax=CFG.foreAxis){const o=this.b[side+'ForeArm'];if(!o)return;o.quaternion.copy(o.userData.q0).multiply(Q1.setFromEuler(E.set(ax==='x'?ang:0,ax==='y'?ang:0,ax==='z'?ang:0)))}
 // o: {wave:0..1, lookX:-1..1, lookY:-1..1, hop:0..1}
 pose(t,o={}){
  const w=ease(clamp(o.wave||0,0,1)),lx=o.lookX||0,ly=o.lookY||0,br=Math.sin(t*1.8),sway=Math.sin(t*.9);
  // napas & goyang halus
  this.loc('Hips',0,lx*.10,sway*.015);
  this.loc('Spine',.012*br,lx*.10,0);this.loc('Spine1',.012*br,lx*.08,w*.04);this.loc('Spine2',.01*br,lx*.06,w*.05);
  // kepala mengikuti pointer
  const ys=CFG.yawSign,ps=CFG.pitchSign;
  this.loc('Neck',ps*ly*.14,ys*lx*.28,w*.05);this.loc('Head',ps*ly*.2,ys*lx*.34,w*.10+Math.sin(t*.7)*.02);
  // lengan kiri (karakter): rileks, sedikit mengayun
  this.arm('Left',lerp(CFG.down,CFG.down-.12,w)+Math.sin(t*1.2)*.02,Math.sin(t*1.1)*.03);this.fore('Left',.2+.04*br);
  // lengan kanan: terangkat & melambai
  const wob=Math.sin(t*9.5)*.5*w;
  this.arm('Right',lerp(CFG.down+Math.sin(t*1.2+.8)*.02,CFG.up,w),lerp(Math.sin(t*1.1+.6)*.03,.1,w));
  this.fore('Right',lerp(.2+.04*br,CFG.foreWave,w)*CFG.foreSign,CFG.foreAxis);
  // goyangan lambaian (sumbu terpisah dari tekukan siku)
  if(w>0.001){const o2=this.b.RightForeArm;Q1.setFromEuler(E.set(CFG.waveAxis==='x'?wob*CFG.waveSign:0,CFG.waveAxis==='y'?wob*CFG.waveSign:0,CFG.waveAxis==='z'?wob*CFG.waveSign:0));o2.quaternion.multiply(Q1);
   const h=this.b.RightHand;if(h)h.quaternion.copy(h.userData.q0).multiply(Q1.setFromEuler(E.set(0,0,Math.sin(t*9.5+.9)*.25*w)))}
  // lompat kecil
  const hop=o.hop||0;this.model.position.y=Math.sin(hop*Math.PI)*.28;this.model.scale.set(1+(hop>0?-Math.sin(hop*Math.PI)*.0:0),1,1);
 }
}
window.CellcyHomeRig=Rig;window.CELLCY_ease=ease;
})();
