"use client";

import { type RefObject, useEffect } from "react";

// After a submission returns field errors, move focus to the first invalid field.
export function useFocusFirstError(
  formRef: RefObject<HTMLFormElement | null>,
  state: { fieldErrors?: object },
) {
  useEffect(() => {
    if (!state.fieldErrors) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [formRef, state]);
}
