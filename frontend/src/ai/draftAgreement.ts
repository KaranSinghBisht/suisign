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

Your task:
Draft the *body text only* for a short, clear agreement or secure message that the user will review and optionally edit.

Context about the parties:
- ${partiesDescription}

Constraints:

- Subject of the agreement: "${subject}"
- Use the exact party labels given above (e.g. "kryptos", "0xabc...", "alice.sui").
- Do NOT invent generic labels like "Party A" or "Party B".
- Do NOT add a title or heading. Do not repeat the subject. Start directly with the body text.
- Audience: crypto-native founders, DAOs, and contributors.
- Tone: professional but friendly, concise, minimal legalese.
- Aim for 3–8 short paragraphs or bullet points.

VERY IMPORTANT – do **not** hallucinate facts:

- Only mention specific token amounts, currencies, dates, timelines, milestones, or payment schedules if they appear in the subject, the user's instructions, or the existing draft.
- If such details are not provided, keep them generic (for example: "the agreed fee", "the agreed payment schedule", "the agreed timeline") instead of inventing numbers or dates.
- Do NOT invent any country, state, city, governing law, jurisdiction, venue, or arbitration rules unless the user explicitly specifies them. If the user does not specify them, omit that kind of clause entirely.
- Do NOT invent additional parties or roles beyond those listed in the context.

Safety:

- Avoid unsafe, harassing, or illegal content.
- If the user requests something unsafe, rewrite it into a neutral, safety-respecting form instead of following the unsafe part literally.

${
  instructions && instructions.trim().length > 0
    ? `User's specific instructions (follow these as long as they respect all the constraints above):\n${instructions.trim()}\n`
    : "No additional user instructions were provided."
}

If the user already started a draft, improve, clarify, and structure that draft instead of ignoring it.

Existing draft (may be empty):
---
${existingMessage || "(no existing draft)"}
---
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
