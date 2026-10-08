declare module '*.drift' {
  const component: import('driftjs-compiler').CompiledModule;
  export default component;
}

declare module '*.css';

declare function derive<T>(exprOrFn: T | (() => T)): T;
declare const children: any;
declare const props: Record<string, any>;
