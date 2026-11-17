// Routing dari beranda: /play?go=zona1|zona2|join&kode=..&nama=..
(()=>{const q=new URLSearchParams(location.search),go=q.get('go'),$=i=>document.getElementById(i);
const c=$('card');if(c)c.insertAdjacentHTML('beforeend','<p style="margin:14px 0 0"><a href="/" style="color:#8fb7c4;font-size:13px">← Beranda</a></p>');
setTimeout(()=>{
 if(go==='zona1'){const b=$('go');b&&b.click()}
 else if(go==='zona2'){const b=$('z2s');b&&b.click()}
 else if(go==='join'&&q.get('kode')&&q.get('nama')){const j=$('join');if(j)j.click();const nm=$('nm'),cd=$('cd'),jg=$('jg');if(nm&&cd&&jg){nm.value=q.get('nama').slice(0,16);cd.value=q.get('kode').toUpperCase().slice(0,6);jg.click()}}
},80)})();
