const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file) {
 const context={exports:{},Date,Map,require:()=>load('../lib/link-dates.ts')};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;
}
const {analyticsSeries}=load('../lib/analytics-series.ts');
process.env.TZ='America/Chicago';
test('empty and invalid timestamps produce zero-filled windows and no peak',()=>{
 for(const days of [7,30,90]) {const result=analyticsSeries(['bad','2026-99-01T00:00:00Z','2026-02-30T12:00:00Z',''],days,new Date('2026-01-02T12:00:00Z'));assert.equal(result.series.length,days);assert.equal(result.total,0);assert.equal(result.first,null);assert.equal(result.peak,null);assert.ok(result.series.every(row=>row.clicks===0));}
});
test('year boundaries use full local dates, sorted with zeros and totals',()=>{
 const result=analyticsSeries(['2026-01-01T01:00:00Z','2026-01-02T12:00:00Z'],7,new Date('2026-01-02T12:00:00Z'));
 assert.equal(result.series[4].day,'2025-12-31');assert.equal(result.series[4].clicks,1);assert.equal(result.series[5].clicks,0);assert.equal(result.series[6].clicks,1);assert.equal(result.last7,2);assert.equal(result.last30,2);assert.equal(result.peak.day,'2025-12-31');assert.equal(result.last,'2026-01-02T12:00:00.000Z');
});
test('spring forward and fall back count local calendar days, including repeated hour',()=>{
 for(const [now,values,day] of [
 ['2026-03-09T12:00:00Z',['2026-03-08T07:30:00Z','2026-03-08T08:30:00Z'],'2026-03-08'],
 ['2026-11-02T12:00:00Z',['2026-11-01T06:30:00Z','2026-11-01T07:30:00Z'],'2026-11-01']]) {
 const result=analyticsSeries(values,7,new Date(now));assert.equal(result.series.find(row=>row.day===day).clicks,2);assert.equal(new Set(result.series.map(row=>row.day)).size,7);
 }
});
test('single click and 10000 timestamps stay bounded to 90 buckets',()=>{
 const value='2026-01-02T12:00:00Z';const one=analyticsSeries([value],30,new Date(value));assert.equal(one.total,1);assert.equal(one.first,one.last);
 const start=performance.now();const result=analyticsSeries(Array(10000).fill(value),90,new Date(value));assert.equal(result.total,10000);assert.equal(result.peak.clicks,10000);assert.equal(result.series.length,90);assert.ok(performance.now()-start<1000,'10k aggregation should take less than 1 second');
});
