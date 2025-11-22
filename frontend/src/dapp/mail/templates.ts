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
      const initiator = ctx.initiatorLabel || "the Consultant";

      return `
        <h2>Consulting Agreement</h2>
        <p>This consulting agreement is between <strong>${initiator}</strong> and <strong>${target}</strong>.</p>

        <h3>Scope</h3>
        <ul>
          <li>The Consultant will provide advisory and consulting services related to Web3, smart contracts, and protocol design as agreed in writing between the parties.</li>
          <li>Specific tasks, timelines, and deliverables may be described in a separate written scope of work or annex.</li>
        </ul>

        <h3>Fees &amp; Payment</h3>
        <ul>
          <li>Fees, token amounts, and payment schedules will be as agreed in writing between the parties (for example in an attached scope or payment schedule).</li>
          <li>The parties may update fees or scope by mutual written agreement (including by secure message through this system).</li>
        </ul>

        <h3>Term &amp; Termination</h3>
        <ul>
          <li>This agreement continues until completed or terminated by either party with written notice, subject to payment for work completed up to the termination date.</li>
          <li>Any provisions that by their nature should survive termination (for example, confidentiality) will continue to apply.</li>
        </ul>

        <h3>Miscellaneous</h3>
        <ul>
          <li>The governing law and jurisdiction, if needed, will be agreed separately in writing between the parties.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Refine this into a clear consulting agreement. Keep party names and any numbers or token amounts the user adds. Do not invent a jurisdiction or new fees.",
  },
  {
    id: "nda-simple",
    label: "Mutual NDA (simple)",
    description: "Confidential info sharing between two parties.",
    buildSubject: (ctx) => `Mutual NDA with ${firstParty(ctx)}`,
    buildBodyHtml: (ctx) => {
      const target = firstParty(ctx);
      const initiator = ctx.initiatorLabel || "Party 1";

      return `
        <h2>Mutual Non-Disclosure Agreement</h2>
        <p>This mutual non-disclosure agreement is between <strong>${initiator}</strong> and <strong>${target}</strong> (together, the “Parties”).</p>

        <h3>Purpose</h3>
        <ul>
          <li>The Parties may share confidential information for the purpose of evaluating, discussing, or carrying out a potential collaboration, project, or transaction.</li>
        </ul>

        <h3>Confidential Information</h3>
        <ul>
          <li>“Confidential Information” means any non-public technical, business, financial, or product information shared by one Party (the “Disclosing Party”) with the other (the “Receiving Party”), whether shared in writing, verbally, or through access to systems or documents.</li>
          <li>The Receiving Party will use Confidential Information only for the Purpose and will take reasonable steps to protect it from unauthorized access or disclosure.</li>
        </ul>

        <h3>Exclusions</h3>
        <ul>
          <li>Information is not Confidential Information if it is or becomes publicly available without breach, was already known to the Receiving Party, is independently developed, or is rightfully received from a third party without a confidentiality obligation.</li>
        </ul>

        <h3>Term</h3>
        <ul>
          <li>This NDA applies to Confidential Information disclosed during the discussion period and continues for a reasonable period afterward, unless the Parties agree otherwise in writing.</li>
        </ul>

        <h3>Miscellaneous</h3>
        <ul>
          <li>This NDA does not grant any license or ownership rights in the other Party’s intellectual property.</li>
          <li>The governing law and jurisdiction, if needed, will be agreed separately in writing between the Parties.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Turn this into a concise mutual NDA. Avoid heavy legalese, keep it friendly and clear. Do not add governing law or new obligations on your own.",
  },
  {
    id: "payment-confirmation",
    label: "Payment / settlement confirmation",
    description: "Simple record of a token payment or settlement.",
    buildSubject: (ctx) => `Payment confirmation for ${firstParty(ctx)}`,
    buildBodyHtml: (ctx) => {
      const target = firstParty(ctx);
      const initiator = ctx.initiatorLabel || "the sender";

      return `
        <h2>Payment Confirmation</h2>
        <p>This message confirms a payment between <strong>${initiator}</strong> (the “Sender”) and <strong>${target}</strong> (the “Recipient”).</p>

        <h3>Payment Details</h3>
        <ul>
          <li>The Sender agrees to transfer the agreed token amount to the Recipient’s wallet address as specified by the parties.</li>
          <li>The transfer will be executed on-chain within the timeframe agreed between the parties.</li>
          <li>Any specific token amount, token type, and date provided by the user in this draft or later edits will control over generic wording.</li>
        </ul>

        <h3>Settlement</h3>
        <ul>
          <li>Once the transaction is confirmed on-chain, both parties consider the related payment obligation settled, unless they explicitly agree otherwise in writing.</li>
        </ul>

        <h3>Notes</h3>
        <ul>
          <li>If the payment is part of a larger agreement (for example, a consulting or grant agreement), that agreement remains in effect according to its terms.</li>
        </ul>
      `;
    },
    defaultAiHint:
      "Make this a clear, one-page payment confirmation. Do not invent token amounts, dates, or rates. Keep any specific numbers the user adds.",
  },
];