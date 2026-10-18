'use strict';const $=id=>document.getElementById(id);const params=new URLSearchParams(location.search);if(params.get('room'))$('code').value=params.get('room').toUpperCase();
let conn=null,player=0,client=Math.random().toString(36).slice(2),bc=null;
const state={left:0,right:0,jump:0,pull:0};function send(){const msg={type:'input',state};if(conn&&conn.open)conn.send(msg);if(bc)bc.postMessage({type:'bc-input',player,state,client});}
setInterval(send,120);
function status(t,col){$('status').textContent=t;$('status').style.background=col||'#ffffff10';}
$('joinBtn').onclick=()=>{const code=$('code').value.trim().toUpperCase();if(code.length!==4){$('joinStatus').textContent='Enter the 4-letter code';return;}$('joinStatus').textContent='Connecting…';
 try{bc=new BroadcastChannel('chainbound-'+code);bc.onmessage=e=>{if(e.data&&e.data.type==='bc-assign'&&e.data.client===client){player=e.data.player;status('✅ You are Player '+player+' (same-device demo) — go!','#14532d');}};bc.postMessage({type:'bc-hello',client});}catch(e){}
 if(window.Peer){const peer=new Peer();peer.on('open',()=>{conn=peer.connect('chainbound-climb-'+code+'-host',{reliable:true});conn.on('open',()=>{conn.send({type:'hello'});status('✅ Connected — waiting for player assignment…','#14532d');});conn.on('data',d=>{if(d.type==='assign'){player=d.player;status('✅ You are Player '+player+(player===1?' (cyan)':' (pink)')+' — go!','#14532d');}});conn.on('error',()=>status('Connection error — check code / host is open','#7f1d1d'));});peer.on('error',e=>{status('Broker: '+e.type+' — if host is on same device, demo tab mode may still work','#78350f');});}
 else status('PeerJS failed to load','#7f1d1d');};
function bind(id,key){const el=$(id);const on=e=>{e.preventDefault();state[key]=1;el.classList.add('active');send();};const off=e=>{e.preventDefault();state[key]=0;el.classList.remove('active');send();};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);el.addEventListener('contextmenu',e=>e.preventDefault());}
bind('left','left');bind('right','right');bind('jump','jump');bind('pull','pull');
