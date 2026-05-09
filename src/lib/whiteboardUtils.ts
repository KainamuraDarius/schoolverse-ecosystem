/**
 * Whiteboard Utilities
 * Includes keyboard shortcuts, export utilities, and helper functions
 */

import html2canvas from "html2canvas";

/**
 * Keyboard Shortcuts for Whiteboard
 */
export const KEYBOARD_SHORTCUTS = {
  UNDO: ["ctrl+z", "cmd+z"],
  REDO: ["ctrl+y", "cmd+y", "ctrl+shift+z", "cmd+shift+z"],
  CLEAR: ["ctrl+shift+c", "cmd+shift+c"],
  SAVE: ["ctrl+s", "cmd+s"],
  DELETE: ["Delete", "Backspace"],
  PEN: ["p"],
  ERASER: ["e"],
  TEXT: ["t"],
  RECTANGLE: ["r"],
  ELLIPSE: ["c"],
  LINE: ["l"],
};

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string[]
): boolean {
  const keys: string[] = [];

  if (event.ctrlKey || event.metaKey) keys.push(event.ctrlKey ? "ctrl" : "cmd");
  if (event.shiftKey) keys.push("shift");
  if (event.altKey) keys.push("alt");

  const key = event.key.toLowerCase();
  if (key !== "control" && key !== "meta" && key !== "shift" && key !== "alt") {
    keys.push(key);
  }

  const pressed = keys.join("+");
  return shortcut.some((s) => s === pressed);
}

/**
 * Export canvas to PNG
 */
export async function exportCanvasToPNG(
  canvas: HTMLCanvasElement,
  fileName: string = "whiteboard.png"
): Promise<void> {
  try {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting canvas to PNG:", error);
    throw error;
  }
}

/**
 * Export canvas to SVG
 */
export async function exportCanvasToSVG(
  elements: any[],
  fileName: string = "whiteboard.svg"
): Promise<void> {
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "1280");
    svg.setAttribute("height", "760");
    svg.setAttribute("viewBox", "0 0 1280 760");

    // Add background
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("width", "1280");
    background.setAttribute("height", "760");
    background.setAttribute("fill", "#fffdf8");
    svg.appendChild(background);

    // Add elements
    elements.forEach((element) => {
      if (element.kind === "stroke") {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polyline"
        );
        path.setAttribute(
          "points",
          element.payload.points
            .map((p: any) => `${p.x},${p.y}`)
            .join(" ")
        );
        path.setAttribute("stroke", element.payload.color);
        path.setAttribute("stroke-width", String(element.payload.width));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.appendChild(path);
      } else if (element.kind === "shape") {
        if (element.payload.shape === "rectangle") {
          const rect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
          );
          rect.setAttribute("x", String(element.payload.x));
          rect.setAttribute("y", String(element.payload.y));
          rect.setAttribute("width", String(element.payload.width));
          rect.setAttribute("height", String(element.payload.height));
          rect.setAttribute("stroke", element.payload.color);
          rect.setAttribute("stroke-width", String(element.payload.strokeWidth));
          rect.setAttribute("fill", "none");
          svg.appendChild(rect);
        } else if (element.payload.shape === "ellipse") {
          const ellipse = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "ellipse"
          );
          ellipse.setAttribute(
            "cx",
            String(element.payload.x + element.payload.width / 2)
          );
          ellipse.setAttribute(
            "cy",
            String(element.payload.y + element.payload.height / 2)
          );
          ellipse.setAttribute(
            "rx",
            String(Math.abs(element.payload.width) / 2)
          );
          ellipse.setAttribute(
            "ry",
            String(Math.abs(element.payload.height) / 2)
          );
          ellipse.setAttribute("stroke", element.payload.color);
          ellipse.setAttribute(
            "stroke-width",
            String(element.payload.strokeWidth)
          );
          ellipse.setAttribute("fill", "none");
          svg.appendChild(ellipse);
        } else if (element.payload.shape === "line") {
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
          );
          line.setAttribute("x1", String(element.payload.x));
          line.setAttribute("y1", String(element.payload.y));
          line.setAttribute(
            "x2",
            String(element.payload.x + element.payload.width)
          );
          line.setAttribute(
            "y2",
            String(element.payload.y + element.payload.height)
          );
          line.setAttribute("stroke", element.payload.color);
          line.setAttribute(
            "stroke-width",
            String(element.payload.strokeWidth)
          );
          svg.appendChild(line);
        }
      } else if (element.kind === "text") {
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", String(element.payload.x));
        text.setAttribute("y", String(element.payload.y));
        text.setAttribute("fill", element.payload.color);
        text.setAttribute("font-size", String(element.payload.fontSize));
        text.setAttribute("font-family", "sans-serif");
        text.textContent = element.payload.text;
        svg.appendChild(text);
      }
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error exporting canvas to SVG:", error);
    throw error;
  }
}

/**
 * Import image to canvas
 */
export async function importImage(): Promise<{
  src: string;
  width: number;
  height: number;
} | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            src: event.target.result,
            width: img.width,
            height: img.height,
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

/**
 * Generate thumbnail from canvas
 */
export function generateThumbnail(
  canvas: HTMLCanvasElement,
  maxWidth: number = 200
): string {
  const thumbCanvas = document.createElement("canvas");
  const ratio = canvas.width / canvas.height;
  thumbCanvas.width = maxWidth;
  thumbCanvas.height = maxWidth / ratio;

  const ctx = thumbCanvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }

  return thumbCanvas.toDataURL("image/png", 0.5);
}

/**
 * Create a data URL from canvas with specified quality
 */
export function canvasDataUrl(
  canvas: HTMLCanvasElement,
  quality: number = 0.8
): string {
  return canvas.toDataURL("image/png", quality);
}

/**
 * Format timestamp to readable format
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format date to readable format
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculate distance between two points
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point is inside rectangle
 */
export function pointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
