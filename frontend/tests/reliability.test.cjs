const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function moduleWithClock() {
  let clock = 0, id = 0;
  const timers = new Map();
  const context = { exports: {}, fetch: () => { throw new Error('unexpected network'); }, AbortSignal,
    setTimeout: (fn, delay) => { timers.set(++id, {fn, at: clock + delay}); return id; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/reliability.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { ...context.exports, now: () => clock, advance(ms) { clock += ms; for (const [key, timer] of timers) if (timer.at <= clock) { timers.delete(key); timer.fn(); } } };
}
test('one readiness flight shows waking after 3 seconds and succeeds from health', async () => {
  const mod = moduleWithClock(); const states = []; let finish, calls = 0;
  const gate = mod.createReadiness(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, mod.now, async () => {}, value => states.push(value));
  const a = gate.ensure('https://api.test'); const b = gate.ensure('https://api.test');
  assert.equal(a, b); assert.equal(calls, 1);
  mod.advance(2999); assert.equal(states.some(s => s.phase === 'waking'), false);
  mod.advance(1); assert.equal(states.at(-1).phase, 'waking');
  finish({ok:true, json:async () => ({status:'ok'})}); await a;
  assert.equal(states.at(-1).phase, 'healthy');
  await gate.ensure('https://api.test'); assert.equal(calls, 1);
});
test('backoff is capped; no raw failure escapes before 90 seconds', async () => {
  const mod = moduleWithClock(); const waits = [], states = []; let calls = 0;
  const gate = mod.createReadiness(async () => { calls++; throw new Error('private upstream failure'); }, mod.now,
    async ms => { waits.push(ms); mod.advance(ms); }, value => states.push(value));
  await assert.rejects(gate.ensure('https://api.test'), /taking longer than expected/);
  assert.equal(mod.now(), 90000);
  assert.deepEqual(waits.slice(0,4), [1000,2000,4000,8000]);
  assert.ok(Math.max(...waits) <= 10000); assert.ok(calls < 15);
  assert.equal(states.at(-1).phase, 'unavailable');
  assert.ok(!JSON.stringify(states).includes('private'));
});
test('degraded health retries until genuinely healthy', async () => {
  const mod = moduleWithClock(); let calls = 0;
  const gate = mod.createReadiness(async () => ({ok:++calls > 2, json:async () => ({status:calls > 2 ? 'ok':'degraded'})}), mod.now, async ms => mod.advance(ms), () => {});
  await gate.ensure('https://api.test'); assert.equal(calls, 3);
});
test('a timed-out write is never replayed after readiness recovery', async () => {
  let writes = 0, probes = 0;
  const context = { exports:{}, AbortSignal, process:{env:{}}, window:{},
    require: name => name === './demo-api' ? {DemoAPIClient:class {}} : name === './reliability' ? {readiness:()=>({ensure:async()=>{probes++;},reset:()=>{}}),unavailableMessage:'Please retry'} : {accessToken:async()=>null},
    fetch: async () => { writes++; throw new Error('raw failure'); },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/api.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  await assert.rejects(new context.exports.APIClient('https://api.test').shorten('https://example.com'), /Check the result/);
  assert.equal(writes, 1); assert.equal(probes, 2);
});
test('status probe exposes a genuine degraded 503 immediately without changing readiness policy',async()=>{
 const mod=moduleWithClock();let calls=0;
 const probe=mod.createHealthProbe(async()=>{calls++;return {ok:false,status:503,json:async()=>({status:'degraded',db:'reachable',redis:'unreachable'})};},mod.now,async ms=>mod.advance(ms),()=>{});
 assert.equal((await probe('https://api.test')).redis,'unreachable');assert.equal(calls,1);assert.equal(mod.now(),0);
});
test('status probe keeps transport failures private for the full 90-second cold start window',async()=>{
 const mod=moduleWithClock(),states=[];
 const probe=mod.createHealthProbe(async()=>{throw new Error('private network');},mod.now,async ms=>mod.advance(ms),state=>states.push(state));
 await assert.rejects(probe('https://api.test'),/taking longer than expected/);assert.equal(mod.now(),90000);assert.ok(states.some(state=>state.phase==='waking'));assert.ok(!JSON.stringify(states).includes('private'));
});
