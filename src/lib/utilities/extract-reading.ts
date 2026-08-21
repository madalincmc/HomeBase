"use server";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { normalizeReadingValue } from "./normalize-reading-value";

// Same "no nullable/union in the Zod schema" constraint as bill extraction
// (MAD-103) — Google's structured-output support is a subset of OpenAPI 3.0
// that doesn't handle those. "" means "not legible", converted to null
// after the response comes back.
const ExtractedReadingSchema = z.object({
  value: z
    .string()
    .describe(
      "The current whole-number reading shown on the meter display's main digit row, with no units or thousands separator, e.g. '4821'. Meters commonly show trailing fractional/test digits after a decimal point or comma, often in a different color (e.g. red) — ignore those entirely and return only the digits before that separator. Empty string if not clearly legible."
    ),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence that the extracted value is correct."),
});

export type ExtractedReading = { value: string | null; confidence: "high" | "medium" | "low" };
export type ExtractReadingResult = { success: true; data: ExtractedReading } | { success: false; error: string };

// Same accepted types/size limit as the attachments module (MAD-96).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function extractMeterReading(
  _prevState: ExtractReadingResult | null,
  formData: FormData
): Promise<ExtractReadingResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a meter photo first." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WEBP, HEIC images or PDF documents are supported." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: "File must be 10 MB or smaller." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    const { output } = await generateText({
      model: google("gemini-3.5-flash-lite"),
      output: Output.object({ schema: ExtractedReadingSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the current whole-number reading from this utility meter display (electricity, gas, or water) — the digits before any decimal point or comma. Ignore units, thousands separators, and any trailing fractional/test digits after that separator (often shown in a different color, e.g. red) — those are never part of the billed reading. If the reading isn't clearly legible, return an empty string rather than guessing.",
            },
            { type: "file", data: bytes, mediaType: file.type, filename: file.name },
          ],
        },
      ],
    });

    return { success: true, data: { value: normalizeReadingValue(output.value), confidence: output.confidence } };
  } catch (err) {
    console.error("Meter reading extraction failed:", err);
    return { success: false, error: "Couldn't read this meter automatically. Enter the reading manually." };
  }
}
