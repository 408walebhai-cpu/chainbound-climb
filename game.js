// Chainbound Climb — original 2D chained co-op platformer (Canvas, no assets)
'use strict';
const cv=document.getElementById('game'),ctx=cv.getContext('2d'),W=1280,H=720;
const $=id=>document.getElementById(id);
// ---------- audio ----------
let audioOn=true,AC=null;function beep(f,d=.08,type='sine',v=.12){if(!audioOn)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}}
// ---------- input ----------
const inputs=[{left:0,right:0,jump:0,pull:0},{left:0,right:0,jump:0,pull:0}];
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault();if(e.key.toLowerCase()==='r'&&state!=='lobby')resetRun();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
function keyboardInput(){inputs[0].left|=keys['a']?1:0;inputs[0].right|=keys['d']?1:0;inputs[0].jump|=keys['w']?1:0;inputs[0].pull|=keys['s']?1:0;inputs[1].left|=keys['arrowleft']?1:0;inputs[1].right|=keys['arrowright']?1:0;inputs[1].jump|=keys['arrowup']?1:0;inputs[1].pull|=keys['arrowdown']?1:0;}
// phone inputs decay if no heartbeat
let phoneSeen=[0,0];
// ---------- room / networking ----------
const CODE=(()=>{const s='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<4;i++)c+=s[Math.floor(Math.random()*s.length)];return c;})();
$('roomCode').textContent=CODE;
const ctrlURL=new URL('controller.html',location.href);ctrlURL.searchParams.set('room',CODE);
$('ctrlLink').textContent=ctrlURL.href;
try{if(window.QRCode)QRCode.toCanvas($('qr'),ctrlURL.href,{width:180,margin:1},()=>{});}catch(e){}
let conns=[null,null];
function setSlot(i,on,label){$(i?'dot2':'dot1').className='dot'+(on?' on':'');$(i?'p2s':'p1s').textContent=label||(on?'phone connected':'waiting…');}
function handleConn(conn,via){conn.on('data',d=>{if(!d||typeof d!=='object')return;if(d.type==='hello'){let idx=conns[0]&&conns[0]!==conn?1:0;if(conns[idx]&&conns[idx]!==conn)idx=1-idx;conns[idx]=conn;conn._slot=idx;conn.send({type:'assign',player:idx+1});setSlot(idx,true,'phone connected ('+via+')');beep(660,.07);}if(d.type==='input'&&typeof conn._slot==='number'){Object.assign(inputs[conn._slot],d.state);phoneSeen[conn._slot]=performance.now();}});conn.on('close',()=>{if(typeof conn._slot==='number')setSlot(conn._slot,false);});}
if(window.Peer){try{const peer=new Peer('chainbound-climb-'+CODE+'-host');peer.on('open',()=>{$('netStatus').textContent='Room live via WebRTC (PeerJS). Phones: scan QR or enter code '+CODE+' on the controller page.';});peer.on('connection',c=>handleConn(c,'WebRTC'));peer.on('error',e=>{$('netStatus').textContent='WebRTC broker note: '+e.type+' — keyboard & same-device demo tabs still work. Try refreshing for a new room.';});}catch(e){$('netStatus').textContent='WebRTC unavailable — keyboard & same-device demo still work.';}}
else{$('netStatus').textContent='PeerJS library failed to load — keyboard & same-device demo still work.';}
try{const bc=new BroadcastChannel('chainbound-'+CODE);bc.onmessage=e=>{const d=e.data;if(!d)return;if(d.type==='bc-hello'){let idx=d.slotHint===2||conns[0]?1:0;bc.postMessage({type:'bc-assign',player:idx+1,client:d.client});setSlot(idx,true,'same-device tab connected');}if(d.type==='bc-input'&&d.player){const i=d.player-1;Object.assign(inputs[i],d.state);phoneSeen[i]=performance.now();setSlot(i,true,'controller active');}};}catch(e){}
// ---------- world ----------
let state='lobby',mode='level',camY=0,shake=0,timeStart=0,elapsed=0,maxH=0,checkpoint=0,particles=[],winT=0;
const GRAV=1900,MOVE=330,JUMP=760,CHAIN=190;
function seededRand(seed){return function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
let platforms=[],flagY=0,endlessTop=0;
function buildLevel(){platforms=[{x:340,y:0,w:600,h:28,type:'ground'}];const rnd=seededRand(42);let x=440,y=0;for(let i=1;i<=72;i++){y-=118+((i*37)%40);x+=((rnd()-0.5)*560);x=Math.max(60,Math.min(1050,x));const w=Math.max(110,210-i*1.2);platforms.push({x,y,w,h:20,type:i%15===0?'checkpoint':(i%9===0?'moving':'normal'),phase:rnd()*6.28,baseX:x});}flagY=y-90;platforms.push({x:platforms[platforms.length-1].x-20,y:y-2,w:220,h:22,type:'summit'});}
function genEndless(upTo){const rnd=seededRand(1234+Math.floor(-upTo/100));while(endlessTop>upTo){endlessTop-=125;const x=80+Math.abs(Math.sin(endlessTop*.013))*1020;platforms.push({x,y:endlessTop,w:170,h:20,type:Math.floor(-endlessTop/600)%7===0?'moving':'normal',phase:x,baseX:x});platforms=platforms.filter(p=>p.y<camY+H+600);}}
buildLevel();
// ---------- players ----------
function mkPlayer(x,col){return{x,y:-46,vx:0,vy:0,w:30,h:40,col,ground:false,face:1,anim:0,coyote:0,jbuf:0,prevJump:0,squash:0};}
let p1=mkPlayer(560,'#22d3ee'),p2=mkPlayer(700,'#f472b6');
function spawnAt(cp){const plat=platforms[Math.min(cp,platforms.length-1)]||platforms[0];const cx=plat.x+plat.w/2;p1=mkPlayer(cx-50,p1.col);p2=mkPlayer(cx+50,p2.col);p1.y=p2.y=plat.y-42;camY=p1.y-H*0.55;particles=[];}
function resetRun(){if(mode==='level'){buildLevel();spawnAt(checkpoint);}else{platforms=[{x:340,y:0,w:600,h:28,type:'ground'}];endlessTop=0;spawnAt(0);genEndless(-2000);}timeStart=performance.now();maxH=0;state='playing';$('lobby').style.display='none';beep(523,.08);setTimeout(()=>beep(784,.1),90);}
$('startBtn').onclick=()=>{mode='level';checkpoint=0;resetRun();};
$('endlessBtn').onclick=()=>{mode='endless';resetRun();};
$('soundBtn').onclick=e=>{audioOn=!audioOn;e.target.textContent=audioOn?'🔊 Sound: On':'🔇 Sound: Off';};
// testability for automated checks
window.__chainbound={solveChain:(a,b,max)=>{const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d>max){const diff=(d-max)/d*.5;a.x+=dx*diff;a.y+=dy*diff;b.x-=dx*diff;b.y-=dy*diff;}return Math.hypot(b.x-a.x,b.y-a.y);},platformCount:()=>platforms.length};
// ---------- physics ----------
function stepPlayer(p,inp,dt){const accel=p.ground?2600:1800;if(inp.left){p.vx-=accel*dt;p.face=-1;}if(inp.right){p.vx+=accel*dt;p.face=1;}if(!inp.left&&!inp.right)p.vx*=p.ground?Math.pow(.0001,dt):Math.pow(.05,dt);p.vx=Math.max(-MOVE,Math.min(MOVE,p.vx));if(inp.jump&&!p.prevJump)p.jbuf=.12;else p.jbuf=Math.max(0,p.jbuf-dt);p.prevJump=inp.jump;p.coyote=p.ground?.1:Math.max(0,p.coyote-dt);if(p.jbuf>0&&p.coyote>0){p.vy=-JUMP;p.ground=false;p.coyote=0;p.jbuf=0;p.squash=-.25;beep(p===p1?440:520,.06,'square',.06);burst(p.x+p.w/2,p.y+p.h,6,p.col);}p.vy+=GRAV*dt;p.vy=Math.min(p.vy,1100);const oldB=p.y+p.h;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=Math.max(0,Math.min(W-p.w,p.x));p.ground=false;for(const pl of platforms){const px=pl.type==='moving'?pl.baseX+Math.sin(performance.now()/900+pl.phase)*70:pl.x;if(p.x+p.w>px+4&&p.x<px+pl.w-4){const newB=p.y+p.h;if(p.vy>=0&&oldB<=pl.y+8&&newB>=pl.y){p.y=pl.y-p.h;if(p.vy>520){p.squash=.3;beep(140,.05,'sine',.05);}p.vy=0;p.ground=true;}}}p.anim+=Math.abs(p.vx)*dt*.06+(p.ground?0:dt*4);p.squash*=Math.pow(.001,dt);}
function solveChainPlayers(){for(let k=0;k<6;k++){const dx=(p2.x+p2.w/2)-(p1.x+p1.w/2),dy=(p2.y+p2.h/2)-(p1.y+p1.h/2),d=Math.hypot(dx,dy)||1;if(d>CHAIN){const over=(d-CHAIN)/d;const w1=p1.ground&&!p2.ground?0.08:0.5,w2=p2.ground&&!p1.ground?0.08:0.5,s=w1+w2;p1.x+=dx*over*(w1/s);p1.y+=dy*over*(w1/s);p2.x-=dx*over*(w2/s);p2.y-=dy*over*(w2/s);if(!p2.ground&&p1.ground)p2.vy-=30;if(!p1.ground&&p2.ground)p1.vy-=30;}}}
function pullLogic(dt){[[p1,p2,inputs[0]],[p2,p1,inputs[1]]].forEach(([me,other,inp])=>{if(inp.pull&&me.ground){me.vx*=.6;const dx=(me.x-me.w/2)-(other.x),dy=(me.y)-(other.y+other.h);const d=Math.hypot(dx,dy)||1;if(d>60&&!other.ground){other.vx+=dx/d*900*dt;other.vy+=dy/d*900*dt-500*dt;if(Math.random()<.3)burst(other.x+15,other.y+20,1,'#fbbf24');}}});}
function burst(x,y,n,col){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*260,vy:-Math.random()*260-40,l:1,col});}
function update(dt){if(state!=='playing')return;elapsed=(performance.now()-timeStart)/1000;keyboardInput();for(let i=0;i<2;i++)if(performance.now()-phoneSeen[i]>2500&&conns[i]==null){/* keep keyboard */} // phone state persists briefly; keyboard ORs in
 stepPlayer(p1,inputs[0],dt);stepPlayer(p2,inputs[1],dt);pullLogic(dt);solveChainPlayers();
 const midY=(p1.y+p2.y)/2, target=midY-H*.55;camY+=(target-camY)*Math.min(1,dt*5);maxH=Math.max(maxH,(-Math.min(p1.y,p2.y))/50);if(mode==='endless'){genEndless(camY-800);if(Math.min(p1.y,p2.y)>camY+H+120){state='over';shake=18;beep(110,.4,'sawtooth',.12);showEnd(false);}}
 if(mode==='level'){const idx=platforms.reduce((best,pl,i)=>((p1.ground||p2.ground)&&Math.abs((p1.y+p1.h)-pl.y)<4?i:best),checkpoint); // checkpoint by proximity below
  platforms.forEach((pl,i)=>{if(i>checkpoint&&i%15===0&&(Math.abs(p1.y-pl.y)<90||Math.abs(p2.y-pl.y)<90)){checkpoint=i;beep(880,.09);burst(pl.x+pl.w/2,pl.y,18,'#22c55e');$('netStatus').textContent='⛳ Checkpoint reached — platform '+i;}});
  if((p1.y<flagY+80&&p1.ground)||(p2.y<flagY+80&&p2.ground)){// require both near top
   if(Math.abs(p1.y-p2.y)<260&&p1.y<flagY+160&&p2.y<flagY+160){state='won';beep(784,.15);setTimeout(()=>beep(988,.15),140);setTimeout(()=>beep(1318,.25),300);showEnd(true);}}
  if(Math.min(p1.y,p2.y)>camY+H+500){shake=14;beep(160,.25,'sawtooth',.1);spawnAt(checkpoint);}}
 particles.forEach(pt=>{pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=500*dt;pt.l-=dt*1.4;});particles=particles.filter(p=>p.l>0);shake*=Math.pow(.001,dt);}
// ---------- drawing ----------
function skyColors(t){ // t 0 depths -> 1 heaven
 const stops=[[10,4,18],[60,12,28],[42,16,70],[25,50,110],[70,140,200],[170,210,240],[255,236,180]];const f=Math.max(0,Math.min(.999,t))* (stops.length-1);const i=Math.floor(f),u=f-i;const a=stops[i],b=stops[i+1];return a.map((v,k)=>Math.round(v+(b[k]-v)*u));}
function draw(){ctx.save();ctx.clearRect(0,0,W,H);const totalH=mode==='level'?Math.abs(flagY):6000;const prog=Math.max(0,Math.min(1,(-camY)/Math.max(1,totalH)));const c=skyColors(prog);const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,`rgb(${c[0]},${c[1]},${c[2]})`);gr.addColorStop(1,`rgb(${Math.max(0,c[0]-30)},${Math.max(0,c[1]-10)},${Math.min(255,c[2]+30)})`);ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
 const shx=(Math.random()-.5)*shake,shy=(Math.random()-.5)*shake;ctx.translate(shx,shy);
 // parallax layers: embers/stars low, clouds high
 for(let layer=0;layer<3;layer++){const par=.15+layer*.18;ctx.globalAlpha=.35+layer*.2;for(let i=0;i<40;i++){const x=((i*173+layer*97)%1300)-10;let y=((i*211+layer*57 - camY*par)%760);if(y<0)y+=760;if(prog<.45){ctx.fillStyle=layer?'#fb923c':'#facc15';ctx.beginPath();ctx.arc(x,y,layer?2:3,0,7);ctx.fill();}else{ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(x,y,42-layer*8,13,0,0,7);ctx.fill();}}}ctx.globalAlpha=1;
 // distant pillars
 ctx.fillStyle='rgba(255,255,255,0.06)';for(let i=0;i<6;i++){const x=(i*260 - (camY*.05%260));ctx.fillRect(x,0,70,H);}
 // platforms
 for(const pl of platforms){const sx=pl.type==='moving'?pl.baseX+Math.sin(performance.now()/900+pl.phase)*70:pl.x;const sy=pl.y-camY;if(sy<-60||sy>H+80)continue;const g=ctx.createLinearGradient(sx,sy,sx,sy+pl.h);if(pl.type==='checkpoint'){g.addColorStop(0,'#22c55e');g.addColorStop(1,'#065f46');}else if(pl.type==='summit'){g.addColorStop(0,'#fde68a');g.addColorStop(1,'#b45309');}else if(pl.type==='moving'){g.addColorStop(0,'#a78bfa');g.addColorStop(1,'#4c1d95');}else{g.addColorStop(0,prog>.6?'#e2e8f0':'#7c5a4a');g.addColorStop(1,prog>.6?'#64748b':'#292524');}ctx.fillStyle=g;roundRect(sx,sy,pl.w,pl.h,8);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(sx+6,sy+3,pl.w-12,3);if(pl.type==='checkpoint'){ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('⛳',sx+pl.w/2-8,sy-8);}}
 // flag
 if(mode==='level'){const fy=flagY-camY;ctx.strokeStyle='#fbbf24';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(640,fy+90);ctx.lineTo(640,fy-30);ctx.stroke();ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.moveTo(640,fy-30);ctx.lineTo(700,fy-12);ctx.lineTo(640,fy+6);ctx.fill();ctx.font='bold 20px sans-serif';ctx.fillStyle='#fff';ctx.fillText('🏁 SUMMIT',590,fy-42);}
 // chain with sag
 const ax=p1.x+15,ay=p1.y+20-camY,bx=p2.x+15,by=p2.y+20-camY;const dist=Math.hypot(bx-ax,by-ay);const sag=Math.max(6,(CHAIN-dist)*.35);const taut=dist>CHAIN*.92;ctx.strokeStyle=taut?'#f87171':'#d6d3d1';ctx.lineWidth=taut?4:3;ctx.beginPath();ctx.moveTo(ax,ay);const mx=(ax+bx)/2,my=(ay+by)/2+sag;ctx.quadraticCurveTo(mx,my,bx,by);ctx.stroke();ctx.fillStyle=taut?'#fecaca':'#a8a29e';for(let t=.1;t<1;t+=.15){const x=(1-t)*(1-t)*ax+2*(1-t)*t*mx+t*t*bx,y=(1-t)*(1-t)*ay+2*(1-t)*t*my+t*t*by;ctx.beginPath();ctx.arc(x,y,3.5,0,7);ctx.fill();}
 drawPlayer(p1);drawPlayer(p2);
 particles.forEach(pt=>{ctx.globalAlpha=Math.max(0,pt.l);ctx.fillStyle=pt.col;ctx.fillRect(pt.x,pt.y-camY,4,4);});ctx.globalAlpha=1;
 // HUD
 ctx.fillStyle='rgba(0,0,0,.45)';roundRect(16,16,330,86,14);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 20px system-ui';ctx.fillText((mode==='level'?'🏁 LEVEL':'∞ ENDLESS')+'   ⬆ '+maxH.toFixed(1)+' m',30,44);ctx.font='16px system-ui';ctx.fillText('⏱ '+elapsed.toFixed(1)+'s   ⛳ checkpoint '+checkpoint+'   '+(taut?'⛓️ TAUT!':'⛓️ slack'),30,72);ctx.fillStyle='rgba(0,0,0,.45)';roundRect(W-250,16,234,54,14);ctx.fill();ctx.fillStyle='#fff';ctx.font='14px system-ui';ctx.fillText('P1 A/D+W • P2 ←/→+↑ • R restart',W-236,48);
 if(state==='lobby'){ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,W,H);}
 ctx.restore();requestAnimationFrame(loop);}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawPlayer(p){const x=p.x,y=p.y-camY;ctx.save();ctx.translate(x+p.w/2,y+p.h/2);ctx.scale(1+p.squash*.4,1-p.squash*.4);ctx.translate(-p.w/2,-p.h/2);const bob=p.ground&&Math.abs(p.vx)>20?Math.sin(p.anim)*3:0;ctx.fillStyle=p.col;roundRect(2,8+bob*.3,p.w-4,p.h-14,10);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.w/2,6,11,0,7);ctx.fill();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(p.w/2+p.face*4,5,2.2,0,7);ctx.arc(p.w/2+p.face*8,5,2.2,0,7);ctx.fill();ctx.strokeStyle=p.col;ctx.lineWidth=5;ctx.beginPath();const leg=Math.sin(p.anim)* (p.ground?7:2);ctx.moveTo(10,p.h-6);ctx.lineTo(10+leg,p.h+2);ctx.moveTo(20,p.h-6);ctx.lineTo(20-leg,p.h+2);ctx.stroke();ctx.restore();if(p===p1||p===p2){ctx.fillStyle=p.col;ctx.font='bold 12px system-ui';ctx.fillText(p===p1?'P1':'P2',x+7,y-10);}}
function showEnd(won){$('lobby').style.display='flex';$('lobby').querySelector('h1').innerHTML=won?'You reached<br>the summit! 🎉':'You fell! 💥';$('netStatus').textContent=(won?'Level complete':'Endless run over')+' — Height '+maxH.toFixed(1)+' m in '+elapsed.toFixed(1)+'s. Press Start to play again.';state=won?'won':'over';}
let last=performance.now();function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();}
requestAnimationFrame(loop);
// start in demo-visible state behind lobby
spawnAt(0);camY=-H*.55;
