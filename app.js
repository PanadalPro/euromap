'use strict';
const $=s=>document.querySelector(s);
const TEXT={
 es:{map:'Mapa',choice:'Capitales · elige',write:'Capitales · escribe',restart:'Nueva ronda',find:'Encuentra',choose:'Capital de',type:'Capital de',check:'Comprobar',skip:'No lo sé',placeholder:'Capital',perfect:'Correcto',reveal:'Respuesta',completed:'Ronda completada',again:'Volver a jugar',territory:'Territorio',zoomIn:'Ampliar',zoomOut:'Reducir',reset:'Restablecer vista',practice:'Práctica',language:'Idioma',mapAria:'Mapa de Europa. Tab para recorrer territorios, Intro para seleccionar y flechas para mover el mapa.',score:'Puntuación',selected:'Has seleccionado',retry:'1 intento restante'},
 ca:{map:'Mapa',choice:'Capitals · tria',write:'Capitals · escriu',restart:'Nova ronda',find:'Troba',choose:'Capital de',type:'Capital de',check:'Comprovar',skip:'No ho sé',placeholder:'Capital',perfect:'Correcte',reveal:'Resposta',completed:'Ronda completada',again:'Torna a jugar',territory:'Territori',zoomIn:'Ampliar',zoomOut:'Reduir',reset:'Restablir la vista',practice:'Pràctica',language:'Llengua',mapAria:'Mapa d’Europa. Tab per recórrer territoris, Retorn per seleccionar i fletxes per moure el mapa.',score:'Puntuació',selected:'Has seleccionat',retry:'1 intent restant'}
};
function normalize(s){return s.normalize('NFC').toLocaleLowerCase().trim().replace(/\s+/g,' ');}
function accentBase(s){return s.normalize('NFD').replace(/[\u0300-\u0308]/g,'').normalize('NFC');}
function spellingScore(input,expected){
 const a=Array.from(normalize(input)),b=Array.from(normalize(expected));
 const d=Array.from({length:a.length+1},()=>Array(b.length+1));d[0][0]={cost:0,accents:0,letters:0};
 const add=(v,cost,accents,letters)=>({cost:v.cost+cost,accents:v.accents+accents,letters:v.letters+letters});
 for(let i=1;i<=a.length;i++)d[i][0]=add(d[i-1][0],1,0,1);
 for(let j=1;j<=b.length;j++)d[0][j]=add(d[0][j-1],1,0,1);
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  const same=a[i-1]===b[j-1],accent=!same&&accentBase(a[i-1])===accentBase(b[j-1]);
  const candidates=[add(d[i-1][j-1],same?0:accent?.25:1,accent?1:0,same||accent?0:1),add(d[i-1][j],1,0,1),add(d[i][j-1],1,0,1)];
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])candidates.push(add(d[i-2][j-2],1,0,1));
  d[i][j]=candidates.reduce((best,x)=>x.cost<best.cost?x:best);
 }
 const result=d[a.length][b.length],length=Math.max(a.length,b.length,1);
 return {...result,score:Math.max(0,Math.min(result.cost?99:100,Math.round(100*(1-result.cost/length))))};
}
const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const byId=Object.fromEntries(COUNTRIES.map(c=>[c.id,c]));
let savedLanguage;try{savedLanguage=localStorage.getItem('europa.language');}catch{}
let language=['es','ca'].includes(savedLanguage)?savedLanguage:'es',mode='map',advanceTimer=null;
const makeRound=()=>({order:shuffle(COUNTRIES.map(c=>c.id)),index:0,answers:[],options:[],draft:'',misses:[],complete:false});
const rounds={map:makeRound(),choice:makeRound(),write:makeRound()};
const current=()=>rounds[mode];const target=()=>byId[current().order[current().index]];
const t=key=>TEXT[language][key];const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const average=r=>r.answers.length?Math.round(r.answers.reduce((n,a)=>n+a.score,0)/r.answers.length):null;
const answered=r=>!!r.answers[r.index];
const projection=d3.geoAzimuthalEqualArea().rotate([-15,-53]).scale(850).translate([500,345]).clipExtent([[0,0],[1000,730]]);
const svg=d3.select('#map').attr('tabindex','0');const layer=svg.append('g');
layer.append('path').datum(d3.geoGraticule().step([10,10])()).attr('class','graticule').attr('d',d3.geoPath(projection));
layer.selectAll('.context-country').data(GEOGRAPHY.features.filter(f=>!f.properties.play)).join('path').attr('class','context-country').attr('d',d3.geoPath(projection));
const countryGroups=layer.selectAll('.country-group').data(COUNTRIES).join('g').attr('class','country-group').attr('data-country',d=>d.id).attr('tabindex','0').attr('role','button');
countryGroups.each(function(country){d3.select(this).selectAll('path').data(GEOGRAPHY.features.filter(f=>f.properties.id===country.id)).join('path').attr('class','country').attr('d',d3.geoPath(projection));});
const smallIds=['AND','LIE','LUX','SMR','MCO','VAT','MLT'];
// Place touch targets above every country so surrounding polygons cannot hide them.
const microTargets=layer.selectAll('.micro-target').data(COUNTRIES.filter(c=>smallIds.includes(c.id))).join('circle').attr('class','micro-target').attr('cx',d=>projection(d.point)[0]).attr('cy',d=>projection(d.point)[1]).attr('r',18).attr('fill','transparent').attr('aria-hidden','true').on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id);});
const micro=layer.selectAll('.micro').data(COUNTRIES.filter(c=>smallIds.includes(c.id))).join('circle').attr('class','micro').attr('data-country',d=>d.id).attr('cx',d=>projection(d.point)[0]).attr('cy',d=>projection(d.point)[1]).attr('r',7).attr('role','button').attr('tabindex','0');
const zoom=d3.zoom().scaleExtent([1,14]).translateExtent([[-300,-200],[1300,930]]).on('zoom',e=>{layer.attr('transform',e.transform);micro.attr('r',7/e.transform.k);microTargets.attr('r',18/e.transform.k);});
svg.call(zoom).on('dblclick.zoom',null);
$('#zoom-in').onclick=()=>svg.transition().duration(180).call(zoom.scaleBy,1.6);
$('#zoom-out').onclick=()=>svg.transition().duration(180).call(zoom.scaleBy,1/1.6);
$('#zoom-reset').onclick=()=>svg.transition().duration(180).call(zoom.transform,d3.zoomIdentity);
svg.on('keydown',e=>{const dirs={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(dirs[e.key]){e.preventDefault();svg.call(zoom.translateBy,...dirs[e.key]);}});
function selectCountry(id){if(mode!=='map'||!byId[id])return;submit(id);}
countryGroups.on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(d.id);}});
micro.on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(d.id);}});
function applyLanguage(){
 document.documentElement.lang=language;document.title=language==='ca'?'Països i capitals':'Países y capitales';
 for(const key of ['map','choice','write'])$('#tab-'+key).textContent=t(key);
 $('#restart').textContent=t('restart');$('#skip').textContent=t('skip');$('#language').value=language;
 $('#language').setAttribute('aria-label',t('language'));$('#tabs').setAttribute('aria-label',t('practice'));
 $('#map').setAttribute('aria-label',t('mapAria'));$('#zoom-in').setAttribute('aria-label',t('zoomIn'));$('#zoom-out').setAttribute('aria-label',t('zoomOut'));$('#zoom-reset').setAttribute('aria-label',t('reset'));
 countryGroups.attr('aria-label',(d,i)=>t('territory')+' '+(i+1));micro.attr('aria-label',d=>t('territory')+' '+(COUNTRIES.indexOf(d)+1));
 render();
}
function setLanguage(value){if(!['es','ca'].includes(value))throw new Error('Invalid language');language=value;try{localStorage.setItem('europa.language',value);}catch{}if($('#welcome').open)$('#welcome').close();applyLanguage();}
function switchMode(value){if(!Object.hasOwn(rounds,value))throw new Error('Invalid mode');mode=value;render();}
function makeOptions(r){if(!r.options.length)r.options=shuffle([target().id,...shuffle(COUNTRIES.filter(c=>c.id!==target().id).map(c=>c.id)).slice(0,3)]);return r.options;}
function submit(value,skip=false){
 const r=current();if(r.complete||answered(r))return;
 let answer={value,language,countryId:target().id,skipped:skip,score:0};
 if(mode==='map'&&!skip){
  if(!byId[value])return;
  if(value!==target().id){
   r.misses.push(value);
   if(r.misses.length<2){render();return;}
  }else answer.score=r.misses.length?50:100;
  answer.attempts=r.misses.length+(value===target().id?1:0);
  r.answers.push(answer);render();return;
 }
 if(mode==='write'&&!skip){if(!normalize(value))return;answer={...answer,...spellingScore(value,target().capital[language])};}
 else if(!skip)answer.score=value===target().id?100:0;
 r.answers.push(answer);render();
}
function next(){const r=current();if(!answered(r)||r.complete)return;if(r.index===49)r.complete=true;else{r.index++;r.options=[];r.draft='';r.misses=[];}if(mode==='map')svg.call(zoom.transform,d3.zoomIdentity);render();if(mode==='write'&&!r.complete)$('#answer-input').focus({preventScroll:true});else $('#country-name').focus({preventScroll:true});}
function restart(){rounds[mode]=makeRound();if(mode==='map')svg.call(zoom.transform,d3.zoomIdentity);render();}
function feedbackHTML(a,c){
 const tone=a.score===100?'correct':a.score>0?'partial':'wrong';
 if(mode==='map'){
  const message=a.score>0?t('perfect'):a.skipped?escaped(c[language]):t('selected')+': '+escaped(byId[a.value][language]);
  return `<span class="${tone}"><strong>${a.score} %</strong> · ${message}</span>`;
 }
 const answer=c.capital[a.language];
 return `<span class="${tone}"><strong>${a.score} %</strong> · ${a.score===100?t('perfect'):escaped(answer)}</span>`;
}
function renderCapital(r,c){
 const panel=$('#capital-panel'),a=r.answers[r.index];panel.innerHTML='';
 if(mode==='choice'){
  const box=document.createElement('div');box.className='options';
  makeOptions(r).forEach(id=>{const button=document.createElement('button');button.className='option'+(a&&(id===c.id?' correct':id===a.value?' wrong':'')||'');button.disabled=!!a;button.textContent=byId[id].capital[language];button.onclick=()=>submit(id);box.append(button);});panel.append(box);
 }else{
  panel.innerHTML=`<form class="answer-form"><div class="answer-row"><input id="answer-input" aria-label="${t('placeholder')}" type="text" maxlength="100" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required placeholder="${t('placeholder')}" ${a?'disabled':''}><button class="primary" type="submit" ${a?'disabled':''}>${t('check')}</button></div></form>`;
  const input=$('#answer-input');input.value=a&&!a.skipped?a.value:r.draft;input.oninput=()=>{r.draft=input.value;};
  $('.answer-form').onsubmit=e=>{e.preventDefault();submit(input.value);};
 }
}
function render(){
 clearTimeout(advanceTimer);
 const r=current(),c=target(),a=r.answers[r.index],done=!!a;
 document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('#map-panel').hidden=mode!=='map'||r.complete;$('#capital-panel').hidden=mode==='map'&&!r.complete;
 $('#progress-count').textContent=(r.complete?50:r.index+1)+' / 50';$('#progress-fill').style.width=r.answers.length*2+'%';
 $('#score').textContent=average(r)===null?'—':average(r)+' %';$('#score').setAttribute('aria-label',t('score')+': '+$('#score').textContent);
 $('#question-label').textContent=r.complete?'':t(mode==='map'?'find':mode==='choice'?'choose':'type');
 $('#country-name').textContent=r.complete?t('completed'):c[language];
 $('#feedback').innerHTML=r.complete?'':done?feedbackHTML(a,c):mode==='map'&&r.misses.length?`<span class="wrong">${t('selected')}: <strong>${escaped(byId[r.misses.at(-1)][language])}</strong> · ${t('retry')}</span>`:'';
 $('#skip').hidden=done||r.complete;$('#restart').hidden=r.complete;
 $('#map-panel').classList.toggle('locked',done);
 const mapRound=rounds.map;
 const history=new Map(mapRound.answers.map(answer=>[answer.countryId,answer.score>0?'correct':'failed']));
 const wrongSelection=mode==='map'?(done?(a.score===0&&!a.skipped?a.value:null):r.misses.at(-1)):null;
 function paint(selection,getId){
  selection.classed('answered-correct',d=>history.get(getId(d))==='correct')
   .classed('answered-failed',d=>history.get(getId(d))==='failed')
   .classed('selected-wrong',d=>getId(d)===wrongSelection);
 }
 paint(countryGroups.attr('aria-disabled',String(done)).attr('tabindex',d=>done||smallIds.includes(d.id)?-1:0).selectAll('path'),d=>d.properties.id);
 paint(micro.attr('aria-disabled',String(done)).attr('tabindex',done?-1:0),d=>d.id);
 if(r.complete){$('#capital-panel').className='complete';$('#capital-panel').innerHTML=`<strong>${average(r)} %</strong><button class="primary" id="play-again">${t('again')}</button>`;$('#play-again').onclick=restart;}
 else{$('#capital-panel').className='capital-panel';if(mode!=='map')renderCapital(r,c);}
 if(done&&!r.complete)advanceTimer=setTimeout(next,a.score===100||(mode==='map'&&a.score>0)?1500:3500);
}
$('#language').onchange=e=>setLanguage(e.target.value);
document.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.language));
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));
$('#skip').onclick=()=>submit('',true);$('#restart').onclick=restart;
$('#welcome').addEventListener('cancel',e=>e.preventDefault());
applyLanguage();if(!['es','ca'].includes(savedLanguage))$('#welcome').showModal();
// The same controls are available to browsers supporting the WebMCP proposal.
if(document.modelContext?.registerTool){
 const snapshot=()=>({mode,language,country:target()[language],question:current().index+1,answered:answered(current()),completed:current().complete,score:average(current())});
 const register=(tool)=>{try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}};
 register({name:'get_practice_state',description:'Read the current visible practice question and round progress, without revealing the answer.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>snapshot()});
 register({name:'switch_practice',description:'Switch the active practice tab, retaining each round’s progress.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['map','choice','write']}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{switchMode(input.mode);return snapshot();}});
}
