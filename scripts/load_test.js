import { common, setup, workload } from './perf_workload.js';
export { setup };
export const options = {...common, scenarios: {load: {
  executor: 'constant-arrival-rate', rate: Number(__ENV.RATE || 100), timeUnit: '1s',
  duration: __ENV.DURATION || '2m', preAllocatedVUs: 20, maxVUs: 100,
}}, thresholds: {...common.thresholds, dropped_iterations: ['count==0']}};
export default workload;
