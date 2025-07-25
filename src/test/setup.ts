/* eslint-disable @typescript-eslint/no-explicit-any */
// src/test/setup.ts
import "@testing-library/jest-dom";

// Global mock for ResizeObserver used by Radix UI, etc.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;
