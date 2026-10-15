/** What every create action hands back to its form. */
export type ActionState = {
  ok: boolean;
  error: string | null;
};

export const initialActionState: ActionState = { ok: false, error: null };
