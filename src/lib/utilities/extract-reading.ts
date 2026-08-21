"use server";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Same "no nullable/union in the Zod schema" constraint as bill extraction
// (MAD-103) — Google's structured-output support is a subset of OpenAPI 3.0
// that doesn't handle those. "" means "not legible", converted to null
// after the response comes back.
const ExtractedReadingSchema = z.object({
  value: z
    .string()
    .describe(
      "The current numeric reading shown on the meter display, as a plain decimal number with no units or thousands separator, e.g. '4821.3'. Empty string if not clearly legible."
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
      model: google("gemini-flash-latest"),
      output: Output.object({ schema: ExtractedReadingSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the current numeric reading from this utility meter display (electricity, gas, or water). Return just the number as shown, ignoring units. Some meters show trailing decimal digits in a different color (often red) that aren't part of the billed whole-number reading — include them as decimals only if a decimal point is visible, otherwise return the whole-number portion only. If the reading isn't clearly legible, return an empty string rather than guessing.",
            },
            { type: "file", data: bytes, mediaType: file.type, filename: file.name },
          ],
        },
      ],
    });

    const value = output.value.trim();
    return { success: true, data: { value: value === "" ? null : value, confidence: output.confidence } };
  } catch (err) {
    console.error("Meter reading extraction failed:", err);
    return { success: false, error: "Couldn't read this meter automatically. Enter the reading manually." };
  }
}
