"use client";

import { useTransition } from "react";
import { markDispatched } from "./actions";

export function DispatchPanel({
  supplierQuoteId,
  mailtoHref,
  whatsappHref,
}: {
  supplierQuoteId: string;
  mailtoHref: string | null;
  whatsappHref: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function dispatch(channel: "EMAIL" | "WHATSAPP", href: string) {
    // abre o compositor (cliente de e-mail / WhatsApp Web) e registra o envio
    window.open(href, "_blank");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("supplierQuoteId", supplierQuoteId);
      fd.set("channel", channel);
      await markDispatched(fd);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!mailtoHref || pending}
        onClick={() => mailtoHref && dispatch("EMAIL", mailtoHref)}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        title={mailtoHref ? "Enviar por e-mail" : "Fornecedor sem e-mail cadastrado"}
      >
        ✉️ E-mail
      </button>
      <button
        type="button"
        disabled={!whatsappHref || pending}
        onClick={() => whatsappHref && dispatch("WHATSAPP", whatsappHref)}
        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
        title={whatsappHref ? "Enviar por WhatsApp" : "Fornecedor sem telefone cadastrado"}
      >
        📲 WhatsApp
      </button>
    </div>
  );
}
