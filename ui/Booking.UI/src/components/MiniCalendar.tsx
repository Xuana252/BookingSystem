import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfDay } from "../lib/dates";

interface MiniCalendarProps {
  value: Date;
  viewMode?: "day" | "week" | "month" | "agenda";
  onChange: (d: Date) => void;
}

export function MiniCalendar({ value, viewMode = "day", onChange }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(value);
    d.setDate(1);
    return startOfDay(d);
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month padding
    const firstDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    for (let i = firstDayOfWeek; i > 0; i--) {
      days.push({
        date: new Date(year, month, 1 - i),
        isCurrentMonth: false
      });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month padding
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonth]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const today = new Date();

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[13px] font-semibold text-foreground">
          {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-0.5">
          <button 
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-[10px] font-semibold text-muted-foreground/70 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((d, i) => {
          const isSelectedDay = isSameDay(d.date, value);
          const isToday = isSameDay(d.date, today);
          
          let isSelectedGroup = false;
          if (viewMode === "week") {
            const weekStart = new Date(value);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (d.date >= weekStart && d.date <= weekEnd) isSelectedGroup = true;
          } else if (viewMode === "month") {
            if (d.date.getMonth() === value.getMonth() && d.date.getFullYear() === value.getFullYear()) {
              isSelectedGroup = true;
            }
          }
          
          return (
            <button
              key={i}
              onClick={() => {
                onChange(d.date);
                setCurrentMonth(new Date(d.date.getFullYear(), d.date.getMonth(), 1));
              }}
              className={`
                h-8 text-xs flex items-center justify-center transition-all duration-150 relative
                ${!d.isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground'}
                ${isSelectedGroup && !isSelectedDay ? 'bg-primary/10 font-medium' : ''}
                ${isSelectedDay ? 'font-bold text-primary-foreground z-10' : ''}
                ${!isSelectedDay && !isSelectedGroup ? 'hover:bg-sidebar-accent hover:text-foreground rounded-md mx-0.5' : ''}
                ${isSelectedDay || isSelectedGroup ? (d.date.getDay() === 0 ? 'rounded-l-md pl-1' : d.date.getDay() === 6 ? 'rounded-r-md pr-1' : '') : ''}
              `}
            >
              {isSelectedDay && (
                <div className="absolute inset-0 m-0.5 rounded-md bg-primary shadow-xs scale-105" />
              )}
              {isToday && !isSelectedDay && (
                <div className="absolute inset-0 m-0.5 rounded-md border border-primary/50" />
              )}
              <span className="relative z-10">{d.date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
