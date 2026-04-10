import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  disableDate,
  className,
  buttonClassName,
  align = "start",
  formatString = "PPP",
}: {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disableDate?: Matcher | Matcher[];
  className?: string;
  buttonClassName?: string;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  formatString?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-slot="date-picker-trigger"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, formatString) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-slot="date-picker-content"
        align={align}
        className={cn("w-auto p-0", className)}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          disabled={disableDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
