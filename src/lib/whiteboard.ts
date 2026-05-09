export type WhiteboardTool = "pen" | "rectangle" | "ellipse" | "line" | "text" | "eraser";

export type WhiteboardPoint = {
  x: number;
  y: number;
};

export type StrokePayload = {
  points: WhiteboardPoint[];
  color: string;
  width: number;
};

export type ShapePayload = {
  shape: "rectangle" | "ellipse" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
};

export type TextPayload = {
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
};

export type WhiteboardElement =
  | {
      id: string;
      kind: "stroke";
      payload: StrokePayload;
      userId?: string;
      createdAt?: string;
      removedAt?: string | null;
    }
  | {
      id: string;
      kind: "shape";
      payload: ShapePayload;
      userId?: string;
      createdAt?: string;
      removedAt?: string | null;
    }
  | {
      id: string;
      kind: "text";
      payload: TextPayload;
      userId?: string;
      createdAt?: string;
      removedAt?: string | null;
    };

type RawElementRow = {
  id: string;
  kind: "stroke" | "shape" | "text";
  payload: unknown;
  user_id?: string;
  created_at?: string;
  removed_at?: string | null;
};

export const WHITEBOARD_COLORS = ["#10204f", "#f2b134", "#1f7a5f", "#d64545", "#111827"] as const;

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function parseWhiteboardElement(row: RawElementRow): WhiteboardElement | null {
  const payload = row.payload as Record<string, unknown> | null;
  if (!payload) return null;

  if (row.kind === "stroke") {
    const points = Array.isArray(payload.points)
      ? payload.points
          .map((point) => ({
            x: safeNumber((point as Record<string, unknown>)?.x, 0),
            y: safeNumber((point as Record<string, unknown>)?.y, 0),
          }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : [];

    if (points.length < 2) return null;

    return {
      id: row.id,
      kind: "stroke",
      payload: {
        points,
        color: safeText(payload.color, "#10204f"),
        width: safeNumber(payload.width, 3),
      },
      userId: row.user_id,
      createdAt: row.created_at,
      removedAt: row.removed_at,
    };
  }

  if (row.kind === "shape") {
    const shape = safeText(payload.shape, "rectangle");
    if (!["rectangle", "ellipse", "line"].includes(shape)) return null;

    return {
      id: row.id,
      kind: "shape",
      payload: {
        shape: shape as ShapePayload["shape"],
        x: safeNumber(payload.x, 0),
        y: safeNumber(payload.y, 0),
        width: safeNumber(payload.width, 0),
        height: safeNumber(payload.height, 0),
        color: safeText(payload.color, "#10204f"),
        strokeWidth: safeNumber(payload.strokeWidth, 3),
      },
      userId: row.user_id,
      createdAt: row.created_at,
      removedAt: row.removed_at,
    };
  }

  return {
    id: row.id,
    kind: "text",
    payload: {
      text: safeText(payload.text, "Text"),
      x: safeNumber(payload.x, 0),
      y: safeNumber(payload.y, 0),
      color: safeText(payload.color, "#10204f"),
      fontSize: safeNumber(payload.fontSize, 24),
    },
    userId: row.user_id,
    createdAt: row.created_at,
    removedAt: row.removed_at,
  };
}

export function drawWhiteboard(ctx: CanvasRenderingContext2D, elements: WhiteboardElement[], width: number, height: number) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = "rgba(16, 32, 79, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  elements
    .filter((element) => !element.removedAt)
    .forEach((element) => {
      if (element.kind === "stroke") {
        ctx.save();
        ctx.strokeStyle = element.payload.color;
        ctx.lineWidth = element.payload.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        element.payload.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (element.kind === "shape") {
        ctx.save();
        ctx.strokeStyle = element.payload.color;
        ctx.lineWidth = element.payload.strokeWidth;
        const { x, y, width: shapeWidth, height: shapeHeight } = element.payload;
        if (element.payload.shape === "rectangle") {
          ctx.strokeRect(x, y, shapeWidth, shapeHeight);
        } else if (element.payload.shape === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(
            x + shapeWidth / 2,
            y + shapeHeight / 2,
            Math.abs(shapeWidth) / 2,
            Math.abs(shapeHeight) / 2,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + shapeWidth, y + shapeHeight);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.fillStyle = element.payload.color;
      ctx.font = `${element.payload.fontSize}px sans-serif`;
      ctx.fillText(element.payload.text, element.payload.x, element.payload.y);
      ctx.restore();
    });
}

export function elementBounds(element: WhiteboardElement) {
  if (element.kind === "stroke") {
    const xs = element.payload.points.map((point) => point.x);
    const ys = element.payload.points.map((point) => point.y);
    return {
      x: Math.min(...xs) - element.payload.width,
      y: Math.min(...ys) - element.payload.width,
      width: Math.max(...xs) - Math.min(...xs) + element.payload.width * 2,
      height: Math.max(...ys) - Math.min(...ys) + element.payload.width * 2,
    };
  }

  if (element.kind === "shape") {
    return {
      x: Math.min(element.payload.x, element.payload.x + element.payload.width),
      y: Math.min(element.payload.y, element.payload.y + element.payload.height),
      width: Math.abs(element.payload.width),
      height: Math.abs(element.payload.height),
    };
  }

  return {
    x: element.payload.x,
    y: element.payload.y - element.payload.fontSize,
    width: Math.max(60, element.payload.text.length * element.payload.fontSize * 0.55),
    height: element.payload.fontSize * 1.4,
  };
}

export function pointHitsElement(element: WhiteboardElement, point: WhiteboardPoint, padding = 12) {
  const bounds = elementBounds(element);
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

export function canvasDataUrl(elements: WhiteboardElement[], width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  drawWhiteboard(context, elements, width, height);
  return canvas.toDataURL("image/png");
}
