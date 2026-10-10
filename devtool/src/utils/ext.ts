/// <reference path="../../types/env.d.ts" />

export const ext: any =
  typeof browser !== 'undefined'
    ? browser
    : typeof chrome !== 'undefined'
      ? chrome
      : null;
