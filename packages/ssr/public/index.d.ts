declare module 'driftjs-ssr' {
  import type { CompiledModule } from 'driftjs-compiler';
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

  export interface SSRExecutionOptions {
    readonly scope?: Record<string, any> | undefined;
  }

  export interface StreamOptions extends SSRExecutionOptions {
    readonly onShellReady?: (() => void) | undefined;
    readonly onAllReady?: (() => void) | undefined;
    readonly onError?: ((error: unknown) => void) | undefined;
    readonly timeoutMs?: number | undefined;
    readonly nonce?: string | undefined;
  }

  export interface DriftStream extends ReadableStream<Uint8Array> {
    pipe<T>(destination: T): T;
    abort(reason?: any): void;
  }

  export interface ServerNode {
    type: 'element' | 'text' | 'comment' | 'fragment';
    tag?: string;
    attrs?: Map<string, string | boolean | null>;
    children: (ServerNode | string)[];
    content?: string;
  }

  export interface IslandRenderOptions extends SSRExecutionOptions {
    readonly trigger?: 'eager' | 'idle' | 'visible' | 'interaction' | 'media';
    readonly timeout?: number;
    readonly media?: string;
    readonly rootMargin?: string;
    readonly islandTag?: string;
    readonly props?: Record<string, any>;
  }

  export class DriftServerVM {
    scope: Record<string, any>;
    parentVM: DriftServerVM | null;
    contextMap: Map<symbol, any>;

    constructor();
    execute(rawModule: CompiledModule, options?: SSRExecutionOptions): ServerNode | null;
  }

  export function serializeNode(
    node: ServerNode | string | null | undefined,
    isRawText?: boolean,
    rawTag?: string
  ): string;

  export function renderToString(
    component: CompiledModule,
    options?: SSRExecutionOptions
  ): string;

  export function renderIslandToString(
    islandName: string,
    component: CompiledModule,
    options?: IslandRenderOptions
  ): string;

  export function renderToStream(
    component: CompiledModule,
    options?: StreamOptions
  ): DriftStream;
}
