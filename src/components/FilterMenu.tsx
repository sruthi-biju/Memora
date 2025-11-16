import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MoreVertical, Search, X } from "lucide-react";

interface FilterMenuProps {
  onSearchChange: (value: string) => void;
  onFilterChange?: (filterType: string, value: string) => void;
  searchValue: string;
  filters?: Array<{
    label: string;
    type: string;
    options: Array<{ label: string; value: string }>;
  }>;
}

export function FilterMenu({ onSearchChange, onFilterChange, searchValue, filters }: FilterMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Search & Filter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => onSearchChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {filters && filters.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Filters</DropdownMenuLabel>
            {filters.map((filter) => (
              <div key={filter.type} className="p-2">
                <p className="text-xs font-medium mb-2 px-2">{filter.label}</p>
                {filter.options.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onFilterChange?.(filter.type, option.value)}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
