import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HttpFailure } from '../../../lib/api/http-client';
import * as api from '../api/management.api';
import {
  businessFormValues,
  businessFormInput,
  businessFormErrors,
  type BusinessFormValues,
} from '../model/business-form-values';
import type { Business } from '../model/management.types';
import { useManagedMutation } from './use-managed-mutation';

export function useBusinessForm(
  business: Business | undefined,
  onSaved: (value: Business) => void | Promise<void>,
) {
  const [form, setForm] = useState(() => businessFormValues(business));
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [focusRevision, setFocusRevision] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const mutation = useManagedMutation();
  const dirty = JSON.stringify(form) !== JSON.stringify(businessFormValues(business));
  const fields = { ...mutation.fields, ...validation };
  const conflict =
    mutation.error instanceof HttpFailure && mutation.error.code === 'VERSION_CONFLICT';
  useEffect(() => {
    if (!mutation.pending) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [mutation.error, mutation.pending, focusRevision]);
  function change<K extends keyof BusinessFormValues>(field: K, value: BusinessFormValues[K]) {
    setForm((old) => ({ ...old, [field]: value }));
    setValidation((old) => {
      const next = { ...old };
      delete next[field];
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = businessFormErrors(form);
    setValidation(errors);
    if (Object.keys(errors).length) {
      setFocusRevision((value) => value + 1);
      return;
    }
    if (business && !dirty) return;
    const body = businessFormInput(form);
    await mutation.execute(
      JSON.stringify([business?.id, business?.version, body]),
      (key, signal) =>
        business
          ? api.updateBusiness(business.id, body, business.version, key, signal)
          : api.createBusiness(body, key, signal),
      onSaved,
    );
  }
  return { form, formRef, fields, dirty, conflict, mutation, change, submit };
}
