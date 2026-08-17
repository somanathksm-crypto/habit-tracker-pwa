export type SkiaStatus = 'ready' | 'loading' | 'unavailable';

// Native implementation (iOS/Android). Metro picks useSkiaReady.web.ts
// instead when bundling for web, via the .web.ts extension — this file
// must NOT import anything from "@shopify/react-native-skia/.../web",
// since that pulls in canvaskit-wasm's Node-only "fs" require, which
// crashes native bundling entirely (hit this once already).
//
// Native platforms load Skia synchronously via native bindings, so
// there's nothing to await here.
export function useSkiaStatus(): SkiaStatus {
  return 'ready';
}
