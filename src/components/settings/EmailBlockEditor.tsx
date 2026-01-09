import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Type,
  Image,
  Minus,
  Square,
  Table,
  Trash2,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

export interface EmailBlock {
  id: string;
  type: "heading" | "text" | "button" | "divider" | "spacer" | "image" | "table-row";
  content: string;
  styles: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    textAlign?: "left" | "center" | "right";
    padding?: string;
    borderRadius?: string;
  };
  tableData?: { label: string; value: string }[];
  imageAlt?: string;
}

interface SortableBlockProps {
  block: EmailBlock;
  onUpdate: (id: string, updates: Partial<EmailBlock>) => void;
  onDelete: (id: string) => void;
  variables: string[];
}

function SortableBlock({ block, onUpdate, onDelete, variables }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const insertVariable = (variable: string) => {
    onUpdate(block.id, { content: block.content + variable });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative border border-border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-2">
          {block.type === "heading" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase">Heading</span>
              </div>
              <Input
                value={block.content}
                onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                placeholder="Enter heading text..."
                className="font-semibold"
              />
              <div className="flex gap-2">
                <Select
                  value={block.styles.fontSize || "28px"}
                  onValueChange={(v) => onUpdate(block.id, { styles: { ...block.styles, fontSize: v } })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20px">Small</SelectItem>
                    <SelectItem value="24px">Medium</SelectItem>
                    <SelectItem value="28px">Large</SelectItem>
                    <SelectItem value="32px">XL</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border rounded-md">
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "left" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "left" } })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "center" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "center" } })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "right" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "right" } })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="color"
                  value={block.styles.color || "#D4AF37"}
                  onChange={(e) => onUpdate(block.id, { styles: { ...block.styles, color: e.target.value } })}
                  className="w-12 h-9 p-1 cursor-pointer"
                  title="Text color"
                />
              </div>
            </>
          )}

          {block.type === "text" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase">Text</span>
              </div>
              <Textarea
                value={block.content}
                onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                placeholder="Enter text content..."
                rows={3}
              />
              <div className="flex gap-2">
                <Select
                  value={block.styles.fontSize || "14px"}
                  onValueChange={(v) => onUpdate(block.id, { styles: { ...block.styles, fontSize: v } })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12px">Small</SelectItem>
                    <SelectItem value="14px">Medium</SelectItem>
                    <SelectItem value="16px">Large</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="color"
                  value={block.styles.color || "#888888"}
                  onChange={(e) => onUpdate(block.id, { styles: { ...block.styles, color: e.target.value } })}
                  className="w-12 h-9 p-1 cursor-pointer"
                  title="Text color"
                />
              </div>
            </>
          )}

          {block.type === "button" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Square className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase">Button</span>
              </div>
              <Input
                value={block.content}
                onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                placeholder="Button text..."
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">BG:</Label>
                  <Input
                    type="color"
                    value={block.styles.backgroundColor || "#D4AF37"}
                    onChange={(e) => onUpdate(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })}
                    className="w-10 h-8 p-1 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Text:</Label>
                  <Input
                    type="color"
                    value={block.styles.color || "#000000"}
                    onChange={(e) => onUpdate(block.id, { styles: { ...block.styles, color: e.target.value } })}
                    className="w-10 h-8 p-1 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {block.type === "divider" && (
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase">Divider</span>
              <div className="flex-1 border-t border-dashed" />
            </div>
          )}

          {block.type === "spacer" && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-dashed border-muted-foreground rounded" />
              <span className="text-xs text-muted-foreground uppercase">Spacer</span>
              <Select
                value={block.styles.padding || "20px"}
                onValueChange={(v) => onUpdate(block.id, { styles: { ...block.styles, padding: v } })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10px">Small</SelectItem>
                  <SelectItem value="20px">Medium</SelectItem>
                  <SelectItem value="40px">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {block.type === "image" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase">Image</span>
              </div>
              <Input
                value={block.content}
                onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                placeholder="Image URL or {{variable}} like {{qr_code_url}}"
              />
              <div className="flex gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Width:</Label>
                  <Input
                    value={block.styles.fontSize || "180px"}
                    onChange={(e) => onUpdate(block.id, { styles: { ...block.styles, fontSize: e.target.value } })}
                    placeholder="180px"
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Alt:</Label>
                  <Input
                    value={block.imageAlt || ""}
                    onChange={(e) => onUpdate(block.id, { imageAlt: e.target.value })}
                    placeholder="Alt text"
                    className="w-32"
                  />
                </div>
                <div className="flex border rounded-md">
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "left" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "left" } })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "center" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "center" } })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.styles.textAlign === "right" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onUpdate(block.id, { styles: { ...block.styles, textAlign: "right" } })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {block.content && !block.content.includes("{{") && (
                <div className="mt-2 p-2 bg-muted/50 rounded">
                  <img 
                    src={block.content} 
                    alt={block.imageAlt || "Preview"} 
                    className="max-w-[100px] max-h-[60px] object-contain mx-auto"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </>
          )}

          {block.type === "table-row" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase">Info Row</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={block.tableData?.[0]?.label || ""}
                  onChange={(e) => onUpdate(block.id, { 
                    tableData: [{ label: e.target.value, value: block.tableData?.[0]?.value || "" }] 
                  })}
                  placeholder="Label (e.g., Movie)"
                />
                <Input
                  value={block.tableData?.[0]?.value || ""}
                  onChange={(e) => onUpdate(block.id, { 
                    tableData: [{ label: block.tableData?.[0]?.label || "", value: e.target.value }] 
                  })}
                  placeholder="Value or {{variable}}"
                />
              </div>
            </>
          )}

          {variables.length > 0 && ["heading", "text", "button", "table-row"].includes(block.type) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {variables.slice(0, 4).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  variables: string[];
}

export function EmailBlockEditor({ blocks, onChange, variables }: EmailBlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((b) => b.id === active.id);
        const newIndex = blocks.findIndex((b) => b.id === over.id);
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    },
    [blocks, onChange]
  );

  const addBlock = (type: EmailBlock["type"]) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}`,
      type,
      content: "",
      styles: {
        textAlign: type === "heading" ? "center" : "left",
        color: type === "heading" ? "#D4AF37" : "#888888",
        fontSize: type === "heading" ? "28px" : "14px",
        backgroundColor: type === "button" ? "#D4AF37" : undefined,
      },
      tableData: type === "table-row" ? [{ label: "", value: "" }] : undefined,
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? { ...b, ...updates, styles: { ...b.styles, ...updates.styles } } : b
      )
    );
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Block Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground mr-2">Add block:</span>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("heading")}>
          <Type className="h-4 w-4 mr-1" />
          Heading
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")}>
          <AlignLeft className="h-4 w-4 mr-1" />
          Text
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("button")}>
          <Square className="h-4 w-4 mr-1" />
          Button
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("table-row")}>
          <Table className="h-4 w-4 mr-1" />
          Info Row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")}>
          <Image className="h-4 w-4 mr-1" />
          Image
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("divider")}>
          <Minus className="h-4 w-4 mr-1" />
          Divider
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("spacer")}>
          <Plus className="h-4 w-4 mr-1" />
          Spacer
        </Button>
      </div>

      {/* Sortable Blocks */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
                variables={variables}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            No blocks yet. Click the buttons above to add content blocks.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to convert blocks to HTML
export function blocksToHtml(blocks: EmailBlock[]): string {
  const blockHtmls = blocks.map((block) => {
    const textAlign = block.styles.textAlign || "left";
    const color = block.styles.color || "#888888";
    const fontSize = block.styles.fontSize || "14px";
    const bgColor = block.styles.backgroundColor || "#D4AF37";
    const padding = block.styles.padding || "20px";

    switch (block.type) {
      case "heading":
        return `<h1 style="color: ${color}; margin: 0 0 20px 0; font-size: ${fontSize}; text-align: ${textAlign};">${block.content}</h1>`;
      case "text":
        return `<p style="color: ${color}; font-size: ${fontSize}; line-height: 1.6; margin: 0 0 15px 0;">${block.content}</p>`;
      case "button":
        return `<div style="text-align: center; margin: 20px 0;">
          <a href="#" style="display: inline-block; background-color: ${bgColor}; color: ${color}; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">${block.content}</a>
        </div>`;
      case "divider":
        return `<hr style="border: none; border-top: 1px solid #2a2a2a; margin: 20px 0;">`;
      case "spacer":
        return `<div style="height: ${padding};"></div>`;
      case "image":
        const imgWidth = fontSize || "180px";
        const imgAlt = block.imageAlt || "Image";
        return `<div style="text-align: ${textAlign}; margin: 20px 0;">
          <img src="${block.content}" alt="${imgAlt}" style="width: ${imgWidth}; height: auto; border-radius: 8px; background: white; padding: 10px; display: inline-block;" />
        </div>`;
      case "table-row":
        if (block.tableData?.[0]) {
          return `<tr>
            <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">${block.tableData[0].label}</td>
            <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">${block.tableData[0].value}</td>
          </tr>`;
        }
        return "";
      default:
        return "";
    }
  });

  // Group table rows together
  const hasTableRows = blocks.some((b) => b.type === "table-row");
  let html = "";
  let inTable = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "table-row") {
      if (!inTable) {
        html += `<div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">`;
        inTable = true;
      }
      html += blockHtmls[i];
    } else {
      if (inTable) {
        html += `</table></div>`;
        inTable = false;
      }
      html += blockHtmls[i];
    }
  }
  if (inTable) {
    html += `</table></div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    ${html}
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">
      This is an automated message. Please do not reply directly to this email.
    </p>
  </div>
</body>
</html>`;
}

// Helper function to parse HTML back to blocks (simplified)
export function htmlToBlocks(html: string): EmailBlock[] {
  // This is a simplified parser - for complex templates, we'll return default blocks
  const blocks: EmailBlock[] = [];
  
  // Extract content between the main div
  const contentMatch = html.match(/<div style="max-width: 600px[^>]*>([\s\S]*?)<hr style="border: none/);
  if (!contentMatch) return blocks;
  
  const content = contentMatch[1];
  
  // Parse headings
  const h1Matches = content.matchAll(/<h1[^>]*style="([^"]*)"[^>]*>([^<]*)<\/h1>/g);
  for (const match of h1Matches) {
    const style = match[1];
    const colorMatch = style.match(/color:\s*([^;]+)/);
    const alignMatch = style.match(/text-align:\s*([^;]+)/);
    const sizeMatch = style.match(/font-size:\s*([^;]+)/);
    
    blocks.push({
      id: `block-${Date.now()}-${Math.random()}`,
      type: "heading",
      content: match[2],
      styles: {
        color: colorMatch?.[1]?.trim() || "#D4AF37",
        textAlign: (alignMatch?.[1]?.trim() as "left" | "center" | "right") || "center",
        fontSize: sizeMatch?.[1]?.trim() || "28px",
      },
    });
  }
  
  return blocks;
}
