// frontend/src/ai/draftAgreement.ts

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_DRAFT_MODEL as string | undefined) ||
  "gemini-2.0-flash";

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

if (!GEMINI_API_KEY) {
  console.warn(
    "[SuiSign][AI] VITE_GEMINI_API_KEY is not set. AI drafting will fail until you configure it.",
  );
}

type DraftAgreementInput = {
  subject: string;
  signerInput: string;
  existingMessage?: string;
  instructions?: string;
  /** Optional: label / handle / address of the sender (current wallet) */
  initiatorLabel?: string;
};

function normalizeList(raw: string): string[] {
  return raw
    .split(/[,;\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function draftAgreementWithAI(
  input: DraftAgreementInput,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("AI is not configured. Missing API key.");
  }

  const { subject, signerInput, existingMessage, instructions } = input;

  const allSigners = normalizeList(signerInput);
  const initiator = (input.initiatorLabel ?? "").trim();

  let partiesDescription: string;
  if (initiator) {
    const otherParties = allSigners.filter(
      (s) => s.toLowerCase() !== initiator.toLowerCase(),
    );
    partiesDescription = otherParties.length
      ? `Initiator (sender): ${initiator}. Other parties (signers): ${otherParties.join(
          ", ",
        )}.`
      : `Initiator (sender): ${initiator}. No additional signers were listed.`;
  } else {
    partiesDescription = allSigners.length
      ? `Parties (signers): ${allSigners.join(", ")}.`
      : `No specific signer handles or addresses were provided. Use generic party wording.`;
  }

  const prompt = `
You are an AI legal assistant helping a Web3 product called "SuiSign".
Users upload documents or write secure messages and sign them with Sui wallets.
You are drafting short agreements or confirmations, not giving formal legal advice.

Your job:

- Return a **single HTML fragment** that will be used as the body of a document.
- Use only these HTML tags: <p>, <strong>, <em>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <hr>.
- Do NOT wrap the result in <html>, <body>, or any other outer tags.
- Do NOT include a title heading for the document subject; that’s rendered elsewhere in the UI.

Context about the parties:
- ${partiesDescription}

VERY IMPORTANT RULES ABOUT FACTS AND NUMBERS:
- Treat the user's draft and instructions as the source of truth.
- If the user mentions any specific token amounts, dates, rates, or percentages
  (for example "100k SUI", "by 31 Dec 2025"), you MUST include those exact values
  in the final text unless they clearly say it is just an example.
- Do NOT invent new numbers, dates, token amounts, or rates.
- If the existing draft or template says something generic like
  "the agreed token amount" but the user has specified an amount, REPLACE the
  generic wording with the specific amount.

Other constraints:
- Subject: "${subject}"
- Use the exact party labels given above (e.g. "kryptos", "0xabc...", "alice.sui").
- Do NOT invent generic labels like "Party A" or "Party B".
- Audience: crypto-native founders, DAOs, or contributors.
- Tone: professional but friendly, precise, no fluff.
- Prefer 3–8 short paragraphs or bullet points.
- Use headings (<h2>, <h3>) only for clear sections, e.g. "Scope", "Payment", "Term".
- Use <ul>/<ol>/<li> for lists of obligations or terms.
- Use <strong> and <em> sparingly for emphasis.
- For a horizontal break between sections, use <hr />.
- NO greeting ("Dear...") and NO signature block at the end.
- Do NOT select a random jurisdiction or "governing law". If a governing law is needed and not specified, use a neutral line like:
  "<p>The governing law and jurisdiction, if needed, will be agreed separately in writing between the parties.</p>"
- Assume this text will be encrypted and attached to an on-chain signing flow.
- Avoid unsafe, harassing, or illegal content. If requested content is unsafe, rewrite it into a neutral, safety-respecting form.

${
  instructions && instructions.trim().length > 0
    ? `User's specific instructions (follow these as long as they respect the constraints above):\n${instructions.trim()}\n`
    : "No additional user instructions were provided."
}

If the user already started a draft (possibly from a template), treat it as the primary source:
- Preserve the intent and key terms.
- Keep any concrete numbers or details the user provided.
- KEEP any existing structure such as headings, lists, or separators if they make sense.
- Improve clarity, structure, and flow.
- Only add details that are logically implied or explicitly requested.

Existing draft (may be empty, may contain HTML formatting):
---
${existingMessage || "(no existing draft)"}
---

Return ONLY the final HTML fragment, nothing else (no backticks, no explanation).
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      top_p: 0.9,
      max_output_tokens: 512,
    },
  };

  const resp = await fetch(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const raw = await resp.text().catch(() => "");
    console.error("[SuiSign][AI] Gemini error:", resp.status, raw);

    let reason = "AI drafting failed. Please try again.";
    if (resp.status === 401 || resp.status === 403) {
      reason = "AI is not authorized. Check your API key configuration.";
    } else if (resp.status === 404) {
      reason =
        "AI model endpoint not found. Check VITE_GEMINI_DRAFT_MODEL or the model name.";
    } else if (resp.status === 429) {
      reason =
        "AI quota exceeded or rate limit hit. Please wait a bit and retry.";
    }

    throw new Error(reason);
  }

  const data = await resp.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text ?? "")
      .join(" ")
      .trim() ?? "";

  if (!text) {
    throw new Error("AI did not return any text. Try again.");
  }

  return text;
}
