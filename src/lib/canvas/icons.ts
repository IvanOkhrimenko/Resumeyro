/**
 * SVG Icon Library for Canvas
 *
 * Professional approach: Icons as vector paths that render correctly
 * in both canvas (Fabric.js) and PDF export (svg2pdf.js)
 */

// Icon path definitions (SVG path data)
// These are simple, clean icons optimized for small sizes
export const ICON_PATHS = {
  // Location pin - simple marker
  location: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",

  // Phone - handset
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",

  // Email - envelope
  email: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",

  // Link - chain link
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",

  // LinkedIn - simple "in" style
  linkedin: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z",

  // GitHub - octocat simplified
  github: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z",

  // Briefcase - work/job
  briefcase: "M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z",

  // Globe - website
  globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",

  // User/Person - profile
  user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",

  // Calendar - date
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z",

  // Star - rating/skill
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",

  // Certificate/Award
  certificate: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
} as const;

export type IconName = keyof typeof ICON_PATHS;

// ViewBox for all icons (Material Design standard)
export const ICON_VIEWBOX = "0 0 24 24";

/**
 * Create a Fabric.js compatible path object for an icon
 */
export function createIconObject(
  iconName: IconName,
  x: number,
  y: number,
  size: number,
  color: string = "#374151"
): {
  id: string;
  type: "path";
  path: string;
  left: number;
  top: number;
  fill: string;
  stroke: string;
  scaleX: number;
  scaleY: number;
  originX: "left";
  originY: "top";
  selectable: boolean;
  evented: boolean;
} {
  const pathData = ICON_PATHS[iconName];
  // Scale factor: icons are defined in 24x24 viewbox
  const scale = size / 24;

  return {
    id: `icon-${iconName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "path",
    path: pathData,
    left: x,
    top: y,
    fill: color,
    stroke: color,
    scaleX: scale,
    scaleY: scale,
    originX: "left",
    originY: "top",
    selectable: true,
    evented: true,
  };
}

/**
 * Get icon dimensions after scaling
 */
export function getIconDimensions(size: number): { width: number; height: number } {
  return { width: size, height: size };
}

/**
 * Map emoji to icon name for migration
 */
export const EMOJI_TO_ICON: Record<string, IconName> = {
  "📍": "location",
  "📞": "phone",
  "✉️": "email",
  "📧": "email",
  "🔗": "link",
  "💼": "briefcase",
  "🌐": "globe",
  "👤": "user",
  "📅": "calendar",
  "⭐": "star",
  "🏆": "certificate",
};

/**
 * Check if a string contains an emoji that can be replaced with an icon
 */
export function hasReplaceableEmoji(text: string): boolean {
  return Object.keys(EMOJI_TO_ICON).some(emoji => text.includes(emoji));
}

/**
 * Extract emoji and remaining text from a string like "📍 Warsaw, Poland"
 * Returns { emoji, iconName, text } or null if no emoji found
 */
export function extractEmojiAndText(input: string): {
  emoji: string;
  iconName: IconName;
  text: string;
} | null {
  for (const [emoji, iconName] of Object.entries(EMOJI_TO_ICON)) {
    if (input.includes(emoji)) {
      const text = input.replace(emoji, "").trim();
      return { emoji, iconName, text };
    }
  }
  return null;
}
