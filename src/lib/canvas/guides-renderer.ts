/**
 * Guides Overlay Renderer (Simplified)
 *
 * Renders alignment guide lines on a separate overlay canvas.
 */

import type { Guide } from './guides-system';

export interface GuidesRendererConfig {
  color: string;
  lineWidth: number;
  dashPattern: number[];
}

export const DEFAULT_RENDERER_CONFIG: GuidesRendererConfig = {
  color: '#ff2d55',
  lineWidth: 1,
  dashPattern: [4, 4],
};

/**
 * Render guides on an overlay canvas context
 */
export function renderGuides(
  ctx: CanvasRenderingContext2D,
  guides: Guide[],
  zoom: number,
  canvasWidth: number,
  canvasHeight: number,
  config: GuidesRendererConfig = DEFAULT_RENDERER_CONFIG
): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (guides.length === 0) return;

  ctx.save();

  // Set styles
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  ctx.setLineDash(config.dashPattern);

  for (const guide of guides) {
    ctx.beginPath();

    if (guide.axis === 'x') {
      // Vertical line
      const x = guide.pos * zoom;
      const y1 = guide.span1 * zoom;
      const y2 = guide.span2 * zoom;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    } else if (guide.axis === 'y') {
      // Horizontal line
      const y = guide.pos * zoom;
      const x1 = guide.span1 * zoom;
      const x2 = guide.span2 * zoom;
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
    }

    ctx.stroke();
  }

  ctx.restore();
}
