// Semantic Template Switcher
// Switches templates while preserving user content based on semantic types
// Elements are mapped to their new positions/styles based on semanticType

import { FabricObject, IText, Textbox, Rect } from "fabric";
import { SemanticType, SemanticCategory, SEMANTIC_CATEGORY_MAP, hasSemanticType } from "./semantic-types";
import { generateTemplateZones, resolveElementStyle, TemplateZones, SIDEBAR_SECTIONS, MAIN_SECTIONS } from "./template-zones";
import { TemplateDefinition, getTemplateCanvasData } from "../templates";
import { ResumeStyle, A4_WIDTH, A4_HEIGHT, MARGIN } from "../templates/schema";

// ============================================
// INTERFACES
// ============================================

/**
 * Extracted element with semantic info and text content
 */
interface SemanticElement {
  semanticType: SemanticType;
  semanticGroup?: string;
  text: string;
  originalObj: any;  // Reference to original Fabric object
}

/**
 * Grouped elements by category
 */
type SemanticElementsByCategory = Partial<Record<SemanticCategory, SemanticElement[]>>;

// ============================================
// EXTRACT SEMANTIC ELEMENTS
// ============================================

/**
 * Extract all elements with semantic types from canvas JSON
 */
export function extractSemanticElements(canvasJSON: any): SemanticElement[] {
  const objects = canvasJSON.objects || [];
  const elements: SemanticElement[] = [];

  for (const obj of objects) {
    // Check if object has semantic type
    if (obj.semanticType) {
      // Get text content
      let text = "";
      if (obj.type === "IText" || obj.type === "i-text" || obj.type === "Textbox" || obj.type === "textbox") {
        text = obj.text || "";
      }

      elements.push({
        semanticType: obj.semanticType as SemanticType,
        semanticGroup: obj.semanticGroup,
        text,
        originalObj: obj,
      });
    }
  }

  return elements;
}

/**
 * Group elements by their semantic category
 */
export function groupElementsByCategory(elements: SemanticElement[]): SemanticElementsByCategory {
  const grouped: SemanticElementsByCategory = {};

  for (const element of elements) {
    const category = SEMANTIC_CATEGORY_MAP[element.semanticType];
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category]!.push(element);
  }

  return grouped;
}

/**
 * Group elements by semantic group (for repeatable items like experience entries)
 */
export function groupBySemanticGroup(elements: SemanticElement[]): Map<string, SemanticElement[]> {
  const grouped = new Map<string, SemanticElement[]>();

  for (const element of elements) {
    const group = element.semanticGroup || "ungrouped";
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(element);
  }

  return grouped;
}

// ============================================
// RENDER SEMANTIC ELEMENTS TO NEW TEMPLATE
// ============================================

/**
 * Layout state for tracking cursor position during rendering
 */
interface LayoutState {
  mainY: number;      // Current Y position in main content area
  sidebarY: number;   // Current Y position in sidebar (if applicable)
  mainX: number;      // X position of main content
  mainWidth: number;  // Width of main content
  sidebarX: number;   // X position of sidebar
  sidebarWidth: number; // Width of sidebar
}

/**
 * Create Fabric text object with semantic styling
 */
function createTextElement(
  element: SemanticElement,
  x: number,
  y: number,
  width: number,
  style: ResumeStyle,
  zones: TemplateZones
): any {
  const elementStyle = resolveElementStyle(element.semanticType, zones, style);
  const isMultiline = element.text.includes("\n") ||
                      element.semanticType.includes("description") ||
                      element.semanticType.includes("summary") ||
                      element.semanticType === "skill_list";

  const textObj: any = {
    type: isMultiline ? "Textbox" : "IText",
    left: x,
    top: y,
    text: element.text,
    fontSize: elementStyle.fontSize || 10,
    fontFamily: style.fonts.body,
    fontWeight: elementStyle.fontWeight || "normal",
    fontStyle: elementStyle.fontStyle || "normal",
    fill: elementStyle.fill || style.colors.text,
    width: isMultiline ? width : undefined,
    lineHeight: style.layout.lineHeight,
    originX: "left",
    originY: "top",
    charSpacing: (elementStyle.fontWeight === "bold" && (elementStyle.fontSize || 10) <= 12) ? 50 : 0,
    // Preserve semantic info
    semanticType: element.semanticType,
    semanticGroup: element.semanticGroup,
  };

  // Add textAlign if specified
  if (elementStyle.textAlign) {
    textObj.textAlign = elementStyle.textAlign;
  }

  return textObj;
}

/**
 * Get estimated height of text element
 */
function estimateTextHeight(text: string, fontSize: number, lineHeight: number, width?: number): number {
  // Simple estimation: count lines
  const lines = text.split("\n").length;
  const baseHeight = fontSize * lineHeight;

  // If multiline textbox, estimate wrapped lines
  if (width) {
    const avgCharWidth = fontSize * 0.5;
    const charsPerLine = Math.floor(width / avgCharWidth);
    let totalLines = 0;

    for (const line of text.split("\n")) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
    }

    return totalLines * baseHeight;
  }

  return lines * baseHeight;
}

/**
 * Render header background if template has one
 */
function createHeaderBackground(zones: TemplateZones): any[] {
  const objects: any[] = [];

  if (zones.headerArea) {
    objects.push({
      type: "Rect",
      left: zones.headerArea.x,
      top: zones.headerArea.y,
      width: zones.headerArea.width,
      height: zones.headerArea.height,
      fill: zones.headerArea.backgroundColor,
      selectable: false,
      evented: false,
    });
  }

  if (zones.sidebarArea) {
    objects.push({
      type: "Rect",
      left: zones.sidebarArea.x,
      top: zones.sidebarArea.y,
      width: zones.sidebarArea.width,
      height: zones.sidebarArea.height,
      fill: zones.sidebarArea.backgroundColor,
      selectable: false,
      evented: false,
    });
  }

  return objects;
}

/**
 * Render personal info section (name, title)
 */
function renderPersonalSection(
  elements: SemanticElement[],
  zones: TemplateZones,
  style: ResumeStyle,
  state: LayoutState
): any[] {
  const objects: any[] = [];
  let currentY = zones.personal.name.y === "auto" ? state.mainY : zones.personal.name.y as number;

  // Find name element
  const nameElement = elements.find(e => e.semanticType === "name");
  if (nameElement) {
    const nameZone = zones.personal.name;
    objects.push({
      type: "IText",
      left: nameZone.x,
      top: currentY,
      text: nameElement.text,
      fontSize: nameZone.fontSize,
      fontFamily: style.fonts.heading,
      fontWeight: nameZone.fontWeight || "bold",
      fill: nameZone.fill,
      textAlign: nameZone.textAlign || "left",
      originX: nameZone.textAlign === "center" ? "center" : "left",
      originY: "top",
      semanticType: "name",
      semanticGroup: nameElement.semanticGroup,
    });
    currentY += nameZone.fontSize + (zones.personal.title.marginTop || 5);
  }

  // Find title element
  const titleElement = elements.find(e => e.semanticType === "title");
  if (titleElement) {
    const titleZone = zones.personal.title;
    const titleY = titleZone.y === "auto" ? currentY : titleZone.y as number;
    objects.push({
      type: "IText",
      left: titleZone.x,
      top: titleY,
      text: titleElement.text,
      fontSize: titleZone.fontSize,
      fontFamily: style.fonts.body,
      fontWeight: titleZone.fontWeight || "normal",
      fill: titleZone.fill,
      textAlign: titleZone.textAlign || "left",
      originX: titleZone.textAlign === "center" ? "center" : "left",
      originY: "top",
      semanticType: "title",
      semanticGroup: titleElement.semanticGroup,
    });
    currentY = titleY + titleZone.fontSize + 10;
  }

  // Update state for contact position
  if (zones.headerArea) {
    state.mainY = zones.headerArea.height + 20;
  } else {
    state.mainY = currentY + 20;
  }

  return objects;
}

/**
 * Render contact section
 */
function renderContactSection(
  elements: SemanticElement[],
  zones: TemplateZones,
  style: ResumeStyle,
  state: LayoutState
): any[] {
  const objects: any[] = [];
  const contactZone = zones.contact;

  // Filter contact elements
  const contactTypes: SemanticType[] = [
    "email", "phone", "location", "address", "linkedin", "github",
    "website", "portfolio", "twitter", "telegram", "instagram",
  ];
  const contactElements = elements.filter(e => contactTypes.includes(e.semanticType));

  if (contactElements.length === 0) return objects;

  let currentY = contactZone.y === "auto" ? state.mainY : contactZone.y as number;

  if (contactZone.layout === "horizontal") {
    // Horizontal layout - combine into one line with separator
    const separator = contactZone.separator || " | ";
    const combinedText = contactElements.map(e => e.text).join(separator);

    objects.push({
      type: "IText",
      left: contactZone.x,
      top: currentY,
      text: combinedText,
      fontSize: contactZone.itemStyle.fontSize || 10,
      fontFamily: style.fonts.body,
      fill: contactZone.itemStyle.fill || style.colors.textLight,
      textAlign: contactZone.itemStyle.textAlign || "left",
      originX: contactZone.itemStyle.textAlign === "center" ? "center" : "left",
      originY: "top",
      semanticType: "email", // Use first as primary
    });

    currentY += (contactZone.itemStyle.fontSize || 10) + 15;
  } else {
    // Vertical layout - each on its own line
    for (const element of contactElements) {
      objects.push({
        type: "IText",
        left: contactZone.x,
        top: currentY,
        text: element.text,
        fontSize: contactZone.itemStyle.fontSize || 10,
        fontFamily: style.fonts.body,
        fill: contactZone.itemStyle.fill || style.colors.textLight,
        originX: "left",
        originY: "top",
        semanticType: element.semanticType,
        semanticGroup: element.semanticGroup,
      });
      currentY += (contactZone.itemStyle.fontSize || 10) + contactZone.spacing;
    }
  }

  // Update state
  if (!zones.sidebarArea || contactZone.x >= (zones.sidebarArea?.width || 0)) {
    state.mainY = currentY;
  } else {
    state.sidebarY = currentY;
  }

  return objects;
}

/**
 * Render summary section
 */
function renderSummarySection(
  elements: SemanticElement[],
  zones: TemplateZones,
  style: ResumeStyle,
  state: LayoutState
): any[] {
  const objects: any[] = [];
  const summaryElement = elements.find(e => e.semanticType === "summary" || e.semanticType === "objective");

  if (!summaryElement) return objects;

  const summaryZone = zones.summary;
  let currentY = summaryZone.y === "auto" ? state.mainY + (summaryZone.style.marginTop || 0) : summaryZone.y as number;

  // Optional header
  if (summaryZone.headerStyle) {
    objects.push({
      type: "IText",
      left: summaryZone.x,
      top: currentY,
      text: summaryElement.semanticType === "objective" ? "OBJECTIVE" : "SUMMARY",
      fontSize: summaryZone.headerStyle.fontSize || 11,
      fontFamily: style.fonts.body,
      fontWeight: "bold",
      fill: summaryZone.headerStyle.fill || style.colors.accent,
      charSpacing: 50,
      originX: "left",
      originY: "top",
      semanticType: "section_header",
    });
    currentY += (summaryZone.headerStyle.fontSize || 11) + (summaryZone.headerStyle.marginBottom || 8);
  }

  // Summary text
  objects.push({
    type: "Textbox",
    left: summaryZone.x,
    top: currentY,
    text: summaryElement.text,
    width: summaryZone.width,
    fontSize: summaryZone.style.fontSize || 10,
    fontFamily: style.fonts.body,
    fontStyle: summaryZone.style.fontStyle || "normal",
    fill: summaryZone.style.fill || style.colors.text,
    lineHeight: summaryZone.style.lineHeight || style.layout.lineHeight,
    textAlign: summaryZone.style.textAlign || "left",
    originX: "left",
    originY: "top",
    semanticType: summaryElement.semanticType,
    semanticGroup: summaryElement.semanticGroup,
  });

  const textHeight = estimateTextHeight(
    summaryElement.text,
    summaryZone.style.fontSize || 10,
    summaryZone.style.lineHeight || style.layout.lineHeight,
    summaryZone.width
  );

  state.mainY = currentY + textHeight + (zones.sections.spacing || 20);

  return objects;
}

/**
 * Render a generic section (experience, education, etc.)
 */
function renderSection(
  sectionType: SemanticCategory,
  sectionHeader: string,
  elements: SemanticElement[],
  zones: TemplateZones,
  style: ResumeStyle,
  state: LayoutState,
  inSidebar: boolean
): any[] {
  const objects: any[] = [];

  if (elements.length === 0) return objects;

  const sectionsZone = zones.sections;
  const categoryStyle = zones.categoryStyles?.[sectionType];

  // Determine position
  const x = inSidebar ? (categoryStyle?.x || zones.sidebarArea?.x || MARGIN) + 15 : sectionsZone.x;
  const width = inSidebar ? (categoryStyle?.width || (zones.sidebarArea?.width || 180) - 30) : sectionsZone.width;
  let currentY = inSidebar ? state.sidebarY : state.mainY;

  // Section header
  const headerType = `${sectionType}_section` as SemanticType;
  const headerElement = elements.find(e => e.semanticType === headerType);
  const headerText = headerElement?.text || sectionHeader;

  objects.push({
    type: "IText",
    left: x,
    top: currentY,
    text: headerText,
    fontSize: sectionsZone.headerStyle.fontSize || 11,
    fontFamily: style.fonts.body,
    fontWeight: "bold",
    fill: inSidebar ? (categoryStyle?.fill || style.colors.headerText) : (sectionsZone.headerStyle.fill || style.colors.accent),
    charSpacing: 50,
    originX: "left",
    originY: "top",
    semanticType: headerType,
  });

  currentY += (sectionsZone.headerStyle.fontSize || 11) + (sectionsZone.headerStyle.marginBottom || 10);

  // Section content
  const contentElements = elements.filter(e => e.semanticType !== headerType);

  // Group by semantic group for repeatable sections
  const groups = groupBySemanticGroup(contentElements);

  for (const [, groupElements] of groups) {
    for (const element of groupElements) {
      const elementStyle = resolveElementStyle(element.semanticType, zones, style);
      const isMultiline = element.text.includes("\n") ||
                          element.semanticType.includes("description") ||
                          element.semanticType.includes("list");

      objects.push({
        type: isMultiline ? "Textbox" : "IText",
        left: x,
        top: currentY,
        text: element.text,
        width: isMultiline ? width : undefined,
        fontSize: elementStyle.fontSize || 10,
        fontFamily: style.fonts.body,
        fontWeight: elementStyle.fontWeight || "normal",
        fontStyle: elementStyle.fontStyle || "normal",
        fill: inSidebar ? (categoryStyle?.fill || style.colors.headerText) : (elementStyle.fill || style.colors.text),
        lineHeight: style.layout.lineHeight,
        originX: "left",
        originY: "top",
        semanticType: element.semanticType,
        semanticGroup: element.semanticGroup,
      });

      const height = estimateTextHeight(
        element.text,
        elementStyle.fontSize || 10,
        style.layout.lineHeight,
        isMultiline ? width : undefined
      );

      currentY += height + sectionsZone.itemSpacing;
    }

    currentY += 5; // Extra space between groups
  }

  currentY += sectionsZone.spacing - sectionsZone.itemSpacing;

  // Update state
  if (inSidebar) {
    state.sidebarY = currentY;
  } else {
    state.mainY = currentY;
  }

  return objects;
}

// ============================================
// MAIN TEMPLATE SWITCHER
// ============================================

/**
 * Apply template to existing semantic elements
 * Preserves text content while applying new layout and styles
 */
export function applyTemplateToSemanticElements(
  currentCanvasJSON: any,
  template: TemplateDefinition
): any {
  const style = template.resumeData.styling;
  const zones = generateTemplateZones(style);

  // Extract semantic elements from current canvas
  const semanticElements = extractSemanticElements(currentCanvasJSON);

  // If no semantic elements found, return template as-is
  if (semanticElements.length === 0) {
    console.log("[SemanticSwitcher] No semantic elements found, using template defaults");
    return getTemplateCanvasData(template);
  }

  console.log(`[SemanticSwitcher] Found ${semanticElements.length} semantic elements`);

  // Group elements by category
  const elementsByCategory = groupElementsByCategory(semanticElements);

  // Initialize layout state
  const state: LayoutState = {
    mainY: MARGIN,
    sidebarY: zones.sidebarArea ? 30 : MARGIN,
    mainX: zones.mainContentArea.x,
    mainWidth: zones.mainContentArea.width,
    sidebarX: zones.sidebarArea?.x || 0,
    sidebarWidth: zones.sidebarArea?.width || 0,
  };

  // Start building new canvas
  const objects: any[] = [];

  // 1. Add background elements (header, sidebar)
  objects.push(...createHeaderBackground(zones));

  // 2. Render personal info (always in header area)
  const personalElements = elementsByCategory.personal || [];
  objects.push(...renderPersonalSection(personalElements, zones, style, state));

  // 3. Render contact info
  const contactElements = elementsByCategory.contact || [];
  objects.push(...renderContactSection(contactElements, zones, style, state));

  // 4. Render summary
  const summaryElements = elementsByCategory.summary || [];
  objects.push(...renderSummarySection(summaryElements, zones, style, state));

  // 5. Render main sections
  const hasSidebar = !!zones.sidebarArea;

  const sectionConfigs: Array<{
    category: SemanticCategory;
    header: string;
    inSidebar: boolean;
  }> = [
    { category: "experience", header: "WORK EXPERIENCE", inSidebar: false },
    { category: "education", header: "EDUCATION", inSidebar: false },
    { category: "projects", header: "PROJECTS", inSidebar: false },
    { category: "awards", header: "AWARDS", inSidebar: false },
    { category: "publications", header: "PUBLICATIONS", inSidebar: false },
    { category: "volunteer", header: "VOLUNTEER", inSidebar: false },
    { category: "courses", header: "COURSES", inSidebar: false },
    { category: "memberships", header: "MEMBERSHIPS", inSidebar: false },
    { category: "references", header: "REFERENCES", inSidebar: false },
    { category: "patents", header: "PATENTS", inSidebar: false },
    { category: "military", header: "MILITARY SERVICE", inSidebar: false },
    // Sidebar sections (if sidebar layout)
    { category: "skills", header: "SKILLS", inSidebar: hasSidebar && SIDEBAR_SECTIONS.includes("skills") },
    { category: "languages", header: "LANGUAGES", inSidebar: hasSidebar && SIDEBAR_SECTIONS.includes("languages") },
    { category: "certifications", header: "CERTIFICATIONS", inSidebar: hasSidebar && SIDEBAR_SECTIONS.includes("certifications") },
    { category: "interests", header: "INTERESTS", inSidebar: hasSidebar && SIDEBAR_SECTIONS.includes("interests") },
  ];

  for (const config of sectionConfigs) {
    const elements = elementsByCategory[config.category];
    if (elements && elements.length > 0) {
      objects.push(
        ...renderSection(
          config.category,
          config.header,
          elements,
          zones,
          style,
          state,
          config.inSidebar
        )
      );
    }
  }

  // 6. Handle custom/layout elements
  const customElements = elementsByCategory.custom || [];
  const layoutElements = elementsByCategory.layout || [];
  const remainingElements = [...customElements, ...layoutElements];

  for (const element of remainingElements) {
    if (element.semanticType === "custom_text" || element.semanticType === "section_header") {
      objects.push(
        createTextElement(element, state.mainX, state.mainY, state.mainWidth, style, zones)
      );
      state.mainY += estimateTextHeight(element.text, 10, style.layout.lineHeight) + 10;
    }
  }

  // Build final canvas JSON
  return {
    version: "6.0.0",
    objects,
  };
}

/**
 * Check if canvas has any semantic elements
 */
export function canvasHasSemanticElements(canvasJSON: any): boolean {
  const objects = canvasJSON.objects || [];
  return objects.some((obj: any) => obj.semanticType);
}
