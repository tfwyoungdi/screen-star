import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { InventoryHistory } from './InventoryHistory';

interface DraggableConcessionRowProps {
  item: any;
  getCategoryIcon: (category: string) => any;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (item: any) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  showSelection?: boolean;
}

export function DraggableConcessionRow({
  item,
  getCategoryIcon,
  onEdit,
  onDelete,
  onToggleAvailability,
  isSelected = false,
  onSelectionChange,
  showSelection = false,
}: DraggableConcessionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const CategoryIcon = getCategoryIcon(item.category);
  const isLowStock = item.track_inventory && item.stock_quantity !== null && item.stock_quantity <= item.low_stock_threshold;
  const isOutOfStock = item.track_inventory && item.stock_quantity !== null && item.stock_quantity === 0;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isOutOfStock ? 'opacity-60' : ''}
    >
      {showSelection && (
        <TableCell className="w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange?.(item.id, !!checked)}
          />
        </TableCell>
      )}
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <CategoryIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <span className="font-medium">{item.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] truncate">
        {item.description || '-'}
      </TableCell>
      <TableCell>
        <Badge variant="outline">${(item.price ?? 0).toFixed(2)}</Badge>
      </TableCell>
      <TableCell>
        {item.track_inventory ? (
          <div className="flex items-center gap-2">
            {isOutOfStock ? (
              <Badge variant="destructive">Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low: {item.stock_quantity}
              </Badge>
            ) : (
              <Badge variant="outline">{item.stock_quantity} in stock</Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not tracked</span>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={item.is_available}
          onCheckedChange={() => onToggleAvailability(item)}
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {item.track_inventory && (
            <InventoryHistory itemId={item.id} itemName={item.name} />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
