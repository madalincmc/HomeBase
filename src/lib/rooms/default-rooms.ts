// Sensible defaults offered as one-click suggestions on the Rooms section
// of Settings — not auto-created at household setup. Since there's no
// onboarding flow (MAD-102), forcing these onto every household regardless
// of whether they fit (e.g. "Garden" for an apartment) would mean silently
// creating data nobody asked for; offering them as suggestions the user
// picks from keeps this consistent with the app's no-auth, no-onboarding
// posture while still satisfying "provide sensible default areas".
export const DEFAULT_ROOM_SUGGESTIONS = [
  "Kitchen",
  "Bathroom",
  "Living Room",
  "Bedroom",
  "Garage",
  "Garden",
] as const;
