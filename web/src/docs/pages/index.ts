import type { ComponentType } from "react";
import { Networks, Overview, Quickstart } from "./start";
import { AnyChain, Bookkeeping, InvoicesCsv, MainnetProof, PaymentLinks, WebsiteProof } from "./getpaid";
import { SendLinks } from "./send";
import { AttackTests, Caps, FunctionCallKeys, TeeModel, Vault } from "./agents";
import { Signals, Verdicts } from "./check";
import { Api, Architecture, Contracts, RunLocally, VerdictFormat } from "./developers";
import { Faq, Security } from "./trust";
import { Hackathon } from "./hackathon";

/** slug → page body. Every slug in nav.ts must be here. */
export const PAGES: Record<string, ComponentType> = {
  "": Overview,
  quickstart: Quickstart,
  networks: Networks,
  hackathon: Hackathon,
  "payment-links": PaymentLinks,
  "any-chain": AnyChain,
  "mainnet-proof": MainnetProof,
  "website-proof": WebsiteProof,
  "invoices-csv": InvoicesCsv,
  bookkeeping: Bookkeeping,
  "send-links": SendLinks,
  vault: Vault,
  caps: Caps,
  "attack-tests": AttackTests,
  "function-call-keys": FunctionCallKeys,
  "tee-model": TeeModel,
  signals: Signals,
  verdicts: Verdicts,
  architecture: Architecture,
  "verdict-format": VerdictFormat,
  api: Api,
  contracts: Contracts,
  "run-locally": RunLocally,
  security: Security,
  faq: Faq,
};
