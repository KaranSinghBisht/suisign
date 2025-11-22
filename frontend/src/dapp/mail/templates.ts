export type TemplateId =
  | "consulting-basic"
  | "nda-simple"
  | "payment-confirmation";

export interface TemplateContext {
  initiatorLabel?: string;
  otherParties: string[];
}

export interface MailTemplate {
  id: TemplateId;
  label: string;
  description: string;
  buildSubject: (ctx: TemplateContext) => string;
  buildBodyHtml: (ctx: TemplateContext) => string;
  defaultAiHint?: string;
}

function firstParty(ctx: TemplateContext): string {
  return ctx.otherParties[0] || "the counterparty";
}

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: "consulting-basic",
    label: "Consulting Agreement (basic)",
    description: "Scope, payment, term, and termination.",
    buildSubject: (ctx) => `Consulting agreement with ${firstParty(ctx)}`,
    buildBodyHtml: (ctx) => {
      const target = firstParty(ctx);
      return `
        <p>This consulting agreement is between <strong>${
          ctx.initiatorLabel || "the Consultant"
        }</strong> and <strong>${target}</strong>.</p>
        <ul>
          <li>The Consultant will provide advisory services related to Web3, smart contracts, and protocol design.</li>
          <li>Fees, payment schedule, and deliverables will be as agreed in writing between the parties (for example in an attached scope of work).</li>
          <li>Either party may terminate this agreement with written notice, subject to payment for completed work.</li>
          <li>The governing law and jurisdiction, if needed, will be agreed separately in writing between the parties.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Refine this into a clear consulting agreement. Keep party names and any numbers the user adds. Do not invent a jurisdiction or extra terms.",
  },
  {
    id: "nda-simple",
    label: "Mutual NDA (simple)",
    description: "Confidential info sharing between two parties.",
    buildSubject: (ctx) => `Mutual NDA with ${firstParty(ctx)}`,
    buildBodyHtml: (ctx) => {
      const target = firstParty(ctx);
      return `
        <p>This mutual non-disclosure agreement is between <strong>${
          ctx.initiatorLabel || "Party 1"
        }</strong> and <strong>${target}</strong>.</p>
        <ul>
          <li>Each party may share confidential information for the purpose of evaluating a potential collaboration.</li>
          <li>Each party agrees to keep the other party's confidential information private and use it only for the agreed purpose.</li>
          <li>This NDA does not grant any license or ownership rights to the other party's IP.</li>
          <li>The governing law and jurisdiction, if needed, will be agreed separately in writing between the parties.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Turn this into a concise mutual NDA. Avoid legalese, keep it friendly and clear. Do not add governing law on your own.",
  },
  {
    id: "payment-confirmation",
    label: "Payment / settlement confirmation",
    description: "Simple record of a token payment or settlement.",
    buildSubject: (ctx) => `Payment confirmation for ${firstParty(ctx)}`,
    buildBodyHtml: (ctx) => {
      const target = firstParty(ctx);
      return `
        <p>This message confirms a payment between <strong>${
          ctx.initiatorLabel || "the sender"
        }</strong> and <strong>${target}</strong>.</p>
        <ul>
          <li>The sender agrees to transfer the agreed token amount to the recipient's wallet address.</li>
          <li>The transfer will be executed on-chain within the timeframe agreed between the parties.</li>
          <li>Once the transaction is confirmed on-chain, both parties consider the payment obligation settled.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Make this a clear, one-page payment confirmation. Do not invent token amounts or dates.",
  },
];
