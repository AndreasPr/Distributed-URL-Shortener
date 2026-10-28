import { common, setup, workload } from './perf_workload.js';
export { setup };
export const options = {...common, stages: [
  {duration:'1m',target:10}, {duration:'2m',target:50},
  {duration:'2m',target:100}, {duration:'2m',target:200}, {duration:'1m',target:0},
]};
export default workload;
