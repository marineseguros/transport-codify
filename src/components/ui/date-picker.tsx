import * as React from "react"
import { useState, useEffect } from "react"
import { CalendarIcon, ChevronUp, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerWithRangeProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

const months = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = useState(false)
  const [fromInput, setFromInput] = useState("")
  const [toInput, setToInput] = useState("")
  const [displayMonth, setDisplayMonth] = useState<Date>(date?.from || new Date())
  const [selectingFrom, setSelectingFrom] = useState(true)

  // Sync input values with prop values
  useEffect(() => {
    if (date?.from && isValid(date.from)) {
      setFromInput(format(date.from, "dd/MM/yyyy"))
      setDisplayMonth(date.from)
    } else {
      setFromInput("")
    }
    if (date?.to && isValid(date.to)) {
      setToInput(format(date.to, "dd/MM/yyyy"))
    } else {
      setToInput("")
    }
  }, [date])

  const handleInputChange = (value: string, type: "from" | "to") => {
    let val = value.replace(/\D/g, "")
    
    // Auto-format as dd/mm/yyyy
    if (val.length >= 2) {
      val = val.slice(0, 2) + "/" + val.slice(2)
    }
    if (val.length >= 5) {
      val = val.slice(0, 5) + "/" + val.slice(5, 9)
    }
    
    if (type === "from") {
      setFromInput(val)
    } else {
      setToInput(val)
    }

    // Parse and validate when complete
    if (val.length === 10) {
      const parsed = parse(val, "dd/MM/yyyy", new Date())
      if (isValid(parsed)) {
        if (type === "from") {
          onDateChange({ from: parsed, to: date?.to })
          setDisplayMonth(parsed)
        } else {
          onDateChange({ from: date?.from, to: parsed })
        }
      }
    }
  }

  const handleInputBlur = (type: "from" | "to") => {
    const inputValue = type === "from" ? fromInput : toInput
    
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date())
      if (isValid(parsed)) {
        if (type === "from") {
          onDateChange({ from: parsed, to: date?.to })
          setDisplayMonth(parsed)
        } else {
          onDateChange({ from: date?.from, to: parsed })
        }
      } else {
        // Reset to current value if invalid
        if (type === "from" && date?.from && isValid(date.from)) {
          setFromInput(format(date.from, "dd/MM/yyyy"))
        } else if (type === "to" && date?.to && isValid(date.to)) {
          setToInput(format(date.to, "dd/MM/yyyy"))
        }
      }
    } else if (inputValue.length === 0) {
      if (type === "from") {
        onDateChange({ from: undefined, to: date?.to })
      } else {
        onDateChange({ from: date?.from, to: undefined })
      }
    }
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
    
    if (selectingFrom) {
      onDateChange({ from: newDate, to: undefined })
      setSelectingFrom(false)
    } else {
      // Ensure 'to' is after 'from'
      if (date?.from && newDate < date.from) {
        onDateChange({ from: newDate, to: date.from })
      } else {
        onDateChange({ from: date?.from, to: newDate })
      }
      setSelectingFrom(true)
      setOpen(false)
    }
  }

  const handleMonthChange = (month: string) => {
    const monthIndex = months.indexOf(month)
    if (monthIndex >= 0) {
      setDisplayMonth(prev => new Date(prev.getFullYear(), monthIndex, 1))
    }
  }

  const handleYearChange = (direction: "up" | "down") => {
    setDisplayMonth(prev => new Date(
      prev.getFullYear() + (direction === "up" ? 1 : -1),
      prev.getMonth(),
      1
    ))
  }

  const handleClear = () => {
    setFromInput("")
    setToInput("")
    onDateChange(undefined)
    setSelectingFrom(true)
  }

  const handleToday = () => {
    const today = new Date()
    onDateChange({ from: today, to: today })
    setDisplayMonth(today)
    setOpen(false)
  }

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const daysInMonth = lastDayOfMonth.getDate()
    
    const startDayOfWeek = firstDayOfMonth.getDay()
    
    const days: { 
      day: number
      isCurrentMonth: boolean
      isSelected: boolean
      isInRange: boolean
      isRangeStart: boolean
      isRangeEnd: boolean
      isToday: boolean 
    }[] = []
    
    // Previous month days
    const prevMonth = new Date(year, month, 0)
    const daysInPrevMonth = prevMonth.getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isSelected: false,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
        isToday: false,
      })
    }
    
    // Current month days
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i)
      const isRangeStart = date?.from && 
        date.from.getDate() === i && 
        date.from.getMonth() === month && 
        date.from.getFullYear() === year
      const isRangeEnd = date?.to && 
        date.to.getDate() === i && 
        date.to.getMonth() === month && 
        date.to.getFullYear() === year
      const isInRange = date?.from && date?.to && 
        currentDate >= date.from && currentDate <= date.to
      const isToday = 
        today.getDate() === i && 
        today.getMonth() === month && 
        today.getFullYear() === year
      
      days.push({
        day: i,
        isCurrentMonth: true,
        isSelected: !!isRangeStart || !!isRangeEnd,
        isInRange: !!isInRange,
        isRangeStart: !!isRangeStart,
        isRangeEnd: !!isRangeEnd,
        isToday,
      })
    }
    
    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isSelected: false,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
        isToday: false,
      })
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()
  const weeks: typeof calendarDays[] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const selectedCount = (date?.from ? 1 : 0) + (date?.to ? 1 : 0)

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={fromInput}
                onChange={(e) => handleInputChange(e.target.value, "from")}
                onBlur={() => handleInputBlur("from")}
                placeholder="dd/mm/aaaa"
                className="pr-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectingFrom(true)
                  setOpen(true)
                }}
              />
              <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <Input
                value={toInput}
                onChange={(e) => handleInputChange(e.target.value, "to")}
                onBlur={() => handleInputBlur("to")}
                placeholder="dd/mm/aaaa"
                className="pr-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectingFrom(false)
                  setOpen(true)
                }}
              />
              <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
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
                            day.isInRange && !day.isSelected && "bg-accent",
                            day.isToday && !day.isSelected && "ring-1 ring-primary"
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
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={handleClear}
              >
                Limpar
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedCount} de 2 selecionadas
              </span>
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
    </div>
  )
}
