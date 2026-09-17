import { Skeleton } from "@/components/ui/skeleton";

interface TableRowSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableRowSkeleton({ rows = 5, columns = 4 }: TableRowSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 p-4 border border-border/50 rounded-lg">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`h-4 animate-pulse bg-primary/10 rounded ${colIndex === 0 ? 'w-24' : colIndex === columns - 1 ? 'w-16' : 'flex-1'}`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}
