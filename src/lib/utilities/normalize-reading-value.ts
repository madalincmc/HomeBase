// A meter's billed reading is only the leading whole-number digit row —
// any fractional/test portion after a decimal separator (often a
// different color on the physical meter, e.g. red) is never part of it,
// and leading zeros are display padding, not meaningful digits. Enforced
// here deterministically rather than trusted to the extraction model's
// prompt alone, the same reasoning isValidDateOnly's other call sites
// already follow for model/user input reaching this app. Handles a
// doubled separator (e.g. "04855,,15", seen on a real meter) the same as
// a single one since split() on any match works either way.
export function normalizeReadingValue(raw: string): string | null {
  const wholePart = raw.trim().split(/[.,]/)[0].replace(/\D/g, "");
  if (wholePart === "") return null;
  const withoutLeadingZeros = wholePart.replace(/^0+/, "");
  return withoutLeadingZeros === "" ? "0" : withoutLeadingZeros;
}
