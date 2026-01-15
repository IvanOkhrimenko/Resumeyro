/**
 * Extract Semantic Map from Canvas
 *
 * Creates a mapping of canvas elements with their semantic types,
 * text content, and position information for AI analysis.
 */

import type { Canvas, Object as FabricObject } from "fabric";
import type { SemanticType } from "./semantic-types";

export interface SemanticMapEntry {
  id: string;
  text: string;
  semanticType: SemanticType | string;
  semanticGroup?: string;
  position: {
    top: number;
    left: number;
  };
  fontSize?: number;
  fontWeight?: string;
}

export interface SemanticMap {
  entries: SemanticMapEntry[];
  fullText: string;
  sectionHeaders: string[];
}

/**
 * Extract text content and semantic information from canvas objects
 */
export function extractSemanticMap(canvas: Canvas): SemanticMap {
  const entries: SemanticMapEntry[] = [];
  const sectionHeaders: string[] = [];

  const objects = canvas.getObjects();

  for (const obj of objects) {
    // Skip non-selectable and special objects
    if (obj.selectable === false) continue;
    if ((obj as any)._isPageBreak || (obj as any)._isGuide) continue;

    const objType = (obj as any).type?.toLowerCase() || '';
    const isTextObject = objType === 'textbox' || objType === 'i-text' || objType === 'text';

    if (!isTextObject) continue;

    const id = (obj as any).id;
    const text = (obj as any).text || '';
    const semanticType = (obj as any).semanticType || inferSemanticType(obj);
    const semanticGroup = (obj as any).semanticGroup;

    if (!text.trim()) continue;

    const entry: SemanticMapEntry = {
      id: id || `obj-${entries.length}`,
      text: text.trim(),
      semanticType,
      semanticGroup,
      position: {
        top: obj.top || 0,
        left: obj.left || 0,
      },
      fontSize: (obj as any).fontSize,
      fontWeight: (obj as any).fontWeight,
    };

    entries.push(entry);

    // Track section headers
    if (semanticType?.includes('_section') || isSectionHeader(obj)) {
      sectionHeaders.push(text.trim().toUpperCase());
    }
  }

  // Sort entries by vertical position (top to bottom)
  entries.sort((a, b) => a.position.top - b.position.top);

  // Build full text for AI analysis
  const fullText = entries.map(e => e.text).join('\n\n');

  return {
    entries,
    fullText,
    sectionHeaders,
  };
}

/**
 * Infer semantic type from object properties if not explicitly set
 */
function inferSemanticType(obj: FabricObject): SemanticType | string {
  const text = ((obj as any).text || '').toLowerCase().trim();
  const fontSize = (obj as any).fontSize || 12;
  const fontWeight = (obj as any).fontWeight || 'normal';
  const top = obj.top || 0;
  const charSpacing = (obj as any).charSpacing || 0;
  const isUpperCase = text === text.toUpperCase() && text.length > 2;

  // Check for common patterns

  // Email
  if (text.includes('@') && text.includes('.')) {
    return 'email';
  }

  // Phone
  if (/[\+]?\d[\d\s\-\(\)]{7,}/.test(text)) {
    return 'phone';
  }

  // URLs
  if (text.includes('linkedin.com') || text.includes('linkedin:')) {
    return 'linkedin';
  }
  if (text.includes('github.com') || text.includes('github:')) {
    return 'github';
  }
  if (text.includes('http') || text.includes('www.')) {
    return 'website';
  }

  // Name (large font at top)
  if (fontSize >= 24 && fontWeight === 'bold' && top < 150) {
    return 'name';
  }

  // Title (medium font near name)
  if (fontSize >= 14 && fontSize < 24 && top < 150) {
    return 'title';
  }

  // Section headers (uppercase with spacing)
  if (isUpperCase && charSpacing > 20 && text.length < 30) {
    const sectionByHeader = detectSectionType(text);
    if (sectionByHeader) return sectionByHeader;
  }

  // Section headers by content
  const sectionType = detectSectionType(text);
  if (sectionType && (fontWeight === 'bold' || isUpperCase)) {
    return sectionType;
  }

  // Default - check if it looks like a description
  if (text.length > 100) {
    return 'summary';
  }

  return 'custom';
}

/**
 * Detect section type from header text
 */
function detectSectionType(text: string): SemanticType | null {
  const lower = text.toLowerCase();

  // Experience
  if (lower.includes('experience') || lower.includes('employment') ||
      lower.includes('work history') || lower.includes('досвід')) {
    return 'experience_section';
  }

  // Education
  if (lower.includes('education') || lower.includes('academic') ||
      lower.includes('освіта') || lower.includes('ausbildung')) {
    return 'education_section';
  }

  // Skills
  if (lower.includes('skill') || lower.includes('competenc') ||
      lower.includes('навички') || lower.includes('kenntnisse')) {
    return 'skills_section';
  }

  // Summary
  if (lower.includes('summary') || lower.includes('profile') ||
      lower.includes('about') || lower.includes('objective') ||
      lower.includes('про мене') || lower.includes('профіль')) {
    return 'summary';
  }

  // Languages
  if (lower.includes('language') || lower.includes('мови') || lower.includes('sprachen')) {
    return 'languages_section';
  }

  // Certifications
  if (lower.includes('certification') || lower.includes('certificate') ||
      lower.includes('сертифіка')) {
    return 'certifications_section';
  }

  // Projects
  if (lower.includes('project') || lower.includes('проект')) {
    return 'projects_section';
  }

  // Interests
  if (lower.includes('interest') || lower.includes('hobbies') ||
      lower.includes('інтереси') || lower.includes('хобі')) {
    return 'interests_section';
  }

  return null;
}

/**
 * Check if object looks like a section header
 */
function isSectionHeader(obj: FabricObject): boolean {
  const text = ((obj as any).text || '').trim();
  const charSpacing = (obj as any).charSpacing || 0;
  const fontWeight = (obj as any).fontWeight || 'normal';
  const isUpperCase = text === text.toUpperCase();

  // Section headers are usually: short, uppercase, bold, with letter spacing
  return (
    text.length < 40 &&
    text.length > 2 &&
    !text.includes('\n') &&
    (isUpperCase || fontWeight === 'bold') &&
    (charSpacing > 20 || fontWeight === 'bold')
  );
}

/**
 * Find element by semantic type
 */
export function findElementBySemanticType(
  canvas: Canvas,
  semanticType: SemanticType | string
): FabricObject | null {
  const objects = canvas.getObjects();

  for (const obj of objects) {
    if ((obj as any).semanticType === semanticType) {
      return obj;
    }
  }

  // Fallback: try to infer
  for (const obj of objects) {
    if (inferSemanticType(obj) === semanticType) {
      return obj;
    }
  }

  return null;
}

/**
 * Find element by ID
 */
export function findElementById(canvas: Canvas, id: string): FabricObject | null {
  const objects = canvas.getObjects();

  // First, try exact ID match
  for (const obj of objects) {
    if ((obj as any).id === id) {
      return obj;
    }
  }

  // Second, try exact semantic type match
  for (const obj of objects) {
    if ((obj as any).semanticType === id) {
      return obj;
    }
  }

  return null;
}

/**
 * Find element by semantic type AND text content (more precise matching)
 * Prioritizes text matching over semantic type for better accuracy
 */
export function findElementByTypeAndText(
  canvas: Canvas,
  semanticType: string | undefined,
  textContent: string | undefined
): FabricObject | null {
  const objects = canvas.getObjects();

  // Filter to only text objects
  const textObjects = objects.filter((obj) => {
    const type = ((obj as any).type || '').toLowerCase();
    return type === 'textbox' || type === 'i-text' || type === 'text';
  });

  if (!textContent) {
    // If no text content, try semantic type only
    if (semanticType) {
      const found = findElementById(canvas, semanticType);
      if (found) console.log('[FindElement] Found by semantic type only:', semanticType);
      return found;
    }
    return null;
  }

  const normalizedSearch = textContent.trim().toLowerCase();

  // Extract first line/sentence for matching (more reliable than full text)
  const searchFirstLine = normalizedSearch.split('\n')[0].substring(0, 100);

  // Extract first few words for fuzzy matching (handles truncation by AI)
  const searchFirstWords = normalizedSearch.split(/\s+/).slice(0, 8).join(' ');

  // 1. Exact match by full text (regardless of semantic type - text is more reliable)
  for (const obj of textObjects) {
    const objText = ((obj as any).text || '').trim().toLowerCase();
    if (objText === normalizedSearch) {
      console.log('[FindElement] Exact text match found');
      return obj;
    }
  }

  // 2. Text starts with same first line
  for (const obj of textObjects) {
    const objText = ((obj as any).text || '').trim().toLowerCase();
    const objFirstLine = objText.split('\n')[0].substring(0, 100);

    if (objFirstLine === searchFirstLine && searchFirstLine.length > 20) {
      console.log('[FindElement] First line match found');
      return obj;
    }
  }

  // 3. First few words match (handles AI truncation)
  if (searchFirstWords.length > 15) {
    for (const obj of textObjects) {
      const objText = ((obj as any).text || '').trim().toLowerCase();
      const objFirstWords = objText.split(/\s+/).slice(0, 8).join(' ');

      if (objFirstWords === searchFirstWords) {
        console.log('[FindElement] First words match found');
        return obj;
      }
    }
  }

  // 4. Search text is contained within object text (object is longer)
  // This handles cases where AI truncated the text
  for (const obj of textObjects) {
    const objText = ((obj as any).text || '').trim().toLowerCase();

    // Only match if object text is longer and contains the search
    if (objText.length >= normalizedSearch.length && objText.includes(normalizedSearch)) {
      console.log('[FindElement] Search contained in object text');
      return obj;
    }
  }

  // 5. Object text is contained in search text (AI included extra context)
  for (const obj of textObjects) {
    const objText = ((obj as any).text || '').trim().toLowerCase();

    // Skip very short texts to avoid false matches
    if (objText.length < 30) continue;

    if (normalizedSearch.includes(objText)) {
      console.log('[FindElement] Object text contained in search');
      return obj;
    }
  }

  // 6. Fuzzy match - significant word overlap
  const searchWords = new Set(normalizedSearch.split(/\s+/).filter((w: string) => w.length > 3));
  if (searchWords.size >= 5) {
    let bestMatch: FabricObject | null = null;
    let bestScore = 0;

    for (const obj of textObjects) {
      const objText = ((obj as any).text || '').trim().toLowerCase();
      const objWords = new Set(objText.split(/\s+/).filter((w: string) => w.length > 3));

      if (objWords.size < 5) continue;

      // Calculate overlap score
      let overlap = 0;
      for (const word of searchWords) {
        if (objWords.has(word)) overlap++;
      }

      const score = overlap / Math.min(searchWords.size, objWords.size);

      // Require at least 60% word overlap
      if (score > 0.6 && score > bestScore) {
        bestScore = score;
        bestMatch = obj;
      }
    }

    if (bestMatch) {
      console.log('[FindElement] Fuzzy match found with score:', bestScore.toFixed(2));
      return bestMatch;
    }
  }

  // 7. Last resort: semantic type only
  if (semanticType) {
    const found = findElementById(canvas, semanticType);
    if (found) {
      console.log('[FindElement] Fallback to semantic type:', semanticType);
      return found;
    }
  }

  console.log('[FindElement] No match found for text:', normalizedSearch.substring(0, 50) + '...');
  return null;
}

/**
 * Format semantic map for AI prompt with better structure
 */
export function formatSemanticMapForPrompt(map: SemanticMap): string {
  // Group entries by semantic group for better context
  const grouped = new Map<string, SemanticMapEntry[]>();
  const ungrouped: SemanticMapEntry[] = [];

  for (const entry of map.entries) {
    if (entry.semanticGroup) {
      const existing = grouped.get(entry.semanticGroup) || [];
      existing.push(entry);
      grouped.set(entry.semanticGroup, existing);
    } else {
      ungrouped.push(entry);
    }
  }

  const lines: string[] = [];

  // Format grouped entries (experience, education items)
  for (const [group, entries] of grouped) {
    const groupType = group.split('_')[0]; // e.g., "experience" from "experience_123"
    lines.push(`\n--- ${groupType.toUpperCase()} ENTRY ---`);
    for (const entry of entries) {
      const typeLabel = entry.semanticType || 'text';
      // Show full text for better analysis (up to 500 chars)
      const text = entry.text.length > 500
        ? entry.text.substring(0, 500) + '...'
        : entry.text;
      lines.push(`[${typeLabel}]: "${text}"`);
    }
  }

  // Format ungrouped entries
  if (ungrouped.length > 0) {
    lines.push(`\n--- OTHER CONTENT ---`);
    for (const entry of ungrouped) {
      const typeLabel = entry.semanticType || 'text';
      const text = entry.text.length > 500
        ? entry.text.substring(0, 500) + '...'
        : entry.text;
      lines.push(`[${typeLabel}]: "${text}"`);
    }
  }

  return lines.join('\n');
}
