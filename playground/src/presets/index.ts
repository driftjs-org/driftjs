import type { PresetExample } from '../types.js';

// @ts-ignore
import counterCode from './Counter.drift?raw';
// @ts-ignore
import todosCode from './Todos.drift?raw';
// @ts-ignore
import switchCode from './Switch.drift?raw';
// @ts-ignore
import formsCode from './Forms.drift?raw';
// @ts-ignore
import benchmarkCode from './Benchmark.drift?raw';

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: 'counter',
    name: 'Reactive Counter',
    description: 'Basic reactivity, button event handling, and an @if / @else if / @else ladder.',
    code: counterCode,
  },
  {
    id: 'todos',
    name: 'Keyed Todo List',
    description: 'Dynamic arrays, @for loops, keyed LIS list reconciliation, and in-place row toggling.',
    code: todosCode,
  },
  {
    id: 'switch',
    name: 'Switch Directive',
    description: 'Multi-branch control flow using @switch, @case, and @default directives.',
    code: switchCode,
  },
  {
    id: 'forms',
    name: 'Form & Live Binding',
    description: 'Dynamic inputs, range sliders, select menus, and live CSS property binding.',
    code: formsCode,
  },
  {
    id: 'benchmark',
    name: '1,000 Items Stress Test',
    description: 'Generates 1,000 keyed records to demonstrate fast-patching and minimal DOM churn.',
    code: benchmarkCode,
  },
];
