'use strict';
const $=s=>document.querySelector(s);
const TEXT={
 es:{'capital-map-choice':'Capitales · mapa · elige',capitalMapChoiceAria:'Mapa de Europa con capitales. Selecciona un punto y elige su nombre entre cuatro opciones.','capital-map':'Capitales · mapa',pickCapital:'Selecciona una capital',identifyCapital:'¿Qué capital es?',capitalMapAria:'Mapa de Europa con capitales. Selecciona un punto y escribe su nombre.',map:'Mapa · encuentra','map-choice':'Mapa · elige','map-write':'Mapa · escribe',pickCountry:'Selecciona un país',identifyCountry:'¿Qué país es?',countryPlaceholder:'País',choice:'Capitales · elige',write:'Capitales · escribe',restart:'Nueva ronda',find:'Encuentra',choose:'Capital de',type:'Capital de',check:'Comprobar',skip:'No lo sé',placeholder:'Capital',perfect:'Correcto',reveal:'Respuesta',completed:'Ronda completada',again:'Volver a jugar',territory:'Territorio',zoomIn:'Ampliar',zoomOut:'Reducir',reset:'Restablecer vista',practice:'Práctica',language:'Idioma',mapAria:'Mapa de Europa. Tab para recorrer territorios, Intro para seleccionar y flechas para mover el mapa.',score:'Puntuación',selected:'Has seleccionado',retry:'1 intento restante'},
 ca:{'capital-map-choice':'Capitals · mapa · tria',capitalMapChoiceAria:'Mapa d’Europa amb capitals. Selecciona un punt i tria’n el nom entre quatre opcions.','capital-map':'Capitals · mapa',pickCapital:'Selecciona una capital',identifyCapital:'Quina capital és?',capitalMapAria:'Mapa d’Europa amb capitals. Selecciona un punt i escriu-ne el nom.',map:'Mapa · troba','map-choice':'Mapa · tria','map-write':'Mapa · escriu',pickCountry:'Selecciona un país',identifyCountry:'Quin país és?',countryPlaceholder:'País',choice:'Capitals · tria',write:'Capitals · escriu',restart:'Nova ronda',find:'Troba',choose:'Capital de',type:'Capital de',check:'Comprovar',skip:'No ho sé',placeholder:'Capital',perfect:'Correcte',reveal:'Resposta',completed:'Ronda completada',again:'Torna a jugar',territory:'Territori',zoomIn:'Ampliar',zoomOut:'Reduir',reset:'Restablir la vista',practice:'Pràctica',language:'Llengua',mapAria:'Mapa d’Europa. Tab per recórrer territoris, Retorn per seleccionar i fletxes per moure el mapa.',score:'Puntuació',selected:'Has seleccionat',retry:'1 intent restant'}
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
const makeRound=()=>({order:shuffle(COUNTRIES.map(c=>c.id)),index:0,answers:[],options:[],draft:'',misses:[],selected:null,complete:false});
const rounds={map:makeRound(),'map-choice':makeRound(),'map-write':makeRound(),choice:makeRound(),write:makeRound(),'capital-map':makeRound(),'capital-map-choice':makeRound()};
const isCapitalMap=()=>mode==='capital-map'||mode==='capital-map-choice';
const isIdentification=()=>mode==='map-choice'||mode==='map-write'||isCapitalMap();
const isMapMode=()=>mode==='map'||isIdentification();
const isWritten=()=>mode==='write'||mode==='map-write'||mode==='capital-map';
const current=()=>rounds[mode];
const target=()=>byId[isIdentification()?current().selected:current().order[current().index]];
const answerName=(c,lang=language)=>mode==='map-choice'||mode==='map-write'?c[lang]:c.capital[lang];
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
// Capital positions come from Natural Earth populated places, not country centers.
const capitalDots=layer.append('g').attr('class','capital-dots').selectAll('g').data(COUNTRIES).join('g')
 .attr('class','capital-marker').attr('data-capital',d=>d.id).attr('role','button');
capitalDots.append('line').attr('class','capital-leader');
capitalDots.append('circle').attr('class','capital-hit').attr('fill','transparent');
capitalDots.append('circle').attr('class','capital-dot');
function positionCapitals(transform){
 const placed=[];
 capitalDots.each(function(d){
  const anchor=transform.apply(projection(d.capitalPoint));let point=anchor;
  // Separate close dots (notably Rome and Vatican City) with a short leader.
  for(let step=0;placed.some(p=>Math.hypot(point[0]-p[0],point[1]-p[1])<22);step++){
   const radius=22*(1+Math.floor(step/12)),angle=step*Math.PI/6;
   point=[anchor[0]+Math.cos(angle)*radius,anchor[1]+Math.sin(angle)*radius];
  }
  placed.push(point);const at=transform.invert(point),origin=transform.invert(anchor),g=d3.select(this);
  g.attr('transform',`translate(${at[0]},${at[1]})`);
  g.select('line').attr('x1',origin[0]-at[0]).attr('y1',origin[1]-at[1]).attr('x2',0).attr('y2',0);
  g.select('.capital-hit').attr('r',10/transform.k);
  g.select('.capital-dot').attr('r',6/transform.k);
 });
}
positionCapitals(d3.zoomIdentity);
capitalDots.on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id,true);})
 .on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(d.id,true);}});
const zoom=d3.zoom().clickDistance(8).filter(event=>{
 // The full map needs no panning; keep wheel and two-finger zoom available.
 if((event.ctrlKey&&event.type!=='wheel')||event.button)return false;
 if(event.type==='mousedown'||event.type==='touchstart')return d3.zoomTransform(svg.node()).k>1||(event.touches?.length??0)>1;
 return true;
}).scaleExtent([1,14]).translateExtent([[-300,-200],[1300,930]]).on('zoom',e=>{layer.attr('transform',e.transform);micro.attr('r',7/e.transform.k);microTargets.attr('r',18/e.transform.k);positionCapitals(e.transform);});
svg.call(zoom).on('dblclick.zoom',null);
$('#zoom-in').onclick=()=>svg.transition().duration(180).call(zoom.scaleBy,1.6);
$('#zoom-out').onclick=()=>svg.transition().duration(180).call(zoom.scaleBy,1/1.6);
$('#zoom-reset').onclick=()=>svg.transition().duration(180).call(zoom.transform,d3.zoomIdentity);
svg.on('keydown',e=>{const dirs={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(dirs[e.key]){e.preventDefault();svg.call(zoom.translateBy,...dirs[e.key]);}});
function selectCountry(id,capitalPoint=false){
 if(isCapitalMap()&&!capitalPoint)return;
 const r=current();if(!isMapMode()||!byId[id]||r.complete||answered(r))return;
 if(!isIdentification()){submit(id);return;}
 if(r.answers.some(a=>a.countryId===id)||r.selected===id)return;
 r.selected=id;r.options=[];r.draft='';render();
 $('#capital-panel').scrollIntoView({block:'nearest'});
 (isWritten()?$('#answer-input'):$('.option')).focus({preventScroll:true});
}
countryGroups.on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(d.id);}});
micro.on('click',(e,d)=>{if(!e.defaultPrevented)selectCountry(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(d.id);}});
function applyLanguage(){
 document.documentElement.lang=language;document.title=language==='ca'?'Països i capitals':'Países y capitales';
 for(const key of Object.keys(rounds))$('#tab-'+key).textContent=t(key);
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
 const r=current();if(r.complete||answered(r)||!target())return;
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
 if(isWritten()&&!skip){if(!normalize(value))return;answer={...answer,...spellingScore(value,answerName(target()))};}
 else if(!skip)answer.score=value===target().id?100:0;
 r.answers.push(answer);render();
}
function next(){const r=current();if(!answered(r)||r.complete)return;if(r.index===49)r.complete=true;else{r.index++;r.options=[];r.draft='';r.misses=[];r.selected=null;}if(mode==='map')svg.call(zoom.transform,d3.zoomIdentity);render();if(mode==='write'&&!r.complete)$('#answer-input').focus({preventScroll:true});else $('#country-name').focus({preventScroll:true});}
function restart(){rounds[mode]=makeRound();if(isMapMode())svg.call(zoom.transform,d3.zoomIdentity);render();}
function feedbackHTML(a,c){
 const tone=a.score===100?'correct':a.score>0?'partial':'wrong';
 if(mode==='map'){
  const message=a.score>0?t('perfect'):a.skipped?escaped(c[language]):t('selected')+': '+escaped(byId[a.value][language]);
  return `<span class="${tone}"><strong>${a.score} %</strong> · ${message}</span>`;
 }
 const answer=answerName(c,a.language);
 return `<span class="${tone}"><strong>${a.score} %</strong> · ${a.score===100?t('perfect'):escaped(answer)}</span>`;
}
function renderCapital(r,c){
 const panel=$('#capital-panel'),a=r.answers[r.index];panel.innerHTML='';
 if(mode==='choice'||mode==='map-choice'||mode==='capital-map-choice'){
  const box=document.createElement('div');box.className='options';
  makeOptions(r).forEach(id=>{const button=document.createElement('button');button.className='option'+(a&&(id===c.id?' correct':id===a.value?' wrong':'')||'');button.disabled=!!a;button.textContent=mode==='map-choice'?byId[id][language]:byId[id].capital[language];button.onclick=()=>submit(id);box.append(button);});panel.append(box);
 }else{
  const placeholder=t(mode==='map-write'?'countryPlaceholder':'placeholder');
  panel.innerHTML=`<form class="answer-form"><div class="answer-row"><input id="answer-input" aria-label="${placeholder}" type="text" maxlength="100" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required placeholder="${placeholder}" ${a?'disabled':''}><button class="primary" type="submit" ${a?'disabled':''}>${t('check')}</button></div></form>`;
  const input=$('#answer-input');input.value=a&&!a.skipped?a.value:r.draft;input.oninput=()=>{r.draft=input.value;};
  $('.answer-form').onsubmit=e=>{e.preventDefault();submit(input.value);};
 }
}
function render(){
 clearTimeout(advanceTimer);
 const r=current(),c=target(),a=r.answers[r.index],done=!!a;
 document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('#map-panel').hidden=!isMapMode()||r.complete;
 $('#capital-panel').hidden=!r.complete&&(mode==='map'||(isIdentification()&&!c));
 $('.play-area').classList.toggle('identifying',isIdentification()&&!!c&&!r.complete);
 $('#progress-count').textContent=(isIdentification()?r.answers.length:r.complete?50:r.index+1)+' / 50';$('#progress-fill').style.width=r.answers.length*2+'%';
 $('#score').textContent=average(r)===null?'—':average(r)+' %';$('#score').setAttribute('aria-label',t('score')+': '+$('#score').textContent);
 $('#question-label').textContent=r.complete||isIdentification()?'':t(mode==='map'?'find':mode==='choice'?'choose':'type');
 $('#question-label').hidden=r.complete||isIdentification();
 $('#country-name').textContent=r.complete?t('completed'):isIdentification()?t(isCapitalMap()?(c?'identifyCapital':'pickCapital'):(c?'identifyCountry':'pickCountry')):c[language];
 $('#feedback').innerHTML=r.complete?'':done?feedbackHTML(a,c):mode==='map'&&r.misses.length?`<span class="wrong">${t('selected')}: <strong>${escaped(byId[r.misses.at(-1)][language])}</strong> · ${t('retry')}</span>`:'';
 $('#skip').hidden=done||r.complete||!c;$('#restart').hidden=r.complete;
 $('#map-panel').classList.toggle('locked',done);
 const mapRound=isMapMode()?r:rounds.map;
 const history=new Map(mapRound.answers.map(answer=>[answer.countryId,(mode==='map-write'||mode==='capital-map')&&answer.score>0&&answer.score<100?'partial':answer.score>0?'correct':'failed']));
 const wrongSelection=mode==='map'?(done?(a.score===0&&!a.skipped?a.value:null):r.misses.at(-1)):null;
 function paint(selection,getId,enabled=true){
  selection.classed('answered-correct',d=>enabled&&history.get(getId(d))==='correct')
   .classed('answered-failed',d=>enabled&&history.get(getId(d))==='failed')
   .classed('answered-partial',d=>enabled&&history.get(getId(d))==='partial')
   .classed('is-question',d=>enabled&&isIdentification()&&!done&&c?.id===getId(d))
   .classed('selected-wrong',d=>enabled&&getId(d)===wrongSelection);
 }
 const locked=id=>done||r.complete||(isIdentification()&&history.has(id));
 const capitals=isCapitalMap();
 $('#map-panel').classList.toggle('capital-map',capitals);
 $('#map').setAttribute('aria-label',t(capitals?(mode==='capital-map-choice'?'capitalMapChoiceAria':'capitalMapAria'):'mapAria'));
 countryGroups.attr('aria-hidden',capitals?'true':null);
 micro.attr('display',capitals?'none':null);microTargets.attr('display',capitals?'none':null);
 capitalDots.attr('display',capitals?null:'none').attr('aria-hidden',capitals?null:'true')
  .attr('aria-label',(d,i)=>t('placeholder')+' '+(i+1)).attr('aria-disabled',d=>String(locked(d.id)))
  .attr('tabindex',d=>capitals&&!locked(d.id)?0:-1);
 paint(countryGroups.attr('aria-disabled',d=>String(capitals||locked(d.id))).attr('tabindex',d=>capitals||locked(d.id)||smallIds.includes(d.id)?-1:0).selectAll('path'),d=>d.properties.id,!capitals);
 paint(micro.attr('aria-disabled',d=>String(locked(d.id))).attr('tabindex',d=>capitals||locked(d.id)?-1:0),d=>d.id,!capitals);
 paint(capitalDots,d=>d.id,capitals);
 if(r.complete){$('#capital-panel').className='complete';$('#capital-panel').innerHTML=`<strong>${average(r)} %</strong><button class="primary" id="play-again">${t('again')}</button>`;$('#play-again').onclick=restart;}
 else{$('#capital-panel').className='capital-panel';if(mode!=='map'&&c)renderCapital(r,c);}
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
 const snapshot=()=>({mode,language,country:isIdentification()?null:target()?.[language],countrySelected:!!target(),question:current().index+1,answered:answered(current()),completed:current().complete,score:average(current())});
 const register=(tool)=>{try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}};
 register({name:'get_practice_state',description:'Read the current visible practice question and round progress, without revealing the answer.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>snapshot()});
 register({name:'switch_practice',description:'Switch the active practice tab, retaining each round’s progress.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:Object.keys(rounds)}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{switchMode(input.mode);return snapshot();}});
}
