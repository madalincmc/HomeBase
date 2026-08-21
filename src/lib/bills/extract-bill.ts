"use server";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { isValidDateOnly } from "@/lib/schedule";

// Google's structured-output support is a subset of OpenAPI 3.0 and doesn't
// handle z.union/z.nullable well (see @ai-sdk/google's docs) — so every
// field is a plain required string, and the model is told to return "" for
// anything it can't find. "" is treated as null once the response comes
// back, which sidesteps the schema limitation entirely.
const ExtractedBillSchema = z.object({
  provider: z.string().describe("The company or utility that issued the bill. Empty string if not visible."),
  amount: z
    .string()
    .describe(
      "The total amount due, as a plain decimal number with no currency symbol or thousands separator, e.g. '84.50'. Empty string if not visible."
    ),
  currency: z.string().describe("3-letter ISO currency code, e.g. USD, EUR, GBP. Empty string if not determinable."),
  issueDate: z.string().describe("The bill's issue or statement date in YYYY-MM-DD format. Empty string if not visible."),
  dueDate: z.string().describe("The payment due date in YYYY-MM-DD format. Empty string if not visible."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Overall confidence that the extracted fields above are correct and complete."),
});

export type ExtractedBill = {
  provider: string | null;
  amount: string | null;
  currency: string | null;
  issueDate: string | null;
  dueDate: string | null;
  confidence: "high" | "medium" | "low";
};

export type ExtractBillResult = { success: true; data: ExtractedBill } | { success: false; error: string };

// Same accepted types/size limit as the attachments module (MAD-96) — this
// extraction step reads the file directly, independent of (and before) it
// ever gets uploaded to Blob as the actual attachment.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export async function extractBillFields(
  _prevState: ExtractBillResult | null,
  formData: FormData
): Promise<ExtractBillResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a bill photo or document first." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WEBP, HEIC images or PDF documents are supported." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: "File must be 10 MB or smaller." };
  }

  // Validation failures above are the user's to fix and get a specific
  // message. Anything that fails past this point — model errors, network
  // issues, an unparseable response — is out of the user's control, so it
  // gets one generic, actionable message (the manual fallback the
  // acceptance criteria asks for) rather than surfacing AI SDK internals.
  // The real cause still goes to the server log for debugging.
  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    const { output } = await generateText({
      model: google("gemini-3.5-flash-lite"),
      output: Output.object({ schema: ExtractedBillSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the billing details from this bill or invoice. If a field isn't visible or you aren't confident, return an empty string for it rather than guessing.",
            },
            { type: "file", data: bytes, mediaType: file.type, filename: file.name },
          ],
        },
      ],
    });

    const issueDate = emptyToNull(output.issueDate);
    const dueDate = emptyToNull(output.dueDate);

    return {
      success: true,
      data: {
        provider: emptyToNull(output.provider),
        amount: emptyToNull(output.amount),
        currency: emptyToNull(output.currency),
        // Dates are re-validated here rather than trusted from the model —
        // same reasoning as isValidDateOnly's other call sites: a
        // hallucinated or malformed date shouldn't reach the form as if it
        // were real.
        issueDate: issueDate && isValidDateOnly(issueDate) ? issueDate : null,
        dueDate: dueDate && isValidDateOnly(dueDate) ? dueDate : null,
        confidence: output.confidence,
      },
    };
  } catch (err) {
    console.error("Bill extraction failed:", err);
    return { success: false, error: "Couldn't read this bill automatically. Enter the details manually." };
  }
}
