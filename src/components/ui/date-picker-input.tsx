import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const months = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

export function DatePickerInput({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [displayMonth, setDisplayMonth] = useState<Date>(value || new Date());

  // Sync input value with prop value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setDisplayMonth(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    
    // Auto-format as dd/mm/yyyy
    if (val.length >= 2) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    }
    if (val.length >= 5) {
      val = val.slice(0, 5) + "/" + val.slice(5, 9);
    }
    
    setInputValue(val);

    // Parse and validate when complete
    if (val.length === 10) {
      const parsed = parse(val, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setDisplayMonth(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    // Try to parse on blur
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setDisplayMonth(parsed);
      } else {
        // Reset to current value if invalid
        if (value && isValid(value)) {
          setInputValue(format(value, "dd/MM/yyyy"));
        } else {
          setInputValue("");
        }
      }
    } else if (inputValue.length === 0) {
      onChange(undefined);
    } else {
      // Reset to current value if incomplete
      if (value && isValid(value)) {
        setInputValue(format(value, "dd/MM/yyyy"));
      } else {
        setInputValue("");
      }
    }
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    onChange(newDate);
    setOpen(false);
  };

  const goToPreviousMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleMonthChange = (month: string) => {
    const monthIndex = months.indexOf(month);
    if (monthIndex >= 0) {
      setDisplayMonth(prev => new Date(prev.getFullYear(), monthIndex, 1));
    }
  };

  const handleYearChange = (direction: "up" | "down") => {
    setDisplayMonth(prev => new Date(
      prev.getFullYear() + (direction === "up" ? 1 : -1),
      prev.getMonth(),
      1
    ));
  };

  const handleClear = () => {
    setInputValue("");
    onChange(undefined);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(today);
    setDisplayMonth(today);
    setOpen(false);
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Sunday = 0
    const startDayOfWeek = firstDayOfMonth.getDay();
    
    const days: { day: number; isCurrentMonth: boolean; isSelected: boolean; isToday: boolean }[] = [];
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }
    
    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = value && 
        value.getDate() === i && 
        value.getMonth() === month && 
        value.getFullYear() === year;
      const isToday = 
        today.getDate() === i && 
        today.getMonth() === month && 
        today.getFullYear() === year;
      
      days.push({
        day: i,
        isCurrentMonth: true,
        isSelected: !!isSelected,
        isToday,
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weeks: typeof calendarDays[] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 pointer-events-auto">
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-3">
            <Select
              value={months[displayMonth.getMonth()]}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{displayMonth.getFullYear()}</span>
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => handleYearChange("up")}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => handleYearChange("down")}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
                  <th key={i} className="text-muted-foreground font-normal text-xs text-center p-1.5 w-8">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((day, dayIndex) => (
                    <td key={dayIndex} className="p-0.5 text-center">
                      <button
                        type="button"
                        disabled={!day.isCurrentMonth}
                        onClick={() => day.isCurrentMonth && handleDayClick(day.day)}
                        className={cn(
                          "w-8 h-8 text-sm rounded-md transition-colors",
                          !day.isCurrentMonth && "text-muted-foreground/40",
                          day.isCurrentMonth && "hover:bg-accent",
                          day.isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                          day.isToday && !day.isSelected && "bg-accent text-accent-foreground"
                        )}
                      >
                        {day.day}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={handleClear}
            >
              Limpar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={handleToday}
            >
              Hoje
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// String value version for forms that use string dates (YYYY-MM-DD format)
interface DatePickerInputStringProps {
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerInputString({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
}: DatePickerInputStringProps) {
  const parseStringToDate = (dateString: string | undefined): Date | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString + "T00:00:00");
    return isValid(date) ? date : undefined;
  };

  const formatDateToString = (date: Date | undefined): string | undefined => {
    if (!date || !isValid(date)) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <DatePickerInput
      value={parseStringToDate(value)}
      onChange={(date) => onChange(formatDateToString(date))}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
