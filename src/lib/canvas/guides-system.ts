/**
 * Canvas Alignment Guides System
 *
 * Shows guide lines when:
 * - Centers of two elements align
 * - Left/right/top/bottom edges align
 *
 * Uses actual visible bounds (not container bounds for text)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ElementData {
  id: string;
  // Actual visible bounds (for text - text bounds, for shapes - shape bounds)
  x: number;
  y: number;
  w: number;
  h: number;
  // For filtering
  hidden?: boolean;
  isGuide?: boolean;
  isPageBreak?: boolean;
  // Element type for prioritization
  isText?: boolean;
}

export interface Guide {
  kind: 'align';
  axis: 'x' | 'y';
  pos: number;
  // Span shows only between the two aligned elements
  span1: number;
  span2: number;
  // Info about what's aligned (for debugging)
  fromAnchor?: string;
  toAnchor?: string;
}

export interface LastSnap {
  key: string;
  pos: number;
}

export interface FrameResult {
  correctedX: number;
  correctedY: number;
  guides: Guide[];
  snapKeyX: string | null;
  snapKeyY: string | null;
}

export interface GuidesConfig {
  snapThresholdPx: number;
  hysteresisPx: number;
  gridEnabled: boolean;
  gridSize: number;
  pageWidth: number;
  pageHeight: number;
}

// =============================================================================
// SPATIAL INDEX
// =============================================================================

export class SpatialHashIndex {
  private elements: ElementData[] = [];

  build(elements: ElementData[]): void {
    this.elements = elements.filter(el =>
      !el.hidden && !el.isGuide && !el.isPageBreak && el.w > 0 && el.h > 0
    );
  }

  getAll(): ElementData[] {
    return this.elements;
  }
}

// =============================================================================
// ALIGNMENT DETECTION
// =============================================================================

interface AlignMatch {
  pos: number;           // Position of the alignment line
  delta: number;         // How much to move active element
  activeAnchor: string;  // Which anchor of active element (left/center/right or top/center/bottom)
  targetAnchor: string;  // Which anchor of target (or 'page')
  targetId: string;      // ID of target element or 'page'
  // For guide rendering - span between the two elements
  spanMin: number;
  spanMax: number;
  // Target element type for scoring
  targetIsText?: boolean;
}

function findAlignmentsX(
  active: ElementData,
  rawX: number,
  elements: ElementData[],
  pageWidth: number,
  threshold: number
): AlignMatch[] {
  const matches: AlignMatch[] = [];

  // Active element anchors at proposed position
  const activeLeft = rawX;
  const activeCenter = rawX + active.w / 2;
  const activeRight = rawX + active.w;
  const activeTop = active.y;
  const activeBottom = active.y + active.h;

  // Check page alignment
  const pageAnchors = [
    { pos: 0, name: 'page-left' },
    { pos: pageWidth / 2, name: 'page-center' },
    { pos: pageWidth, name: 'page-right' },
  ];

  for (const pa of pageAnchors) {
    // Left edge -> page anchor
    const deltaLeft = pa.pos - activeLeft;
    if (Math.abs(deltaLeft) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaLeft,
        activeAnchor: 'left',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeBottom,
      });
    }

    // Center -> page anchor
    const deltaCenter = pa.pos - activeCenter;
    if (Math.abs(deltaCenter) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaCenter,
        activeAnchor: 'center',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeBottom,
      });
    }

    // Right edge -> page anchor
    const deltaRight = pa.pos - activeRight;
    if (Math.abs(deltaRight) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaRight,
        activeAnchor: 'right',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeBottom,
      });
    }
  }

  // Check element alignment
  for (const el of elements) {
    if (el.id === active.id) continue;

    const elLeft = el.x;
    const elCenter = el.x + el.w / 2;
    const elRight = el.x + el.w;
    const elTop = el.y;
    const elBottom = el.y + el.h;

    // Calculate vertical span for guide line (between the two elements)
    const spanMin = Math.min(activeTop, elTop);
    const spanMax = Math.max(activeBottom, elBottom);

    const elAnchors = [
      { pos: elLeft, name: 'left' },
      { pos: elCenter, name: 'center' },
      { pos: elRight, name: 'right' },
    ];

    const activeAnchors = [
      { pos: activeLeft, name: 'left', delta: 0 },
      { pos: activeCenter, name: 'center', delta: 0 },
      { pos: activeRight, name: 'right', delta: 0 },
    ];

    for (const aa of activeAnchors) {
      for (const ea of elAnchors) {
        const delta = ea.pos - aa.pos;
        if (Math.abs(delta) <= threshold) {
          matches.push({
            pos: ea.pos,
            delta: delta,
            activeAnchor: aa.name,
            targetAnchor: ea.name,
            targetId: el.id,
            spanMin,
            spanMax,
            targetIsText: el.isText,
          });
        }
      }
    }
  }

  return matches;
}

function findAlignmentsY(
  active: ElementData,
  rawY: number,
  elements: ElementData[],
  pageHeight: number,
  threshold: number
): AlignMatch[] {
  const matches: AlignMatch[] = [];

  // Active element anchors at proposed position
  const activeTop = rawY;
  const activeCenter = rawY + active.h / 2;
  const activeBottom = rawY + active.h;
  const activeLeft = active.x;
  const activeRight = active.x + active.w;

  // Check page alignment (only top for infinite canvas)
  const pageAnchors = [
    { pos: 0, name: 'page-top' },
  ];

  for (const pa of pageAnchors) {
    const deltaTop = pa.pos - activeTop;
    if (Math.abs(deltaTop) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaTop,
        activeAnchor: 'top',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeRight,
      });
    }

    const deltaCenter = pa.pos - activeCenter;
    if (Math.abs(deltaCenter) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaCenter,
        activeAnchor: 'center',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeRight,
      });
    }

    const deltaBottom = pa.pos - activeBottom;
    if (Math.abs(deltaBottom) <= threshold) {
      matches.push({
        pos: pa.pos,
        delta: deltaBottom,
        activeAnchor: 'bottom',
        targetAnchor: pa.name,
        targetId: 'page',
        spanMin: 0,
        spanMax: activeRight,
      });
    }
  }

  // Check element alignment
  for (const el of elements) {
    if (el.id === active.id) continue;

    const elTop = el.y;
    const elCenter = el.y + el.h / 2;
    const elBottom = el.y + el.h;
    const elLeft = el.x;
    const elRight = el.x + el.w;

    // Calculate horizontal span for guide line (between the two elements)
    const spanMin = Math.min(activeLeft, elLeft);
    const spanMax = Math.max(activeRight, elRight);

    const elAnchors = [
      { pos: elTop, name: 'top' },
      { pos: elCenter, name: 'center' },
      { pos: elBottom, name: 'bottom' },
    ];

    const activeAnchors = [
      { pos: activeTop, name: 'top' },
      { pos: activeCenter, name: 'center' },
      { pos: activeBottom, name: 'bottom' },
    ];

    for (const aa of activeAnchors) {
      for (const ea of elAnchors) {
        const delta = ea.pos - aa.pos;
        if (Math.abs(delta) <= threshold) {
          matches.push({
            pos: ea.pos,
            delta: delta,
            activeAnchor: aa.name,
            targetAnchor: ea.name,
            targetId: el.id,
            spanMin,
            spanMax,
            targetIsText: el.isText,
          });
        }
      }
    }
  }

  return matches;
}

// =============================================================================
// SELECT BEST ALIGNMENT
// =============================================================================

function selectBestMatch(
  matches: AlignMatch[],
  lastSnap: LastSnap | null,
  threshold: number,
  hysteresis: number,
  activeIsText?: boolean
): AlignMatch | null {
  if (matches.length === 0) return null;

  // Build key for each match
  const withKeys = matches.map(m => ({
    ...m,
    key: `${m.activeAnchor}->${m.targetId}:${m.targetAnchor}`,
  }));

  // Hysteresis: prefer last snap if still valid
  if (lastSnap) {
    const locked = withKeys.find(m => m.key === lastSnap.key);
    if (locked && Math.abs(locked.delta) <= threshold + hysteresis) {
      return locked;
    }
  }

  // Categorize alignments by usefulness
  const scored = withKeys.map(m => {
    let score = 0;

    // Page alignments - very useful
    if (m.targetId === 'page') {
      score += 100;
      // Page center is most useful
      if (m.targetAnchor.includes('center')) score += 20;
      // Page left edge (margin) is also very useful for text
      if (m.targetAnchor.includes('left')) score += 15;
    }

    // Same anchor type (left-left, center-center, right-right, top-top) - most intuitive
    if (m.activeAnchor === m.targetAnchor) {
      score += 80;

      // LEFT-to-LEFT alignment: "where paragraphs start" - highest priority for text
      if (m.activeAnchor === 'left') {
        score += 30; // Extra boost for left edge alignment
        // Even higher if aligning text to text
        if (activeIsText && m.targetIsText) {
          score += 20;
        }
      }

      // TOP-to-TOP alignment: "in line with other elements" - very useful
      if (m.activeAnchor === 'top') {
        score += 25;
        // Boost for text-to-text horizontal alignment
        if (activeIsText && m.targetIsText) {
          score += 15;
        }
      }

      // Center-to-center is useful
      if (m.activeAnchor === 'center') {
        score += 10;
      }
    }

    // Edge-to-edge alignments (for snapping adjacent elements)
    // left→right means "my left edge = their right edge" (stacking horizontally)
    // right→left means "my right edge = their left edge"
    const isEdgeToEdge =
      (m.activeAnchor === 'left' && m.targetAnchor === 'right') ||
      (m.activeAnchor === 'right' && m.targetAnchor === 'left') ||
      (m.activeAnchor === 'top' && m.targetAnchor === 'bottom') ||
      (m.activeAnchor === 'bottom' && m.targetAnchor === 'top');

    if (isEdgeToEdge) {
      score += 60;
      // BOTTOM-to-TOP: stacking elements vertically - very common use case
      if (m.activeAnchor === 'top' && m.targetAnchor === 'bottom') {
        score += 10;
      }
    }

    // Boost for text element targets (more useful for alignment than shapes)
    if (m.targetIsText && m.targetId !== 'page') {
      score += 10;
    }

    // Smaller delta = better match
    score -= Math.abs(m.delta) * 2;

    return { ...m, score };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Return best match if it has a positive score
  const best = scored[0];
  if (best && best.score > 0) {
    return best;
  }

  return null;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export function computeGuidesAndSnaps(
  activeEl: ElementData,
  rawX: number,
  rawY: number,
  zoom: number,
  index: SpatialHashIndex,
  cfg: GuidesConfig,
  lastSnapX: LastSnap | null,
  lastSnapY: LastSnap | null,
  _canvasHeight: number
): FrameResult {
  // Convert thresholds to world units
  const threshold = cfg.snapThresholdPx / zoom;
  const hysteresis = cfg.hysteresisPx / zoom;

  const elements = index.getAll();

  // Update active element position for Y calculations
  const activeWithX = { ...activeEl, x: rawX };

  // Find alignments
  const matchesX = findAlignmentsX(activeEl, rawX, elements, cfg.pageWidth, threshold);
  const matchesY = findAlignmentsY(activeWithX, rawY, elements, cfg.pageHeight, threshold);

  // Select best matches
  const bestX = selectBestMatch(matchesX, lastSnapX, threshold, hysteresis, activeEl.isText);
  const bestY = selectBestMatch(matchesY, lastSnapY, threshold, hysteresis, activeEl.isText);

  // Calculate corrected positions
  let correctedX = rawX;
  let correctedY = rawY;

  if (bestX) {
    // Apply delta based on which anchor was matched
    correctedX = rawX + bestX.delta;
  } else if (cfg.gridEnabled) {
    // Grid snap as fallback
    correctedX = Math.round(rawX / cfg.gridSize) * cfg.gridSize;
  }

  if (bestY) {
    correctedY = rawY + bestY.delta;
  } else if (cfg.gridEnabled) {
    correctedY = Math.round(rawY / cfg.gridSize) * cfg.gridSize;
  }

  // Generate guides (only for alignment matches)
  const guides: Guide[] = [];

  if (bestX) {
    guides.push({
      kind: 'align',
      axis: 'x',
      pos: bestX.pos,
      span1: bestX.spanMin,
      span2: bestX.spanMax,
      fromAnchor: bestX.activeAnchor,
      toAnchor: bestX.targetAnchor,
    });
  }

  if (bestY) {
    guides.push({
      kind: 'align',
      axis: 'y',
      pos: bestY.pos,
      span1: bestY.spanMin,
      span2: bestY.spanMax,
      fromAnchor: bestY.activeAnchor,
      toAnchor: bestY.targetAnchor,
    });
  }

  return {
    correctedX,
    correctedY,
    guides,
    snapKeyX: bestX ? `${bestX.activeAnchor}->${bestX.targetId}:${bestX.targetAnchor}` : null,
    snapKeyY: bestY ? `${bestY.activeAnchor}->${bestY.targetId}:${bestY.targetAnchor}` : null,
  };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_GUIDES_CONFIG: GuidesConfig = {
  snapThresholdPx: 8,
  hysteresisPx: 5,
  gridEnabled: true,
  gridSize: 5,
  pageWidth: 595,
  pageHeight: 842,
};
