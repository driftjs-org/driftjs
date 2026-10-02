declare module 'driftjs-dom' {
  import type { Context } from 'driftjs-shared';

  export {
    createContext,
    provide,
    inject,
    provideContext,
    injectContext,
    effect,
    onMount,
    onUnmount,
    type Context,
  } from 'driftjs-shared';

  // Bytecode Opcodes & VM Types
  export enum Opcode {
    RETURN = 0x00,
    CREATE_ELEMENT = 0x01,
    CREATE_TEXT = 0x02,
    CREATE_COMMENT = 0x03,
    APPEND_CHILD = 0x04,
    SET_ATTR = 0x05,
    CREATE_FRAGMENT = 0x06,
    INTERPOLATE_TEXT = 0x07,
    EXEC_SCRIPT = 0x0C,
    REACTIVE_IF = 0x0D,
    REACTIVE_FOR = 0x0E,
    MOUNT_COMPONENT = 0x0F,
    REACTIVE_ASYNC = 0x10,
    REACTIVE_SWITCH = 0x11,
  }

  export enum VMMode {
    MOUNT = 0,
    UPDATE = 1,
  }

  export interface SwitchCaseSpec {
    readonly testIdx: number;
    readonly modIdx: number;
  }

  export interface ReactiveBinding {
    readonly variable: string;
    readonly positions: readonly number[];
  }

  export interface ImportSpec {
    readonly localName: string;
    readonly source: string;
    readonly isDefault: boolean;
    readonly isNamespace?: boolean | undefined;
    readonly isSideEffect?: boolean | undefined;
    readonly importedName?: string | undefined;
  }

  export interface DerivedBinding {
    readonly name: string;
    readonly deps: readonly string[];
    readonly exprIdx: number;
  }

  export interface EffectBinding {
    readonly deps: readonly string[];
    readonly exprIdx: number;
  }

  export interface CompiledModule {
    readonly bytecode: readonly number[] | Uint32Array;
    readonly constants: readonly any[];
    readonly reactiveBindings?: readonly ReactiveBinding[];
    readonly declaredVars?: readonly string[];
    readonly derived?: readonly DerivedBinding[];
    readonly effects?: readonly EffectBinding[];
    readonly imports?: readonly ImportSpec[];
    readonly scope?: Record<string, any>;
  }

  export interface ItemRecord {
    key: unknown;
    nodes: any[];
    childRegions?: any[] | undefined;
    itemVal: unknown;
    indexVal: number;
    registers?: any[] | undefined;
    scope?: Record<string, any> | undefined;
    lastValues?: Map<number, any> | undefined;
  }

  export interface VMExecutionOptions {
    readonly scope?: Record<string, any> | undefined;
    readonly document?: Document | undefined;
    readonly container?: HTMLElement | undefined;
    readonly hydrate?: boolean | undefined;
    readonly cursor?: any | undefined;
  }

  export interface ReactiveRegion {
    type?: string | undefined;
    readonly deps: ReadonlySet<string>;
    readonly reRender: (changedVars?: ReadonlySet<string>) => void;
    childRegions?: ReactiveRegion[] | undefined;
    parentNode?: Node | undefined;
    startAnchor?: Node | undefined;
    endAnchor?: Node | undefined;
  }

  export interface RunningEffect {
    readonly deps: readonly string[];
    readonly exprConst?: any;
    readonly rawFn?: (() => void | (() => void) | Promise<any>) | undefined;
    cleanup?: (() => void) | void | undefined;
    isDirty: boolean;
    isMountOnly?: boolean | undefined;
  }

  // Hydration Strategies & Selective Options
  export type HydrationStrategy = 'eager' | 'idle' | 'visible' | 'interaction' | 'media';

  export interface BaseHydrationOptions extends VMExecutionOptions {
    readonly document?: Document | undefined;
    readonly scope?: Record<string, any> | undefined;
  }

  export interface IdleHydrationOptions extends BaseHydrationOptions {
    readonly timeout?: number | undefined;
  }

  export interface VisibleHydrationOptions extends BaseHydrationOptions {
    readonly rootMargin?: string | undefined;
    readonly threshold?: number | number[] | undefined;
    readonly root?: Element | Document | null | undefined;
  }

  export interface InteractionHydrationOptions extends BaseHydrationOptions {
    readonly events?: readonly string[] | undefined;
    readonly replayEvent?: boolean | undefined;
    readonly timeout?: number | undefined;
  }

  export interface MediaHydrationOptions extends BaseHydrationOptions {
    readonly mediaQuery?: string | undefined;
  }

  export interface SelectiveHydrationOptions extends BaseHydrationOptions {
    readonly trigger?: HydrationStrategy | ((hydrateFn: () => any) => (() => void) | void) | undefined;
    readonly idleTimeout?: number | undefined;
    readonly rootMargin?: string | undefined;
    readonly threshold?: number | number[] | undefined;
    readonly root?: Element | Document | null | undefined;
    readonly events?: readonly string[] | undefined;
    readonly replayEvent?: boolean | undefined;
    readonly timeout?: number | undefined;
    readonly media?: string | undefined;
  }

  export interface SelectiveHydrationController<TVM = any> {
    readonly vm: TVM | null;
    readonly isHydrated: boolean;
    readonly ready: Promise<TVM>;
    readonly hydrateNow: () => TVM;
    readonly cancel: () => void;
    readonly unmount: () => void;
  }

  export interface IslandHydrationOptions {
    readonly root?: HTMLElement | Document | undefined;
    readonly defaultTrigger?: HydrationStrategy | undefined;
    readonly globalScope?: Record<string, any> | undefined;
  }

  export interface IslandHydrationResult<TVM = any> {
    readonly controllers: readonly SelectiveHydrationController<TVM>[];
    readonly hydrateAll: () => Promise<TVM[]>;
    readonly cancelAll: () => void;
  }

  // Cursor & VM Classes
  export class HydrationCursor {
    constructor(container: Node, doc: Document);
    claimElement(tag: string, doc: Document): Element;
    claimText(doc: Document): Text;
    claimComment(expectedContent: string, doc: Document): Comment;
    peek(): Node | null;
    getUnclaimed(): readonly Node[];
    isExhausted(): boolean;
  }

  export class DriftClientVM {
    scope: Record<string, any>;
    parentVM: DriftClientVM | null;
    contextMap: Map<symbol, any>;
    isMounted: boolean;
    unmountCallbacks: (() => void)[];

    constructor();
    registerProgrammaticEffect(fn: () => void | (() => void) | Promise<any>, isMountOnly?: boolean): void;
    unmountSubtree(node: Node | null): void;
    registerRegion(region: ReactiveRegion): void;
    removeRegion(region: ReactiveRegion): void;
    unmount(): void;
    markDirty(varName: string): void;
    flushPendingEffects(): void;
    flushUpdates(): void;
    execute(rawModule: CompiledModule, options?: VMExecutionOptions): Node | null;
  }

  // Main Mounting & Hydration Functions
  export function mount(
    component: CompiledModule,
    container: HTMLElement,
    options?: VMExecutionOptions
  ): DriftClientVM;

  export function hydrate(
    component: CompiledModule,
    container: HTMLElement,
    options?: VMExecutionOptions
  ): DriftClientVM;

  // Selective & Partial Hydration Functions
  export function hydrateOnIdle(
    component: CompiledModule,
    container: HTMLElement,
    options?: IdleHydrationOptions
  ): SelectiveHydrationController<DriftClientVM>;

  export function hydrateWhenVisible(
    component: CompiledModule,
    container: HTMLElement,
    options?: VisibleHydrationOptions
  ): SelectiveHydrationController<DriftClientVM>;

  export function hydrateOnInteraction(
    component: CompiledModule,
    container: HTMLElement,
    options?: InteractionHydrationOptions
  ): SelectiveHydrationController<DriftClientVM>;

  export function hydrateOnMedia(
    component: CompiledModule,
    container: HTMLElement,
    options?: MediaHydrationOptions
  ): SelectiveHydrationController<DriftClientVM>;

  export function hydrateSelectively(
    component: CompiledModule,
    container: HTMLElement,
    options?: SelectiveHydrationOptions
  ): SelectiveHydrationController<DriftClientVM>;

  export function hydrateIslands(
    options?: IslandHydrationOptions
  ): IslandHydrationResult<DriftClientVM>;
}
