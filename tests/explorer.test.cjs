const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, frame } = require('../model-explorer.js');
// Synthetic values exclusively for software tests, not research or website content.
function fixture() {
  return {degree:[0,0.03,0.1],melt:[0,0.03,0.1],minerals:[{name:'Phase A',values:[0.6,0.6,0.6]},{name:'Phase B',values:[0.4,0.37,0.3]}],charts:[{title:'Element A',yLabel:'Concentration (ppm)',series:[{name:'A',values:[4,8,12]}]},{title:'Element B',yLabel:'Concentration (wt%)',series:[{name:'B',values:[2,3,4]}]}]};
}
test('all four panels share a step and reveal no future trajectory data',()=>{
 const d=validate(fixture());
 for(let i=0;i<d.degree.length;i++){
  const f=frame(d,i);
  assert.equal(f.degree,d.degree[i]); assert.equal(f.melt,d.melt[i]);
  assert.deepEqual(f.degrees,d.degree.slice(0,i+1));
  f.phaseSeries.forEach(s=>assert.equal(s.values.length,i+1));
  f.charts.forEach(c=>c.series.forEach(s=>assert.equal(s.values.length,i+1)));
  assert.equal(f.minerals[1].fraction,d.minerals[1].values[i]);
 }
});
test('scrubbing backward restores a shorter trajectory without changing source data',()=>{
 const d=fixture(), original=structuredClone(d); frame(d,2);
 assert.equal(frame(d,0).charts[0].series[0].values.length,1); assert.deepEqual(d,original);
 assert.equal(frame(d,999).step,2);assert.equal(frame(d,-1).step,0);
});
test('missing, inconsistent, nonfinite, or physically invalid data are rejected',()=>{
 assert.throws(()=>validate(null));
 for(const change of [d=>d.degree[1]=0,d=>d.degree[1]=NaN,d=>d.melt[1]=1.2,d=>d.minerals[0].values[1]=0,d=>d.charts[0].series[0].values.pop(),d=>d.charts[1].series[0].values[1]=-1]){const d=fixture();change(d);assert.throws(()=>validate(d));}
});
test('separate explorer data do not affect each other',()=>{
 const melting=fixture(),crystallization=fixture();crystallization.melt=[1,.97,.9];crystallization.minerals=[{name:'Crystals',values:[0,.03,.1]}];
 validate(crystallization);assert.equal(frame(crystallization,2).melt,.9);assert.equal(frame(melting,0).melt,0);
});
const fs=require('node:fs'),vm=require('node:vm');
function actual(){const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../model-data.js'),'utf8'),context);return context.window.MANTLE_MODEL_DATA;}
test('supplied trajectories preserve phase totals, normalization and source endpoints',()=>{
 const d=actual();validate(d.melting);validate(d.crystallization);
 assert.equal(d.melting.degree.length,29);assert.equal(d.crystallization.degree.length,186);
 assert.equal(d.crystallization.melt[0],1);assert.equal(d.crystallization.degree[0],0);
 assert.equal(d.crystallization.charts[0].series[0].values[0],null);
 assert.ok(Math.abs(d.crystallization.degree[1]-(1-d.crystallization.melt[1]))<1e-12);
 assert.ok(Math.abs(d.melting.charts[0].series[0].values[1]-13.999675066)<1e-7);
 assert.ok(Math.abs(d.crystallization.charts[0].series[0].values[1]-9.617021552)<1e-7);
 for(const model of Object.values(d))for(let i=0;i<model.degree.length;i++){
  assert.ok(Math.abs(model.melt[i]+model.minerals.reduce((sum,m)=>sum+m.values[i],0)-1)<1e-10);
  const f=frame(model,i);assert.equal(f.phaseSeries[0].values[i],model.proportions[0].values[i]);
 }
});
const {phaseRegions,polygonArea,playbackDegree}=require('../model-explorer.js');
test('irregular schematics conserve every supplied phase area at initial, middle and final steps',()=>{
 for(const [kind,data] of Object.entries(actual()))for(const index of [0,1,Math.floor(data.degree.length/2),data.degree.length-1]){
  const current=frame(data,index),regions=phaseRegions(current,kind),areas={};
  for(const r of regions)areas[r.name]=(areas[r.name]||0)+polygonArea(r.polygon);
  for(const p of [{name:'Melt',fraction:current.melt},...current.minerals])assert.ok(Math.abs((areas[p.name]||0)-p.fraction)<1e-7,`${kind} ${index} ${p.name}`);
  assert.deepEqual(regions,phaseRegions(current,kind));
 }
});
test('playback repeats after endpoint hold and supports multiple cycles',()=>{
 assert.equal(playbackDegree(0,0,0,.15),0);
 assert.equal(playbackDegree(10000,0,0,.15),.15);
 assert.equal(playbackDegree(10750,0,0,.15),0);
 assert.equal(playbackDegree(21500,0,0,.15),0);
 assert.ok(Math.abs(playbackDegree(5375,0,0,.15)-.080625)<1e-12);
});
const {trajectoryRegions}=require('../model-explorer.js');
function contains(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
test('phase histories conserve supplied areas at every step and never recycle protected regions',()=>{
 for(const [kind,data] of Object.entries(actual())){
  let previous=null;
  for(let i=0;i<data.degree.length;i++){
   const regions=trajectoryRegions(data,kind,i),totals={};
   regions.forEach(r=>totals[r.name]=(totals[r.name]||0)+polygonArea(r.polygon));
   for(const phase of [...frame(data,i).minerals,{name:'Melt',fraction:data.melt[i]}])assert.ok(Math.abs((totals[phase.name]||0)-phase.fraction)<1e-7,`${kind} ${i} ${phase.name}`);
   const points=Array.from({length:180},(_,j)=>{const x=((j*0.61803398875+.013)%1),y=((j*.41421356237+.017)%1);return regions.find(r=>contains(r.polygon,x,y))?.name;});
   assert.ok(points.every(Boolean));
   if(previous)points.forEach((name,j)=>{
    if(kind==='melting'&&previous[j]==='Melt')assert.equal(name,'Melt',`melt recycled at ${i}`);
    if(kind==='crystallization'&&previous[j]!=='Melt')assert.equal(name,previous[j],`crystal changed at ${i}`);
    if(name!==previous[j]){
     const oldIndex=data.minerals.findIndex(m=>m.name===previous[j]);
     if(oldIndex>=0)assert.ok(data.minerals[oldIndex].values[i]<data.minerals[oldIndex].values[i-1]+1e-10,'only shrinking minerals donate area');
    }
   });
   previous=points;
  }
  const final=trajectoryRegions(data,kind,data.degree.length-1);trajectoryRegions(data,kind,0);
  assert.strictEqual(trajectoryRegions(data,kind,data.degree.length-1),final,'scrubbing/replay uses identical geometry');
 }
});
