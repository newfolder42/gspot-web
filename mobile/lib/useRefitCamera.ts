import { useEffect, useRef } from 'react';
import MapboxGL from '@rnmapbox/maps';

type Fit = { centerCoordinate: [number, number]; zoomLevel: number };

/**
 * For the overview maps (guesses, checks) whose `<Camera>` opens fitted to their
 * points through `defaultSettings`. That only ever applies once, so after a
 * rotation re-shapes the map the old zoom would leave points outside the new
 * viewport; this moves the camera to the newly computed fit instead.
 *
 * Pass the ref to the `<Camera>`. The first fit is left to `defaultSettings`, and a
 * fit that did not change is skipped, so a pan or zoom by the user is not undone.
 */
export function useRefitCamera(fit: Fit | null) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (!fit) return;
    const signature = `${fit.centerCoordinate[0]},${fit.centerCoordinate[1]},${fit.zoomLevel}`;
    if (applied.current === null) {
      applied.current = signature;
      return;
    }
    if (applied.current === signature) return;
    applied.current = signature;
    cameraRef.current?.setCamera({ ...fit, animationDuration: 0 });
  }, [fit]);

  return cameraRef;
}
