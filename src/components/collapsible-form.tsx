"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Botão "Novo" que revela um formulário. Recebe a server action e os campos
 * como children. Fecha e reseta ao enviar.
 */
export function CollapsibleForm({
  buttonLabel,
  title,
  action,
  children,
}: {
  buttonLabel: string;
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        + {buttonLabel}
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>
      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
          setOpen(false);
        }}
        className="space-y-4"
      >
        {children}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

/** Campo de formulário rotulado (input ou select via children). */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
