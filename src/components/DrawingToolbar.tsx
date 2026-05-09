import {
  PenLine,
  Eraser,
  Type,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Image as ImageIcon,
  Save,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WhiteboardTool } from "@/lib/whiteboard";

interface DrawingToolbarProps {
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  onToolChange: (tool: WhiteboardTool) => void;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onDownload?: () => void;
  onImportImage?: () => void;
  onSave?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  colors?: string[];
  sizes?: number[];
}

const COLORS = ["#10204f", "#f2b134", "#1f7a5f", "#d64545", "#111827", "#ec4899"];
const SIZES = [2, 4, 8, 12];

/**
 * Enhanced Drawing Toolbar Component
 * Provides access to all drawing tools and options
 */
export function DrawingToolbar({
  tool,
  color,
  lineWidth,
  onToolChange,
  onColorChange,
  onLineWidthChange,
  onUndo,
  onRedo,
  onClear,
  onDownload,
  onImportImage,
  onSave,
  canUndo = true,
  canRedo = true,
  colors = COLORS,
  sizes = SIZES,
}: DrawingToolbarProps) {
  const tools: { id: WhiteboardTool; label: string; icon: any }[] = [
    { id: "pen", label: "Pen", icon: PenLine },
    { id: "text", label: "Text", icon: Type },
    { id: "rectangle", label: "Rectangle", icon: Square },
    { id: "ellipse", label: "Circle", icon: Circle },
    { id: "line", label: "Line", icon: Minus },
    { id: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-primary/10 rounded-lg shadow-lg">
      {/* Drawing Tools */}
      <div className="grid grid-cols-3 gap-1">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              variant={tool === t.id ? "default" : "outline"}
              size="sm"
              title={t.label}
              className="h-8 w-8 p-0"
              onClick={() => onToolChange(t.id)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      <div className="w-full h-px bg-border" />

      {/* Color Palette */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Color
        </label>
        <div className="grid grid-cols-3 gap-1">
          {colors.map((c) => (
            <button
              key={c}
              className={cn(
                "h-6 w-6 rounded-md border-2 transition-transform hover:scale-110",
                color === c
                  ? "border-primary shadow-lg"
                  : "border-primary/20 hover:border-primary/50"
              )}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Line Width */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Size
        </label>
        <div className="flex gap-1">
          {sizes.map((size) => (
            <Button
              key={size}
              variant={lineWidth === size ? "default" : "outline"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => onLineWidthChange(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-border" />

      {/* Action Buttons */}
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="h-3.5 w-3.5" />
          <span className="text-xs">Undo</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 className="h-3.5 w-3.5" />
          <span className="text-xs">Redo</span>
        </Button>

        <div className="w-full h-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onClear}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs">Clear</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onImportImage}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="text-xs">Import</span>
        </Button>

        <div className="w-full h-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onSave}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="text-xs">Save</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-2"
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Download</span>
        </Button>
      </div>
    </div>
  );
}
