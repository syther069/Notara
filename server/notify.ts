// Optional Telegram alert when a payment link gets paid. Set TELEGRAM_BOT_TOKEN (from @BotFather)
// and TELEGRAM_CHAT_ID (your chat with the bot) in .env. Without them this does nothing.
// Shortcut: one chat for the whole server, not per merchant.

import type { Invoice } from "./invoices.ts";
import { formatAmount } from "../passport/src/assets.ts";

export const paidMessage = (i: Invoice) =>
  `Notara: ${i.id} paid. ${formatAmount(i.amount, i.asset)} to ${i.merchant} for "${i.description}".${i.txUrl ? `\n${i.txUrl}` : ""}`;

/** Fire and forget: an alert failing must never break a payment. */
export function notifyPaid(i: Invoice): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: paidMessage(i), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  }).catch((e) => console.warn("Telegram alert failed:", e.message));
}
