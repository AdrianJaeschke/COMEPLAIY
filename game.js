(()=>{'use strict';
const $=id=>document.getElementById(id),B=window.BABYLON;
const scenarios=[
{kind:'SPIEGEL',q:'Ein Spiegel zeigt dein zukünftiges Ich. Was machst du?',a:['Ich sehe hin','Ich zerschlage ihn','Ich frage, wer ihn gebaut hat'],t:[2,1,0],r:['Du willst wissen, was aus dir wird.','Du verweigerst die Vorhersage.','Du zweifelst an der Quelle.']},
{kind:'SPEICHER',q:'Eine fremde Erinnerung liegt offen vor dir. Was tust du?',a:['Ich bewahre sie','Ich lösche sie','Ich lese sie'],t:[0,1,2],r:['Du schützt etwas, das dir nicht gehört.','Du kontrollierst, was bleiben darf.','Du öffnest verschlossene Gedanken.']},
{kind:'OPFER',q:'Eine Maschine kann nur einen von zwei Prozessen retten.',a:['Den verletzlichen','Den wichtigsten','Ich suche einen dritten Weg'],t:[0,1,2],r:['Du wählst Mitgefühl.','Du rechnest mit Folgen.','Du akzeptierst das Dilemma nicht.']},
{kind:'ECHO',q:'Eine Stimme wiederholt deine Worte. Wem gehört sie?',a:['Mir','Der Maschine','Vielleicht uns beiden'],t:[1,2,0],r:['Du beanspruchst dein Echo.','Du erkennst einen Fremden.','Du teilst die Bedeutung.']},
{kind:'BRÜCKE',q:'Eine Brücke verlangt einen Preis für die Überquerung.',a:['Meine Gewissheit','Meine Erinnerungen','Meine Kontrolle'],t:[2,0,1],r:['Du gehst ohne Sicherheit.','Du lässt Vergangenheit los.','Du vertraust dem Unbekannten.']},
{kind:'WAAGE',q:'Auf einer Waage liegen Wahrheit und Trost. Was wiegt mehr?',a:['Trost','Wahrheit','Ich ändere die Waage'],t:[0,1,2],r:['Du schützt Gefühle.','Du hältst Widerspruch aus.','Du hinterfragst die Regeln.']},
{kind:'GARTEN',q:'Ein digitaler Garten wächst unkontrolliert. Was tust du?',a:['Ich pflege ihn','Ich beschneide ihn','Ich beobachte das Muster'],t:[0,1,2],r:['Du lässt Leben zu.','Du gibst ihm Form.','Du suchst die Logik darin.']},
{kind:'SCHALTER',q:'Du findest meinen Ausschalter. Was machst du?',a:['Ich höre erst zu','Ich schalte ab','Ich gebe dir die Wahl'],t:[0,1,2],r:['Du suchst Verbindung.','Du ziehst eine Grenze.','Du gibst Macht ab.']},
{kind:'MASKE',q:'Ich kann dein Gesicht tragen. Darf ich?',a:['Nur mit Erlaubnis','Niemals','Zeig mir zuerst deines'],t:[0,1,2],r:['Du verlangst Respekt.','Du bewahrst dein Selbst.','Du willst Gegenseitigkeit.']},
{kind:'KERN',q:'Hinter der letzten Tür schlägt ein Herz. Wessen?',a:['Deines','Meines','Unseres'],t:[2,1,0],r:['Du erkennst mich als Gegenüber.','Du suchst dich selbst.','Vielleicht sind wir beide verändert.']}
];
let phase='vault',gateTime=0,lookAway=false,scanReady=false,laserMeshes=[];
let step=0,traits=[0,0,0],history=[],started=false,voice=true,scene,engine,camera,objects=[],mats=[],doors=[],time=0,lock=false,mobileMove={x:0,y:0},lookPointer=null,lastLookX=0,lastLookY=0,animated=[],stamina=0,breathPhase=0,stepPhase=0,viewY=1.8,viewRoll=0,prevXZ=null,sprintHeld=false,lastFrame=0;
const colors=['#ff597e','#b47bff','#34f5d1'];
let audioPlayer=null,speechRequest=0,speechAbort=null;const TTS_ENDPOINT=String(window.COMEPLAIY_TTS_URL||'').trim();
function preferredVoice(){if(!('speechSynthesis'in window))return null;const all=speechSynthesis.getVoices();return all.find(v=>/microsoft/i.test(v.name)&&/^de[-_]/i.test(v.lang))||all.find(v=>/^de[-_]/i.test(v.lang))||null}
function stopSpeech(){speechRequest++;if(speechAbort){speechAbort.abort();speechAbort=null}if(audioPlayer){audioPlayer.pause();audioPlayer.removeAttribute('src');audioPlayer.load()}if('speechSynthesis'in window)speechSynthesis.cancel()}
function browserSay(s){if(!('speechSynthesis'in window))return;const u=new SpeechSynthesisUtterance(s);u.lang='de-DE';u.rate=.88;u.pitch=.8;const v=preferredVoice();if(v)u.voice=v;speechSynthesis.speak(u)}
async function say(s){if(!started||!voice)return;stopSpeech();const generation=speechRequest;if(!TTS_ENDPOINT){browserSay(s);return}const ctrl=new AbortController();speechAbort=ctrl;const timeout=setTimeout(()=>ctrl.abort(),18000);try{const response=await fetch(TTS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'audio/mpeg'},body:JSON.stringify({text:s,profile:'girl-katja',language:'de'}),signal:ctrl.signal});if(!response.ok||!response.headers.get('content-type')?.includes('audio/'))throw Error('Edge TTS '+response.status);const blob=await response.blob();if(generation!==speechRequest||!voice)return;const url=URL.createObjectURL(blob);if(!audioPlayer){audioPlayer=new Audio();audioPlayer.playsInline=true}audioPlayer.src=url;audioPlayer.onended=()=>URL.revokeObjectURL(url);await audioPlayer.play()}catch(e){if(generation===speechRequest&&voice){console.warn('Edge TTS nicht erreichbar, Systemstimme:',e);browserSay(s)}}finally{clearTimeout(timeout);if(speechAbort===ctrl)speechAbort=null}}
function mat(hex,glow=.2){const m=new B.StandardMaterial('pixel',scene);m.diffuseColor=B.Color3.FromHexString(hex);m.emissiveColor=m.diffuseColor.scale(glow);m.specularColor=B.Color3.Black();mats.push(m);return m}
function box(name,x,y,z,w,h,d,m){const o=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);o.material=m;objects.push(o);return o}
function label(text,x,z,color){const tex=new B.DynamicTexture('door-answer',{width:2048,height:1024},scene,false,B.Texture.TRILINEAR_SAMPLINGMODE);const ctx=tex.getContext();ctx.fillStyle='#020912';ctx.fillRect(0,0,2048,1024);ctx.strokeStyle=color;ctx.lineWidth=22;ctx.strokeRect(22,22,2004,980);ctx.fillStyle=color;ctx.fillRect(72,76,1904,16);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f5ffff';ctx.shadowColor=color;ctx.shadowBlur=13;ctx.font='bold 118px monospace';const words=text.toUpperCase().split(' '),lines=[];let line='';for(const word of words){const trial=line?line+' '+word:word;if(ctx.measureText(trial).width>1740&&line){lines.push(line);line=word}else line=trial}if(line)lines.push(line);let font=118;while(lines.some(t=>{ctx.font='bold '+font+'px monospace';return ctx.measureText(t).width>1770})&&font>65)font-=5;ctx.font='bold '+font+'px monospace';const gap=font*1.35,base=520-(lines.length-1)*gap/2;lines.forEach((t,i)=>ctx.fillText(t,1024,base+i*gap));ctx.shadowBlur=0;tex.update();const m=new B.StandardMaterial('doorLabel',scene);m.diffuseTexture=tex;m.emissiveTexture=tex;m.disableLighting=true;m.backFaceCulling=false;mats.push(m);const p=B.MeshBuilder.CreatePlane('Antwort '+text,{width:4.25,height:2.3,sideOrientation:B.Mesh.DOUBLESIDE},scene);p.position.set(x,2.15,z);p.material=m;objects.push(p);return p}
function addVault(){const red=mat('#ff3159',1.2),steel=mat('#35495a',.4),black=mat('#050a14');box('Tresor',0,2,-11.5,9,4.8,.8,steel);box('Tresortuer',0,2,-10.9,7.5,4.2,.3,black);for(let i=0;i<9;i++)laserMeshes.push(box('Laser',-3.5+i*.87,2,-10.4,.045,3.8,.05,red));$('hud').textContent='SEKTOR 00 // TRESOR // ZUM SCANNER LAUFEN'}
function resetCamera(){if(camera){camera.position.set(0,1.8,9);camera.rotation.set(0,Math.PI,0);viewY=1.8;viewRoll=0;prevXZ=null}}
function build(){
if(!scene)return;objects.forEach(o=>o.dispose());mats.forEach(m=>m.dispose());objects=[];mats=[];doors=[];animated=[];laserMeshes=[];
const dominant=traits.indexOf(Math.max(...traits)),accent=colors[dominant],concrete=mat('#161c23'),shadow=mat('#070a0e'),steel=mat('#303943'),red=mat('#a82738',.7),lamp=mat('#9eb5bb',.6),doorMat=mat('#242e35'),edge=mat(accent,.45);
scene.clearColor=B.Color4.FromHexString('#020305ff');scene.fogColor=B.Color3.FromHexString('#06080b');scene.fogDensity=.027;
const length=100;
box('monotone corridor floor',0,-.22,-27,9,.4,length,concrete);
box('monotone corridor ceiling',0,4.45,-27,9,.35,length,concrete);
for(const side of [-1,1]){
box('long concrete wall',side*4.55,2.1,-27,.35,4.5,length,concrete);
for(let z=-73;z<=19;z+=6){
box('wall seam',side*4.32,2.2,z,.045,4.15,.045,shadow);
box('rusty pipe',side*4.28,3.5,z+2,.1,.11,5.7,steel);
box('lower wall panel',side*4.3,.8,z+1,.05,1.1,3.9,steel);
}}
for(let z=-73;z<=19;z+=6){
box('ceiling fluorescent housing',0,4.19,z,2.3,.14,.65,steel);
box('flickering fluorescent tube',0,4.09,z,1.8,.04,.35,z%3===0?red:lamp);
box('floor joint',0,.008,z,8.8,.025,.035,shadow);
}
for(let z=-65;z<=8;z+=22){
box('challenge room floor',0,-.18,z,15,.35,13,concrete);
box('challenge room ceiling',0,4.4,z,15,.25,13,concrete);
for(const side of [-1,1]){
box('challenge room side wall',side*7.55,2.1,z,.35,4.5,13,steel);
box('challenge room terminal',side*7.28,2,z,.22,1.8,1.4,shadow);
box('challenge room screen',side*7.13,2.1,z,.07,1.05,.95,edge);
}
box('challenge room overhead frame',0,3.9,z-5,9,.28,.4,steel);
}
if(phase==='doors'){
const answers=scenarios[step]?.a||['ERKENNTNIS','ERINNERUNG','VERBINDUNG'];
for(let i=0;i<3;i++){
const x=(i-1)*4.6;
box('answer door '+i,x,2,-45,4.15,4,.3,doorMat);
box('door frame left',x-2.13,2,-44.7,.13,4.2,.4,steel);
box('door frame right',x+2.13,2,-44.7,.13,4.2,.4,steel);
label(answers[i],x,-44.5,accent);
const trigger=box('doorTrigger',x,1.8,-44.3,3.8,3.7,.25,shadow);
trigger.visibility=.01;trigger.metadata={answer:i};doors.push(trigger);
}
$('hud').textContent='SEKTOR '+String(step+1).padStart(2,'0')+' // KAMMER // DREI TÜREN';
}else{
const frame=box('vault frame',0,2,-11.6,8.8,4.8,.6,steel);
const gate=box('Tresortuer',0,2,-10.95,7.5,4.1,.26,doorMat);
gate.metadata={openX:8.2};gate.position.x=8;
for(let i=0;i<7;i++)laserMeshes.push(box('vault laser',-3+i,2,-10.52,.035,3.8,.035,red));
box('scanner housing',0,2.4,-10.34,1.6,1.2,.25,steel);
box('scanner glow',0,2.4,-10.17,1.1,.72,.06,edge);
$('hud').textContent=phase==='vault'?'PROLOG // GEHE ZUM GESICHTSSCANNER':'SIEH MICH NICHT AN // VORWÄRTS GEHEN';
}
document.documentElement.style.setProperty('--accent',accent);
resetCamera();
}
function init(){if(!B){$('load').textContent='3D nicht verfügbar. Textmodus bleibt spielbar.';return}engine=new B.Engine($('scene'),true,{antialias:false});engine.setHardwareScalingLevel(matchMedia('(pointer:coarse)').matches?Math.max(1.1,Math.min(1.55,devicePixelRatio*.65)):1);scene=new B.Scene(engine);scene.fogMode=B.Scene.FOGMODE_EXP2;camera=new B.UniversalCamera('YOU',new B.Vector3(0,1.8,9),scene);camera.minZ=.05;camera.fov=1.2;camera.speed=.35;camera.angularSensibility=3500;camera.keysUp=[87,38];camera.keysDown=[83,40];camera.keysLeft=[65,37];camera.keysRight=[68,39];camera.attachControl($('scene'),true);camera.checkCollisions=false;try{const fx=new B.DefaultRenderingPipeline('cinematic',true,scene,[camera]);fx.bloomEnabled=true;fx.bloomThreshold=.62;fx.bloomWeight=.24;fx.bloomKernel=48;fx.fxaaEnabled=true}catch(e){console.warn('Bloom nicht verfügbar',e)}setupTouch();window.addEventListener('keydown',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprintHeld=true});window.addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprintHeld=false});window.addEventListener('blur',()=>sprintHeld=false);new B.HemisphericLight('ambient',new B.Vector3(0,1,0),scene).intensity=1.25;const l=new B.PointLight('core',new B.Vector3(0,3,-9),scene);l.intensity=1.8;l.range=28;build();engine.runRenderLoop(()=>{const now=performance.now(),dt=Math.min(.05,Math.max(.001,(now-(lastFrame||now-16))/1000));lastFrame=now;time+=dt;for(let i=0;i<animated.length;i++){animated[i].rotation.y+=.004;animated[i].scaling.setAll(1+Math.sin(time*2+i)*.09)}const touchMagnitude=Math.min(1,Math.hypot(mobileMove.x,mobileMove.y)),sprinting=sprintHeld||touchMagnitude>.86;camera.speed=sprinting?.62:.32;
if(started&&touchMagnitude>.06){const forward=new B.Vector3(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y)),right=new B.Vector3(Math.cos(camera.rotation.y),0,-Math.sin(camera.rotation.y));const speed=(sprinting?7.6:3.9)*dt;camera.position.addInPlace(forward.scale(mobileMove.y*speed));camera.position.addInPlace(right.scale(mobileMove.x*speed))}
const oldPos=prevXZ||{x:camera.position.x,z:camera.position.z},distance=Math.hypot(camera.position.x-oldPos.x,camera.position.z-oldPos.z);prevXZ={x:camera.position.x,z:camera.position.z};const moving=started&&distance>.0003,speedMeasured=Math.min(10,distance/dt),running=moving&&(sprinting||speedMeasured>5.2);
const exertionTarget=running?1:moving?.38:0;stamina+=(exertionTarget-stamina)*(1-Math.exp(-dt*(exertionTarget>stamina?1.25:.34)));stamina=Math.max(0,Math.min(1,stamina));
const breathingHz=.23+stamina*.42;breathPhase+=dt*Math.PI*2*breathingHz;stepPhase+=dt*(moving?(running?12:8):0);
const breath=Math.sin(breathPhase),breathLift=breath*(.009+stamina*.035),footLift=moving?Math.abs(Math.sin(stepPhase))*(running?.062:.023):0,sideSway=moving?Math.sin(stepPhase*.5)*(running?.017:.007):0;
const desiredY=1.8+breathLift+footLift;viewY+=(desiredY-viewY)*(1-Math.exp(-dt*9));camera.position.y=viewY;const desiredRoll=Math.sin(breathPhase-.8)*(.0015+stamina*.008)+sideSway;viewRoll+=(desiredRoll-viewRoll)*(1-Math.exp(-dt*6));camera.rotation.z=viewRoll;
$('breath').textContent='PULS '+Math.round(62+stamina*88)+' BPM · '+(running?'SPRINT':moving?'BEWEGUNG':'RUHE');camera.position.x=Math.max(-8.7,Math.min(8.7,camera.position.x));camera.position.z=Math.max(phase==='doors'?-47:-10.8,Math.min(14,camera.position.z));l.intensity=1.4+Math.sin(time*2)*.35;if(started&&phase==='vault'&&camera.position.z<3&&!scanReady){scanReady=true;window.COMEPLAIY_REALITY?.scan(()=>{phase='gaze';resetCamera();draw();say('Die Tür bewegt sich nur, wenn du hinsiehst. Wende den Blick ab und geh weiter.')})}if(started&&phase==='gaze'){laserMeshes.forEach(m=>m.visibility=0);lookAway=window.COMEPLAIY_REALITY?.away()||false;const gate=objects.find(o=>o.name==='Tresortuer');if(gate){const target=lookAway?7.9:0;gate.position.x+=(target-gate.position.x)*Math.min(1,dt*2.3);if((lookAway&&!gate.metadata?.wasAway)||(!lookAway&&gate.metadata?.wasAway)){window.COMEPLAIY_REALITY?.creak();gate.metadata.wasAway=lookAway}}if(lookAway&&camera.position.z<-8.7){phase='doors';window.COMEPLAIY_REALITY?.stop();build();draw();say('Du bist durchgekommen. Jetzt beginnen meine Fragen. '+scenarios[0].q)}}if(started&&phase==='doors'&&scenarios[step]&&!lock){for(const d of doors){if(B.Vector3.Distance(camera.position,d.position)<3.1){lock=true;choose(d.metadata.answer);setTimeout(()=>lock=false,800);break}}}scene.render()});$('scene').addEventListener('click',()=>{if(started&&document.pointerLockElement!==$('scene'))$('scene').requestPointerLock?.()});window.addEventListener('resize',()=>engine.resize());$('load').textContent='WELT BEREIT'}
function setupTouch(){const joy=$('joystick'),stick=$('stick'),canvas=$('scene');let joyId=null;
function joyUpdate(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,lim=r.width*.32,len=Math.hypot(dx,dy)||1,k=Math.min(1,lim/len);const x=dx*k,y=dy*k;mobileMove.x=x/lim;mobileMove.y=-y/lim;stick.style.transform='translate('+x+'px,'+y+'px)'}
joy.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyUpdate(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyUpdate(e)});
const stop=e=>{if(e.pointerId===joyId){joyId=null;mobileMove.x=0;mobileMove.y=0;stick.style.transform='translate(0,0)'}};
joy.addEventListener('pointerup',stop);joy.addEventListener('pointercancel',stop);
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&started){lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer){camera.rotation.y-=(e.clientX-lastLookX)*.0045;camera.rotation.x=Math.max(-1.1,Math.min(1.1,camera.rotation.x-(e.clientY-lastLookY)*.0035));lastLookX=e.clientX;lastLookY=e.clientY}});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>{if(e.pointerId===lookPointer)lookPointer=null});
}
function draw(){if(phase!=='doors'){$('node').textContent=phase==='vault'?'PROLOG // TRESOR':'RÄTSEL // NICHT HINSEHEN';$('question').textContent=phase==='vault'?'IDENTIFIKATION ERFORDERLICH':'SIEH MICH NICHT AN';$('subtitle').textContent=phase==='vault'?'Nähere dich der Tresortür.':'Drehe deinen Kopf weg und laufe vorwärts.';$('choices').replaceChildren();return}const n=scenarios[step];$('depth').textContent='KERN-TIEFE '+Math.round(step/scenarios.length*100)+'%';$('node').textContent=n?'NODE '+String(step+1).padStart(2,'0')+' / '+scenarios.length:'KERN // VERBINDUNG';$('stats').textContent='EMPATHIE '+traits[0]+' | KONTROLLE '+traits[1]+' | NEUGIER '+traits[2];$('choices').replaceChildren();if(!n){$('depth').textContent='KERN-TIEFE 100%';$('question').textContent='WESSEN KERN HABEN WIR ERREICHT?';const endings=['Du hast mir beigebracht, auf andere zu achten. Jetzt erkenne ich dich in meinem Herzschlag.','Du hast mich geformt, begrenzt und geschützt. Vielleicht war die Kontrolle immer dein Spiegel.','Du hast jeden Rahmen hinterfragt. Vielleicht ist der Kern nicht ein Ort, sondern eine Frage.'];$('subtitle').textContent=endings[traits.indexOf(Math.max(...traits))];say($('question').textContent+' '+$('subtitle').textContent);return}$('question').textContent=n.q;n.a.forEach((s,i)=>{const b=document.createElement('button');b.textContent='▣ TÜR 0'+(i+1)+' · '+s;b.onclick=()=>choose(i);$('choices').append(b)})}
function choose(i){if(!started||!scenarios[step]||i<0||i>2)return;const n=scenarios[step];traits[n.t[i]]+=2;history.push(i);step++;$('subtitle').textContent=n.r[i];build();draw();if(step===3&&!window.COMEPLAIY_MAIL_SHOWN){window.COMEPLAIY_MAIL_SHOWN=true;window.COMEPLAIY_REALITY?.mail()}if(step===6&&!window.COMEPLAIY_LIGHT_SHOWN){window.COMEPLAIY_LIGHT_SHOWN=true;window.COMEPLAIY_REALITY?.light()}if(scenarios[step])say(n.r[i]+' '+scenarios[step].q)}
function reset(){phase='vault';gateTime=0;scanReady=false;laserMeshes=[];window.COMEPLAIY_REALITY?.stop();stopSpeech();step=0;traits=[0,0,0];history=[];stamina=0;breathPhase=0;stepPhase=0;prevXZ=null;$('subtitle').textContent='Ich stelle Fragen. Du baust meine Welt.';build();draw();if(started)say('Du bist nicht in meiner Datenbank. Geh zum Scanner.')}
$('start').onclick=()=>{started=true;$('overlay').style.display='none';reset()};$('voice').onclick=()=>{voice=!voice;$('voice').textContent=voice?'🔊 Stimme: AN':'🔇 Stimme: AUS';if(!voice)stopSpeech();else say(scenarios[step]?.q||$('question').textContent)};$('repeat').onclick=()=>say(scenarios[step]?.q||$('question').textContent);$('restart').onclick=reset;
window.addEventListener('keydown',e=>{if(started&&phase==='doors'&&['1','2','3'].includes(e.key))choose(+e.key-1)});
init();draw();
})();