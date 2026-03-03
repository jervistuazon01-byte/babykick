import { useState, useEffect } from 'react';
import {
  format, addDays, subDays, addMonths, subMonths, addMinutes,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, parse, set, startOfWeek, endOfWeek
} from 'date-fns';
import { Baby, Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MovementEntry = { count: number; note?: string };
type MovementData = Record<string, MovementEntry>;

const STORAGE_KEY = 'baby_movements_v2';
const LEGACY_STORAGE_KEY = 'baby_movements_v1';
const INTERVAL_MINUTES = 15;
const INTERVALS_PER_DAY = Math.floor((24 * 60) / INTERVAL_MINUTES);

const roundDownToInterval = (date: Date) => {
  const roundedMinutes = Math.floor(date.getMinutes() / INTERVAL_MINUTES) * INTERVAL_MINUTES;
  return set(date, { minutes: roundedMinutes, seconds: 0, milliseconds: 0 });
};

const dayKeyFromDate = (date: Date) => format(date, 'yyyy-MM-dd');

const getDayTotalForDate = (movementData: MovementData, date: Date) => {
  const dayKey = dayKeyFromDate(date);
  return Object.entries(movementData).reduce((sum, [key, entry]) => {
    const isExactDayMatch = key === dayKey;
    const isDateTimeMatch = key.startsWith(`${dayKey} `);
    return (isExactDayMatch || isDateTimeMatch) ? sum + (entry.count || 0) : sum;
  }, 0);
};

export default function App() {
  const [movements, setMovements] = useState<MovementData>({});
  const [view, setView] = useState<'day' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setMovements(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved movements v2', e);
      }
    } else if (legacySaved) {
      try {
        const parsedLegacy = JSON.parse(legacySaved);
        const migrated: MovementData = {};
        for (const [key, val] of Object.entries(parsedLegacy)) {
          if (typeof val === 'number') {
            migrated[key] = { count: val };
          }
        }
        setMovements(migrated);
      } catch (e) {
        console.error('Failed to migrate legacy movements', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
    }
  }, [movements, isLoaded]);

  const updateMovement = (key: string, delta: number) => {
    setMovements(prev => {
      const currentEntry = prev[key] || { count: 0 };
      const validCount = typeof currentEntry.count === 'number' && !isNaN(currentEntry.count) ? currentEntry.count : 0;
      const nextCount = validCount + delta;

      const updated = { ...prev };
      if (nextCount <= 0 && !currentEntry.note) {
        delete updated[key];
      } else {
        updated[key] = { ...currentEntry, count: Math.max(0, nextCount) };
      }
      return updated;
    });
  };

  const updateNote = (key: string, note: string) => {
    setMovements(prev => {
      const currentEntry = prev[key] || { count: 0 };
      const validCount = typeof currentEntry.count === 'number' && !isNaN(currentEntry.count) ? currentEntry.count : 0;
      const trimmedNote = note.trim();

      const updated = { ...prev };
      if (validCount <= 0 && !trimmedNote) {
        delete updated[key];
      } else {
        const nextEntry = { ...currentEntry, count: validCount };
        if (trimmedNote) {
          nextEntry.note = trimmedNote;
        } else {
          delete nextEntry.note;
        }
        updated[key] = nextEntry;
      }
      return updated;
    });
  };

  const handleQuickAdd = () => {
    const now = new Date();
    const roundedDate = roundDownToInterval(now);
    const key = format(roundedDate, 'yyyy-MM-dd HH:mm');
    updateMovement(key, 1);

    // Jump to today if not already
    if (!isSameDay(currentDate, now) || view !== 'day') {
      setCurrentDate(now);
      setView('day');
    }
  };

  const dayTotal = getDayTotalForDate(movements, currentDate);

  return (
    <div className="h-[100dvh] sm:max-w-md sm:mx-auto bg-gradient-to-br from-rose-50 via-white to-rose-100 relative shadow-2xl overflow-hidden flex flex-col font-sans selection:bg-rose-200">
      <header className="glassmorphism rounded-b-[2rem] border-b border-rose-100/50 p-6 z-10 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-rose-400 flex items-center gap-2 drop-shadow-sm tracking-tight">
            <Baby strokeWidth={2.5} className="w-8 h-8 text-rose-500" />
            <span>Baby Kicks</span>
          </h1>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/80 text-rose-500 rounded-2xl shadow-sm border border-rose-100 hover:bg-white hover:scale-105 transition-all"
            aria-label="Add custom log"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex bg-rose-50 p-1.5 rounded-2xl mb-6 shadow-inner">
          <button
            onClick={() => setView('day')}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              view === 'day' ? "bg-white text-rose-500 shadow-sm" : "text-rose-300 hover:text-rose-400"
            )}
          >
            <Clock className="w-4 h-4" /> Day
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              view === 'month' ? "bg-white text-rose-500 shadow-sm" : "text-rose-300 hover:text-rose-400"
            )}
          >
            <CalendarIcon className="w-4 h-4" /> Month
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(view === 'day' ? subDays(currentDate, 1) : subMonths(currentDate, 1))}
            className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-lg font-bold text-slate-700 select-none">
            {view === 'day' ? format(currentDate, 'MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={() => setCurrentDate(view === 'day' ? addDays(currentDate, 1) : addMonths(currentDate, 1))}
            className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {view === 'day' ? (
          <DayView currentDate={currentDate} movements={movements} updateMovement={updateMovement} updateNote={updateNote} />
        ) : (
          <MonthView
            currentDate={currentDate}
            movements={movements}
            onDayClick={(day) => {
              setCurrentDate(day);
              setView('day');
            }}
          />
        )}
      </main>

      <QuickAddButton onAdd={handleQuickAdd} dayTotal={view === 'day' ? dayTotal : undefined} />

      <CustomAddModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAdd={(key, count) => {
          updateMovement(key, count);
          const d = parse(key, 'yyyy-MM-dd HH:mm', new Date());
          setCurrentDate(d);
          setView('day');
        }}
      />
    </div>
  );
}

// --- Components ---

function DayView({
  currentDate,
  movements,
  updateMovement,
  updateNote
}: {
  currentDate: Date,
  movements: MovementData,
  updateMovement: (k: string, d: number) => void,
  updateNote: (k: string, note: string) => void
}) {
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const currentDayTotal = getDayTotalForDate(movements, currentDate);

  const intervals = Array.from({ length: INTERVALS_PER_DAY }).map((_, i) => {
    const hours = Math.floor((i * INTERVAL_MINUTES) / 60);
    const minutes = (i * INTERVAL_MINUTES) % 60;
    return set(currentDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  });

  const isToday = isSameDay(currentDate, new Date());

  // Auto-scroll to current time if viewing today
  useEffect(() => {
    if (isToday) {
      const now = new Date();
      const roundedDate = roundDownToInterval(now);
      const currentKey = format(roundedDate, 'yyyy-MM-dd HH:mm');

      // Delay slightly to ensure render is complete
      setTimeout(() => {
        const el = document.getElementById(`interval-${currentKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [currentDate, isToday]);

  return (
    <div className="flex flex-col gap-3 pb-32">
      {intervals.map(date => {
        const key = format(date, 'yyyy-MM-dd HH:mm');
        const entry = movements[key] || { count: 0 };
        const { count, note } = entry;

        // Highlight current time block
        const now = new Date();
        const isCurrentBlock = isToday &&
          now.getTime() >= date.getTime() &&
          now.getTime() < addMinutes(date, INTERVAL_MINUTES).getTime();

        const isEditing = editingNoteKey === key;

        return (
          <div
            key={key}
            id={`interval-${key}`}
            className={cn(
              "flex items-center justify-between py-3.5 px-3 rounded-[1.5rem] shadow-sm border transition-all duration-300",
              isCurrentBlock ? "bg-rose-100 border-rose-300" : "bg-white border-rose-100 hover:border-rose-200"
            )}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-1">
              <div className="flex flex-col items-end w-[3.25rem] shrink-0">
                <span className={cn(
                  "font-bold text-[1.05rem] leading-tight",
                  isCurrentBlock ? "text-rose-600" : "text-slate-600"
                )}>
                  {format(date, 'h:mm')}
                </span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  {format(date, 'a')}
                </span>
              </div>

              <div className="w-px h-8 bg-rose-100 shrink-0"></div>

              <div
                className="flex-1 min-w-0 flex items-center h-full rounded-xl cursor-text py-1 px-1.5 -ml-1 hover:bg-rose-50/50 transition-colors"
                onClick={() => setEditingNoteKey(key)}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    rows={2}
                    maxLength={50}
                    defaultValue={note || ''}
                    placeholder="Add a note..."
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-rose-200 resize-none overflow-hidden leading-tight pt-0.5"
                    style={{ minHeight: '2.4rem', maxHeight: '2.4rem' }}
                    onBlur={(e) => {
                      updateNote(key, e.target.value);
                      setEditingNoteKey(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const lines = e.currentTarget.value.split('\n').length;
                        if (lines >= 2 || !e.shiftKey) {
                          e.preventDefault();
                          if (!e.shiftKey) e.currentTarget.blur();
                        }
                      }
                    }}
                    onChange={(e) => {
                      const lines = e.currentTarget.value.split('\n');
                      if (lines.length > 2) {
                        e.currentTarget.value = lines.slice(0, 2).join('\n');
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col justify-center min-w-0 w-full">
                    {count > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center mb-0.5">
                        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full bg-rose-400 shadow-sm animate-in zoom-in duration-300 shrink-0"
                          />
                        ))}
                        {count > 5 && (
                          <span className="text-sm text-rose-500 font-extrabold ml-1 shrink-0">
                            +{count - 5}
                          </span>
                        )}
                      </div>
                    )}
                    {note ? (
                      <div className="text-sm text-slate-600 font-medium line-clamp-2 leading-tight break-words whitespace-pre-wrap">{note}</div>
                    ) : count === 0 ? (
                      <span className="text-sm text-rose-200 font-medium italic truncate">Add note...</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-rose-50/80 rounded-full p-1 border border-rose-100/80 shadow-inner">
              <button
                onClick={() => updateMovement(key, -1)}
                disabled={count === 0}
                className="w-11 h-11 flex items-center justify-center rounded-full text-rose-500 disabled:opacity-30 disabled:bg-transparent bg-white shadow-sm hover:bg-rose-100 transition-colors active:scale-95 touch-manipulation"
                aria-label="Decrease kicks"
              >
                <div className="w-3.5 h-0.5 bg-current rounded-full" />
              </button>
              <div className="w-6 text-center font-bold text-slate-700 select-none text-lg">
                <span key={count} className="inline-block animate-in slide-in-from-bottom-2 fade-in duration-200">
                  {isNaN(count) ? 0 : count}
                </span>
              </div>
              <button
                onClick={() => updateMovement(key, 1)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-rose-400 text-white shadow-sm hover:bg-rose-500 transition-colors active:scale-95 touch-manipulation"
                aria-label="Increase kicks"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Empty State Illustration for 0 kick days */}
      {currentDayTotal === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Baby className="w-12 h-12 text-rose-400 opacity-80" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Kicks Logged Yet</h3>
          <p className="text-slate-500 text-sm max-w-[200px]">Tap the button below to start tracking your baby's movements today!</p>
        </div>
      )}
    </div>
  );
}

function MonthView({
  currentDate,
  movements,
  onDayClick
}: {
  currentDate: Date,
  movements: MovementData,
  onDayClick: (d: Date) => void
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="glassmorphism rounded-[2rem] p-5">
      <div className="grid grid-cols-7 gap-1 mb-3">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs font-black text-slate-400 py-2 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayTotal = getDayTotalForDate(movements, day);

          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          let heatMapColor = "hover:bg-rose-50 bg-transparent";
          if (dayTotal > 0 && dayTotal <= 5) heatMapColor = "bg-rose-100 hover:bg-rose-200";
          else if (dayTotal > 5 && dayTotal <= 10) heatMapColor = "bg-rose-300 hover:bg-rose-400 text-rose-900";
          else if (dayTotal > 10) heatMapColor = "bg-rose-500 hover:bg-rose-600 text-white shadow-md";

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-2xl p-1 relative transition-all border border-transparent",
                !isCurrentMonth && "opacity-30",
                isToday ? "ring-2 ring-rose-400 ring-offset-2 z-10" : "",
                heatMapColor
              )}
            >
              <span className={cn(
                "text-[15px] font-bold leading-none",
                isToday && dayTotal === 0 ? "text-rose-700" : (dayTotal > 10 ? "text-white" : "text-slate-600"),
                dayTotal > 0 ? "mb-1 mt-0.5" : ""
              )}>
                {format(day, 'd')}
              </span>
              {dayTotal > 0 && (
                <span className={cn(
                  "text-[10px] leading-none font-extrabold px-1.5 py-0.5 rounded-full backdrop-blur-sm",
                  dayTotal > 10 ? "bg-white/30 text-white" : "bg-white/70 text-rose-600 shadow-sm"
                )}>
                  {dayTotal}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
}

function QuickAddButton({ onAdd, dayTotal }: { onAdd: () => void, dayTotal?: number }) {
  const [particles, setParticles] = useState<{ id: number }[]>([]);

  const handleClick = () => {
    onAdd();

    // Spawn particle
    const id = Date.now();
    setParticles(prev => [...prev, { id }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center justify-center">
      <button
        onClick={handleClick}
        className={cn(
          "text-white pl-5 pr-6 py-4 rounded-full shadow-[0_8px_30px_rgb(225,29,72,0.3)] flex items-center justify-center font-bold transition-all duration-300 touch-manipulation z-10 bg-gradient-to-tr from-rose-500 to-rose-400 hover:scale-105 active:scale-95 hover:shadow-[0_8px_30px_rgb(225,29,72,0.5)]"
        )}
      >
        <div className="flex items-center gap-3">
          <Baby className="w-8 h-8 shrink-0" />
          {dayTotal !== undefined && dayTotal > 0 && (
            <div className="text-xl font-extrabold text-white border-l-2 border-white/30 pl-3 leading-none drop-shadow-sm min-w-[1.5rem] text-center">
              <span key={dayTotal} className="block w-full animate-in slide-in-from-bottom-2 duration-300">{dayTotal}</span>
            </div>
          )}
        </div>
      </button>

      {/* Floating Particles layered ON TOP of the button */}
      {particles.map(p => (
        <div key={p.id} className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="text-white animate-float-up opacity-0 -mt-8">
            <Baby className="w-8 h-8 fill-white drop-shadow-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomAddModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean,
  onClose: () => void,
  onAdd: (key: string, count: number) => void
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [count, setCount] = useState(1);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(format(new Date(), 'HH:mm'));
      setCount(1);

      // Prevent body scroll when modal open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] w-full sm:max-w-md sm:mx-auto p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-bottom duration-300 ease-out max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />

        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <History className="w-6 h-6 text-rose-500" /> Add Past Kicks
        </h2>

        <div className="space-y-5 flex-1 p-1">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Number of Kicks</label>
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm">
              <button
                onClick={() => setCount(Math.max(1, count - 1))}
                className="w-14 h-14 rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 font-bold text-2xl hover:bg-rose-50 transition-colors active:scale-95 touch-manipulation"
              >
                -
              </button>
              <div className="flex-1 text-center font-black text-3xl text-slate-700">
                {count}
              </div>
              <button
                onClick={() => setCount(count + 1)}
                className="w-14 h-14 rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 font-bold text-2xl hover:bg-rose-50 transition-colors active:scale-95 touch-manipulation"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8 pb-8 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95 touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const d = new Date(`${date}T${time}`);
              if (!isNaN(d.getTime())) {
                const roundedDate = roundDownToInterval(d);
                onAdd(format(roundedDate, 'yyyy-MM-dd HH:mm'), count);
                onClose();
              }
            }}
            className="flex-1 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 to-rose-400 hover:opacity-90 shadow-lg shadow-rose-200 transition-all active:scale-95 touch-manipulation"
          >
            Save Log
          </button>
        </div>
      </div>
    </div>
  )
}
