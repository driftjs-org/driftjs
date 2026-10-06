declare module 'driftjs-shared' {
  /** Base execution options for all DriftJS Virtual Machine variants */
  export interface BaseVMExecutionOptions {
    readonly scope?: Record<string, any>;
  }

  /** Represents a strongly-typed Context Token in DriftJS */
  export interface Context<T> {
    readonly id: symbol;
    readonly name?: string | undefined;
    readonly defaultValue?: T | undefined;
    provide(value: T | (() => T)): void;
    inject(fallback?: T): T;
  }

  /** Maximum registers allowed per Virtual Machine execution frame */
  export const MAX_REGISTERS: number;

  /** Standard WHATWG HTML void element tag names */
  export const VOID_ELEMENTS: ReadonlySet<string>;

  /** Scope resolution and reactive dirty marking */
  export function setScopeValue<T = any>(targetScope: Record<string, any>, name: string, val: T): T;
  export function inScopeChain(scope: any, name: string): boolean;
  export function getScopeValue(scope: any, name: string): any;
  export function setScopeProp<T = any>(scope: Record<string, any>, key: string, val: T): T;
  export function populateItemScope(
    scope: Record<string, any>,
    itemName: string,
    itemVal: any,
    indexName: string | null,
    indexVal: number
  ): void;

  /** Runtime AST and expression evaluators */
  export function resolveIterable(rawIter: any): any[];
  export function executePrecompiledFn(node: any, scope: Record<string, any>, declaredVars?: Set<string>): any;
  export function evaluateExpression(node: any, scope: Record<string, any>, declaredVars?: Set<string>): any;
  export function resolveComponentModule(raw: any): any | null;
  export function evaluatePropsSpec(
    propsSpec: Record<string, any> | null | undefined,
    scope: Record<string, any>,
    declaredVars?: Set<string>
  ): Record<string, any>;

  /** Context API and VM lifecycle stack helpers */
  export function pushActiveVM(vm: any): void;
  export function popActiveVM(): void;
  export function getActiveVM(): any | null;
  export function createContext<T>(defaultValue?: T, name?: string): Context<T>;
  export function provideContext<T>(context: Context<T>, value: T | (() => T)): void;
  export function injectContext<T>(context: Context<T>, fallback?: T): T;
  export const provide: typeof provideContext;
  export const inject: typeof injectContext;
  export function effect(callback: () => void | (() => void) | Promise<any>): void;
  export function onMount(callback: () => void | (() => void) | Promise<any>): void;
  export function onUnmount(callback: () => void): void;

  /** CSS Style normalizers */
  export function camelToKebab(str: string): string;
  export function normalizeStyle(value: any): string;

  /** HTML validation and escaping helpers */
  export const VALID_TAG_NAME_REGEX: RegExp;
  export const VALID_ATTR_NAME_REGEX: RegExp;
  export function escapeHtml(str: string): string;
  export function unescapeHtml(str: string): string;
  export function isValidHtmlTagName(tag: string): boolean;

  /** Path utilities */
  export function normalizePath(path: string): string;
}
