const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file) {
 const context={exports:{},Date,Intl,require:()=>load('../lib/link-dates.ts')};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return context.exports;
}
const {formatKeyDate}=load('../lib/key-dates.ts');
test('key dates treat offsetless TIMESTAMP as UTC in every browser zone',()=>{
 const previous=process.env.TZ;
 try {
  for(const zone of ['America/New_York','Pacific/Auckland','UTC']) {
   process.env.TZ=zone;
   assert.equal(formatKeyDate('2026-11-27T12:34:00.123456'),'27 Nov 2026, 12:34 UTC');
   assert.equal(formatKeyDate('2026-11-27T07:34:00-05:00'),'27 Nov 2026, 12:34 UTC');
  }
 } finally {if(previous===undefined) delete process.env.TZ;else process.env.TZ=previous;}
});
test('missing last use is honest and malformed dates are not fabricated',()=>{
 assert.equal(formatKeyDate(null),'Never used');assert.equal(formatKeyDate('bad'),'Date unavailable');
});
