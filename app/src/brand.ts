// Everything brand-specific lives here so a rename changes one file.
export const BRAND = {
  name: "Cueline",
  tagline: "Plays what you pick.",
  /** Shown on the privacy and terms pages. Must be a real inbox you read before going live. */
  supportEmail: "",
  /** The legal entity running the service, for the terms. */
  operator: "",
};

/** The cue mark: a play triangle on a line. Drawn from the logo brief; replace with the designed mark. */
export const MARK_PATHS = { triangle: "M11 7.5v12l10-6z", line: { x: 8, y: 23, w: 16, h: 3 } };
