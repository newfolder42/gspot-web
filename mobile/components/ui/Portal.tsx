import { Fragment, createContext, useContext, useId, useLayoutEffect, useMemo, useState } from 'react';

type PortalApi = {
  set: (key: string, node: React.ReactNode) => void;
  remove: (key: string) => void;
};

const PortalContext = createContext<PortalApi | null>(null);

/**
 * Draws every `<Portal>` beneath it after its own children, i.e. on top of the
 * navigator it wraps — headers and tab bar included.
 *
 * This is the overlay to reach for when something only has to *look* like it
 * floats over the app (drawers, popovers). `<Modal>` opens a second native
 * window on Android, and handing focus back to the app window when it closes
 * makes the IME re-evaluate itself — the keyboard flashes up and away.
 */
export function PortalHost({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Record<string, React.ReactNode>>({});
  const api = useMemo<PortalApi>(
    () => ({
      set: (key, node) => setNodes((prev) => ({ ...prev, [key]: node })),
      remove: (key) =>
        setNodes((prev) => {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }),
    }),
    []
  );

  return (
    <PortalContext.Provider value={api}>
      {children}
      {Object.entries(nodes).map(([key, node]) => (
        <Fragment key={key}>{node}</Fragment>
      ))}
    </PortalContext.Provider>
  );
}

/** Renders its children in the nearest `PortalHost` instead of in place. */
export function Portal({ children }: { children: React.ReactNode }) {
  const host = useContext(PortalContext);
  const key = useId();

  // Re-sent on every render so the portal tracks its owner's state.
  useLayoutEffect(() => {
    host?.set(key, children);
  });
  useLayoutEffect(() => () => host?.remove(key), [host, key]);

  // Without a host there is nowhere to send it; draw in place rather than drop it.
  return host ? null : <>{children}</>;
}
