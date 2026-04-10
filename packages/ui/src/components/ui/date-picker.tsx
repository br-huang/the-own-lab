import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { Matcher } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps {
  /** Controlled selected date. */
  value?: Date;
  /** Called when the user picks a new date. */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder shown before a date is selected. */
  placeholder?: string;
  /** Disables the trigger button. */
  disabled?: boolean;
  /** Matcher or list of matchers used to disable calendar dates. */
  disableDate?: Matcher | Matcher[];
  /** Extra classes for the popover content wrapper. */
  className?: string;
  /** Extra classes for the trigger button. */
  buttonClassName?: string;
  /** Horizontal alignment for the popover content. */
  align?: React.ComponentProps<typeof PopoverContent>['align'];
  /** `date-fns` format string used to display the selected date. */
  formatString?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  disableDate,
  className,
  buttonClassName,
  align = 'start',
  formatString = 'PPP',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-slot="date-picker-trigger"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            buttonClassName,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, formatString) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-slot="date-picker-content"
        align={align}
        className={cn('w-auto p-0', className)}
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
