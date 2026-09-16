/* Shared, data-driven playback for each independent four-panel explorer. */
(function (root) {
  'use strict';
  const palette = ['#0d5960', '#ad5737', '#657da9', '#87719a', '#897127', '#427e68'];
  const colors = {Melt:'#aa4b2c',Olivine:'#427e68',Orthopyroxene:'#897127',Clinopyroxene:'#657da9',Garnet:'#a34d73',Spinel:'#765b92',Plagioclase:'#2698a1'};
  const colorFor = (name,i=0) => colors[name] || palette[i % palette.length];
  const percent = value => `${Number((value * 100).toFixed(2))}%`;
  function validate(data) {
    if (!data || !Array.isArray(data.degree) || data.degree.length < 2) throw new Error('At least two model steps are required.');
    const length = data.degree.length;
    const numeric = values => Array.isArray(values) && values.length === length && values.every(Number.isFinite);
    const measured = values => Array.isArray(values) && values.length === length && values.every((v,i)=>Number.isFinite(v)||(data.initialState && i===0 && v===null));
    if (!numeric(data.degree) || data.degree.some((v, i) => v < 0 || v > 1 || (i && v <= data.degree[i - 1]))) throw new Error('Degrees must increase strictly within 0–1.');
    if (!numeric(data.melt) || data.melt.some(v => v < 0 || v > 1)) throw new Error('Melt fractions must be within 0–1.');
    if (!Array.isArray(data.minerals) || !data.minerals.length) throw new Error('Mineral fractions are required.');
    for (const mineral of data.minerals) {
      if (!mineral.name || !numeric(mineral.values) || mineral.values.some(v => v < 0 || v > 1)) throw new Error('Each mineral needs a name and valid fractions at every step.');
    }
    data.degree.forEach((_, i) => {
      if (Math.abs(data.melt[i] + data.minerals.reduce((sum, m) => sum + m.values[i], 0) - 1) > 0.001) throw new Error('Melt and mineral fractions must sum to one at each step.');
    });
    if (!Array.isArray(data.charts) || data.charts.length !== 2) throw new Error('Two melt-composition charts are required.');
    for (const chart of data.charts) {
      if (!chart.title || !chart.yLabel || !Array.isArray(chart.series) || !chart.series.length) throw new Error('Charts need titles, units, and series.');
      for (const series of chart.series) {
        if (!series.name || !measured(series.values) || series.values.some(v => v < 0)) throw new Error('Each concentration series needs nonnegative values at every step.');
      }
    }
    if(data.proportions){
      for(const series of data.proportions) if(!measured(series.values)||series.values.some(v=>v<0||v>100.000001)) throw new Error('Invalid normalized mineral proportions.');
      data.degree.forEach((_,i)=>{if(data.initialState && i===0)return; if(Math.abs(data.proportions.reduce((a,s)=>a+s.values[i],0)-100)>0.001) throw new Error('Normalized mineral proportions must sum to 100.');});
    }
    return data;
  }
  function frame(data, index) {
    const step = Math.min(data.degree.length - 1, Math.max(0, Math.floor(index)));
    return {
      step, degree: data.degree[step], melt: data.melt[step],
      minerals: data.minerals.map(m => ({ name: m.name, fraction: m.values[step] })),
      degrees: data.degree.slice(0, step + 1),
      phaseSeries: (data.proportions || data.minerals).map(m => ({ name: m.name, values: m.values.slice(0, step + 1) })),
      charts: data.charts.map(c => ({ ...c, series: c.series.map(s => ({ ...s, values: s.values.slice(0, step + 1) })) })),
    };
  }
  function svgNode(tag, attributes = {}, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function svg(title) {
    const node = svgNode('svg', { viewBox: '0 0 520 330', role: 'img', 'aria-label': title });
    node.append(svgNode('title', {}, title));
    return node;
  }
  function legend(series, fractions) {
    const list = document.createElement('ul');
    list.className = 'plot-legend';
    series.forEach((series, i) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.backgroundColor = colorFor(series.name,i);
      item.append(swatch, document.createTextNode(series.name + (fractions ? ` ${percent(series.fraction)}` : '')));
      list.append(item);
    });
    return list;
  }
  const abbreviations={Olivine:'ol',Orthopyroxene:'opx',Clinopyroxene:'cpx',Garnet:'gt',Spinel:'sp',Plagioclase:'plg'};
  const hash = n => {const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function polygonArea(p){return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;}
  function clipPolygon(poly,a,b,c){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;
      if(dp<=1e-12)out.push(p);
      if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
    }
    return out;
  }
  let cells;
  function rockCells(){
    if(cells)return cells;
    const seeds=[];
    for(let j=0;j<10;j++)for(let i=0;i<18;i++){const n=j*18+i;seeds.push([(i+.15+.7*hash(n+1))/18,(j+.15+.7*hash(n+201))/10]);}
    cells=seeds.map((p,id)=>{
      let polygon=[[0,0],[1,0],[1,1],[0,1]];
      seeds.forEach((q,j)=>{if(j!==id)polygon=clipPolygon(polygon,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]*q[0]+q[1]*q[1]-p[0]*p[0]-p[1]*p[1]);});
      return {id,polygon,depth:Math.min(p[0],1-p[0],p[1],1-p[1])+.045*hash(id+901)};
    });
    return cells;
  }
  function splitArea(polygon,target){
    let lo=0,hi=1;
    for(let i=0;i<38;i++){const mid=(lo+hi)/2;if(polygonArea(clipPolygon(polygon,1,0,mid))<target)lo=mid;else hi=mid;}
    const cut=(lo+hi)/2;
    return [clipPolygon(polygon,1,0,cut),clipPolygon(polygon,-1,0,-cut)];
  }
  function phaseRegions(current,kind){
    const phases=[...current.minerals,{name:'Melt',fraction:current.melt}];
    const remaining=phases.map(p=>p.fraction),result=[];
    const ordered=[...rockCells()].sort((a,b)=>kind==='crystallization'?a.depth-b.depth:hash(a.id+700)-hash(b.id+700));
    for(const cell of ordered){
      let polygon=cell.polygon,area=polygonArea(polygon),part=0;
      while(area>1e-10){
        const solid=remaining.slice(0,-1).reduce((a,b)=>a+b,0);
        const eligible=remaining.map((v,i)=>kind==='crystallization'&&solid>1e-10&&i===phases.length-1?0:v);
        let pick=hash(cell.id*17+(part++)+330)*eligible.reduce((a,b)=>a+b,0),idx=eligible.length-1;
        for(let i=0;i<eligible.length;i++){pick-=eligible[i];if(pick<0){idx=i;break;}}
        if(remaining[idx]<1e-10)idx=remaining.findIndex(v=>v>1e-10);
        if(idx<0)break;
        const take=Math.min(area,remaining[idx]);
        let region=polygon;
        if(take<area-1e-10)[region,polygon]=splitArea(polygon,take);
        result.push({name:phases[idx].name,polygon:region,depth:cell.depth,seed:cell.id});
        remaining[idx]=Math.max(0,remaining[idx]-take);area-=take;
      }
    }
    return result;
  }
  // Geometry is a history of transfers, not a fresh allocation for every frame.
  // Only a phase with a net loss can donate area; growing phases keep all their area.
  function advanceRegions(previous,current,kind){
    const target=Object.fromEntries([...current.minerals,{name:'Melt',fraction:current.melt}].map(p=>[p.name,p.fraction]));
    const totals={};previous.forEach(r=>totals[r.name]=(totals[r.name]||0)+polygonArea(r.polygon));
    const losses={},gains={};
    for(const name of Object.keys(target)){const delta=target[name]-(totals[name]||0);if(delta>1e-10)gains[name]=delta;else if(delta< -1e-10)losses[name]=-delta;}
    const ordered=[...previous].sort((a,b)=>kind==='crystallization'?a.depth-b.depth:hash(a.seed+123)-hash(b.seed+123));
    const result=[];
    for(const old of ordered){
      let polygon=old.polygon,area=polygonArea(polygon),donate=Math.min(area,losses[old.name]||0);
      if(donate<1e-10){result.push(old);continue;}
      losses[old.name]-=donate;
      while(donate>1e-10){
        const recipients=Object.keys(gains).filter(n=>gains[n]>1e-10);
        if(!recipients.length)break;
        // Stable choice distributes the new phases among the shrinking regions.
        const name=recipients[Math.floor(hash(old.seed+current.step*13)*recipients.length)];
        const take=Math.min(donate,gains[name]);let transfer=polygon;
        if(take<area-1e-10)[transfer,polygon]=splitArea(polygon,take);
        result.push({...old,name,polygon:transfer});
        gains[name]-=take;donate-=take;area-=take;
      }
      if(area>1e-10)result.push({...old,polygon});
    }
    return result;
  }
  const regionHistory=new WeakMap();
  function trajectoryRegions(data,kind,index){
    let histories=regionHistory.get(data);if(!histories){histories={};regionHistory.set(data,histories);}
    const history=histories[kind]||(histories[kind]=[phaseRegions(frame(data,0),kind)]);
    while(history.length<=index)history.push(advanceRegions(history.at(-1),frame(data,history.length),kind));
    return history[index];
  }
  function phaseSchematic(current,kind,regions) {
    const phases=[{name:'Melt',fraction:current.melt},...current.minerals];
    const diagram=svg('Schematic of phase changes');
    diagram.setAttribute('viewBox','0 45 520 260');
    const title=document.createElement('p');title.className='schematic-title';title.textContent='Schematic of phase changes';
    const subtitle=document.createElement('span');subtitle.className='schematic-subtitle';subtitle.textContent='(for illustration only)';title.append(subtitle);
    for(const region of regions){
      const points=region.polygon.map(p=>`${34+p[0]*452},${60+p[1]*230}`).join(' ');
      diagram.append(svgNode('polygon',{points,fill:colorFor(region.name),'data-phase':region.name}));
    }
    diagram.append(svgNode('rect',{x:34,y:60,width:452,height:230,fill:'none',stroke:'#52686a'}));
    const note=document.createElement('p');note.className='schematic-note';note.textContent='Colored area represents each phase proportion';
    return [title,diagram,note,legend(phases,true)];
  }
  function chartPlot(degrees,series,fullDegrees,domain,yLabel,xLabel,labels=null){
    const chart=svg(`${yLabel} versus ${xLabel}`),[yMin,yMax]=domain;
    chart.setAttribute('data-y-min',yMin);chart.setAttribute('data-y-max',yMax);
    const x=value=>70+(value-fullDegrees[0])/(fullDegrees.at(-1)-fullDegrees[0])*370;
    const y=value=>264-(value-yMin)/(yMax-yMin)*214;
    const yTicks=yLabel==='Melt La (ppm)'?[0,5.5,11.5,17.5,23.5]:Array.from({length:5},(_,i)=>yMin+(yMax-yMin)*i/4);
    for(const tick of yTicks){
      chart.append(svgNode('line',{x1:70,x2:440,y1:y(tick),y2:y(tick),stroke:'#e1e9e6'}));
      chart.append(svgNode('text',{x:61,y:y(tick)+4,'text-anchor':'end',class:'tick-label'},Number(tick.toFixed(2)).toString()));
    }
    for(let i=0;i<=4;i++){
      const degree=fullDegrees[0]+(fullDegrees.at(-1)-fullDegrees[0])*i/4;
      chart.append(svgNode('text',{x:x(degree),y:284,'text-anchor':'middle',class:'tick-label'},percent(degree)));
    }
    chart.append(svgNode('path',{d:'M70 50V264H440',fill:'none',stroke:'#839991'}));
    chart.append(svgNode('text',{x:70,y:25,class:'axis-label'},yLabel));
    chart.append(svgNode('text',{x:280,y:318,'text-anchor':'middle',class:'axis-label'},xLabel));
    chart.append(svgNode('line',{x1:x(degrees.at(-1)),x2:x(degrees.at(-1)),y1:50,y2:264,stroke:'#9baaa5','stroke-dasharray':'3 4'}));
    if(series.every(s=>s.values.every(v=>v===null)))chart.append(svgNode('text',{x:260,y:155,'text-anchor':'middle',class:'tick-label'},'Available from the first calculated step'));
    series.forEach((s,i)=>{
      const valid=s.values.map((v,j)=>({v,j})).filter(p=>p.v!==null),color=colorFor(s.name,i);
      chart.append(svgNode('path',{d:valid.map((p,k)=>`${k?'L':'M'}${x(degrees[p.j])},${y(p.v)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5,'data-series':s.name}));
      if(valid.length){const end=valid.at(-1);chart.append(svgNode('circle',{cx:x(degrees[end.j]),cy:y(end.v),r:3.5,fill:color}));}
    });
    if(labels){
      const anchors=labels.series.map(s=>labels.side==='left'?s.values.find(v=>v!==null):s.values.at(-1));
      const positions=anchors.map(v=>y(v)-(labels.side==='left'?12:0)),order=positions.map((v,i)=>i).sort((a,b)=>positions[a]-positions[b]);
      order.forEach((idx,j)=>{if(j)positions[idx]=Math.max(positions[idx],positions[order[j-1]]+20);});
      const overflow=Math.max(0,Math.max(...positions)-264);positions.forEach((v,i)=>positions[i]=v-overflow);
      labels.series.forEach((s,i)=>{
        const left=labels.side==='left',color=colorFor(s.name,i),finished=degrees.length===fullDegrees.length;
        const inset=left&&(s.name==='Olivine'||s.name==='Orthopyroxene');
        const labelY=inset?y(anchors[i])-15:positions[i];
        if(left||finished)chart.append(svgNode('path',{d:inset?`M70 ${y(anchors[i])}L87 ${labelY+2}`:left?`M70 ${y(anchors[i])}H66V${positions[i]}H36`:`M440 ${y(anchors[i])}L448 ${positions[i]}`,stroke:color,'stroke-width':.8,fill:'none','data-label-leader':s.name}));
        chart.append(svgNode('text',{x:inset?91:left?31:452,y:labelY+4,'text-anchor':left&&!inset?'end':'start',fill:color,'font-size':16,'data-mineral-label':s.name},abbreviations[s.name]||s.name));
      });
      return [chart,legend(series)];
    }
    return [chart];
  }
  function playbackDegree(elapsed,startDegree,first,last){
    const duration=10000,hold=750,offset=(startDegree-first)/(last-first)*duration;
    const phase=(elapsed+offset)%(duration+hold);
    return first+Math.min(1,phase/duration)*(last-first);
  }
  function mount(container, supplied) {
    const play = container.querySelector('[data-action="play"]');
    const reset = container.querySelector('[data-action="reset"]');
    const slider = container.querySelector('input[type="range"]');
    const output = container.querySelector('[data-degree]');
    const status = container.querySelector('.explorer-status');
    if (!supplied) return; // Keep honest empty panels and disabled controls until data arrive.
    let data;
    try { data = validate(supplied); } catch (error) {
      status.textContent = 'The model data could not be displayed. The data need to be checked.';
      console.warn(`Invalid ${container.dataset.model} data: ${error.message}`);
      return;
    }
    const kind = container.dataset.model;
    const xLabel = `${kind === 'melting' ? 'Melting' : 'Crystallization'} degree (%)`;
    const contents = [...container.querySelectorAll('.panel-content')];
    const domains=kind==='melting'?[[12.5,18.5],[0,23.5]]:[[0,10.5],[0,15]];
    let index = 0, request = null, startTime = null, startDegree = null;
    slider.max = data.degree.length - 1;
    [play, reset, slider].forEach(control => { control.disabled = false; });
    function render() {
      const current = frame(data, index);
      slider.value = index;
      slider.setAttribute('aria-valuetext', `${percent(current.degree)} ${xLabel.toLowerCase()}`);
      output.value = percent(current.degree);
      contents[0].replaceChildren(...phaseSchematic(current,kind,trajectoryRegions(data,kind,index)));
      contents[1].replaceChildren(...chartPlot(current.degrees, current.phaseSeries, data.degree, [0,kind==='melting'?75:100], kind === 'melting' ? 'Residual mineral proportions (%)' : 'Crystallized mineral proportions (%)', xLabel, {side:kind==='melting'?'left':'right',series:data.proportions}));
      current.charts.forEach((chart, i) => contents[i + 2].replaceChildren(...chartPlot(current.degrees, chart.series, data.degree, domains[i], chart.yLabel, xLabel)));
      // Every panel receives exactly the same sampled degree; no independent timers.
      container.querySelectorAll('.animation-panel').forEach(panel => { panel.dataset.degree = current.degree; });
    }
    function pause(message = 'Paused. Use the slider to inspect a model step.') {
      if (request !== null) cancelAnimationFrame(request);
      request = null;
      play.textContent = 'Play';
      status.textContent = message;
    }
    function tick(time) {
      if (startTime === null) startTime = time;
      const last = data.degree[data.degree.length - 1];
      const next = playbackDegree(time-startTime,startDegree,data.degree[0],last);
      if(next<data.degree[index])index=0;
      while (index < data.degree.length - 1 && data.degree[index + 1] <= next) index++;
      if(Number(slider.value)!==index) render();
      request = requestAnimationFrame(tick);
    }
    function start() {
      if (index === data.degree.length - 1) index = 0;
      startTime = null;
      startDegree = data.degree[index];
      play.textContent = 'Pause';
      status.textContent = 'Playing on repeat. Select Pause to stop.';
      render();
      request = requestAnimationFrame(tick);
    }
    play.addEventListener('click', () => {
      if (request !== null) pause();
      else start();
    });
    reset.addEventListener('click', () => { index = 0; pause('Reset to the first model step.'); render(); });
    slider.addEventListener('input', () => { index = Number(slider.value); pause(); render(); });
    start();
    return { pause };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { validate, frame, mount, phaseRegions, polygonArea, playbackDegree, trajectoryRegions, advanceRegions };
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-model]').forEach(container => mount(container, root.MANTLE_MODEL_DATA?.[container.dataset.model]));
  }
})(typeof window !== 'undefined' ? window : globalThis);
