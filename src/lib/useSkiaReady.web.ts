import { useEffect, useState } from 'react';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export type SkiaStatus = 'ready' | 'loading' | 'unavailable';

// Web-only implementation (Metro picks this file over useSkiaReady.ts when
// bundling for web, via the .web.ts extension). Web loads Skia's CanvasKit
// as a WASM binary, so chart screens must wait for it or crash on first
// render.
export function useSkiaStatus(): SkiaStatus {
  const [status, setStatus] = useState<SkiaStatus>('loading');
  useEffect(() => {
    LoadSkiaWeb()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('unavailable'));
  }, []);
  return status;
}
