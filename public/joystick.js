// CELLBOUND - joystick virtual (layar sentuh/mouse) + gamepad untuk menggerakkan karakter di Zona 1
(()=>{
const css=document.createElement('style');css.textContent=`#joy{position:fixed;left:calc(22px + env(safe-area-inset-left,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:132px;height:132px;border-radius:50%;background:rgba(6,30,44,.55);border:2px solid rgba(79,240,208,.55);backdrop-filter:blur(4px);touch-action:none;display:none;z-index:5;user-select:none;-webkit-user-select:none}
#joy i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8ffff0,#2bbfa5);box-shadow:0 0 18px rgba(79,240,208,.6);pointer-events:none}
#joyt{position:fixed;right:12px;bottom:calc(34px + env(safe-area-inset-bottom,0px));font-size:12px;padding:6px 12px;display:none;z-index:5}
body.joyon #emo{bottom:calc(172px + env(safe-area-inset-bottom,0px))!important}
@media (max-width:640px){body.joyon #act{bottom:calc(176px + env(safe-area-inset-bottom,0px))}}`;document.head.appendChild(css);
let en=matchMedia('(pointer:coarse)').matches;try{const s=localStorage.getItem('cbjoy');if(s!==null)en=s==='1'}catch{}
const J=window.JOY={x:0,y:0};let vx=0,vy=0,id=null,prevA=false;
const base=document.createElement('div');base.id='joy';const th=document.createElement('i');base.appendChild(th);document.body.appendChild(base);
const tg=document.createElement('button');tg.id='joyt';tg.className='alt';document.body.appendChild(tg);
const lbl=()=>tg.textContent='🕹 Joystick: '+(en?'ON':'OFF');lbl();
tg.onclick=()=>{en=!en;try{localStorage.setItem('cbjoy',en?'1':'0')}catch{}lbl()};
const R=46;
function mv(e){const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=(e.clientX-cx)/R,y=(e.clientY-cy)/R;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}th.style.transform=`translate(${x*R}px,${y*R}px)`;const m=Math.hypot(x,y);if(m<.14){vx=vy=0}else{const k=(m-.14)/.86/m;vx=x*k;vy=y*k}}
base.addEventListener('pointerdown',e=>{id=e.pointerId;try{base.setPointerCapture(id)}catch{}mv(e);e.preventDefault()});
base.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e)});
const end=e=>{if(e.pointerId!==id)return;id=null;vx=vy=0;th.style.transform=''};
base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end);
function tick(){let gx=0,gy=0;const pads=navigator.getGamepads?navigator.getGamepads():[],g=[...pads].find(p=>p&&p.connected);
 if(g){let x=g.axes[0]||0,y=g.axes[1]||0;const m=Math.hypot(x,y);if(m>.18){const k=Math.min(1,(m-.18)/.82)/m;gx=x*k;gy=y*k}
  const b=i=>g.buttons[i]&&g.buttons[i].pressed;if(b(14))gx=-1;if(b(15))gx=1;if(b(12))gy=-1;if(b(13))gy=1;
  const a=!!b(0);if(a&&!prevA){const ab=document.getElementById('act');if(ab&&ab.style.display==='block')ab.click()}prevA=a}
 const play=typeof phase!=='undefined'&&phase==='explore';
 J.x=play?(vx||gx):0;J.y=play?(vy||gy):0;
 const show=en&&play;base.style.display=show?'block':'none';tg.style.display=play?'block':'none';document.body.classList.toggle('joyon',show);
 requestAnimationFrame(tick)}
tick();
})();
