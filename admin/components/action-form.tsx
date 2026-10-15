'use client';

import { useActionState, useEffect, startTransition, type FormEvent, type ReactNode } from 'react';
import { useModalClose } from '@/components/create-modal';
import { primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { initialActionState, type ActionState } from '@/types/action';

/**
 * Wraps a server action as a form inside a CreateModal: shows its error, closes the modal
 * when it succeeds. The submit is wired by hand instead of `<form action>` because React
 * clears the fields after any action, and a mistyped alias should not wipe the whole form.
 */
export default function ActionForm({
  action,
  children,
  submitLabel = 'შენახვა',
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
}) {
  const [state, run, pending] = useActionState(action, initialActionState);
  const close = useModalClose();

  useEffect(() => {
    if (state.ok) close();
  }, [state, close]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} disabled={pending} className={secondaryButtonClass}>
          გაუქმება
        </button>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? 'ინახება...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
