import { common, setup, workload } from './perf_workload.js';
export { setup };
export const options = {...common, stages: [
  {duration:'10s',target:10}, {duration:'1s',target:100},
  {duration:'30s',target:100}, {duration:'1s',target:10}, {duration:'20s',target:10},
]};
export default workload;
