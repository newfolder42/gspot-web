'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { primaryButtonClass } from '@/components/ui';

const ModalContext = createContext<{ close: () => void }>({ close: () => {} });

/** Lets a form inside a CreateModal close the dialog it is shown in. */
export function useModalClose(): () => void {
  return useContext(ModalContext).close;
}

/**
 * A button that opens its children in a modal dialog. The children are only mounted while
 * the dialog is open, so every opening starts from an empty form.
 */
export default function CreateModal({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        + {label}
      </button>

      <dialog
        ref={dialogRef}
        // Esc and the backdrop both end up here, so the state never disagrees with the dialog.
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-lg backdrop:bg-black/50 p-0"
      >
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="დახურვა"
              title="დახურვა"
              className="px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
          {open && <ModalContext.Provider value={{ close: () => setOpen(false) }}>{children}</ModalContext.Provider>}
        </div>
      </dialog>
    </>
  );
}
