import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MessageSquare, ClipboardList } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths, isToday
} from 'date-fns';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'task' | 'enquiry';
  status: string;
}

const typeColors: Record<string, string> = {
  task: 'bg-blue-500',
  enquiry: 'bg-purple-500',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: enquiries = [] } = useQuery<any[]>({
    queryKey: ['enquiries'],
    queryFn: () => api.get('/enquiries').then((r) => r.data),
  });

  const events: CalendarEvent[] = [
    ...tasks
      .filter((t) => t.dueDate)
      .map((t) => ({ id: t.id, title: t.title, date: t.dueDate, type: 'task' as const, status: t.status })),
    ...enquiries
      .filter((e) => e.followUpDate)
      .map((e) => ({ id: e.id, title: e.subject || e.name, date: e.followUpDate, type: 'enquiry' as const, status: e.status })),
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  const selectedEvents = selected ? getEventsForDay(selected) : [];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 text-sm">Task due dates and enquiry follow-ups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="card lg:col-span-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);
              const isSelected = selected && isSameDay(day, selected);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelected(isSameDay(day, selected || new Date('')) ? null : day)}
                  className={`min-h-[72px] p-1.5 rounded-lg cursor-pointer border transition-colors ${
                    isSelected ? 'border-blue-400 bg-blue-50' :
                    isTodayDay ? 'border-blue-200 bg-blue-50' :
                    'border-transparent hover:bg-gray-50'
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span className={`text-xs font-medium ${
                    isTodayDay ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center' :
                    'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={`${ev.type}-${ev.id}`} className={`text-[10px] text-white rounded px-1 truncate ${typeColors[ev.type]}`}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-sm text-gray-600 flex items-center gap-1"><ClipboardList size={12} /> Task Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-sm text-gray-600 flex items-center gap-1"><MessageSquare size={12} /> Enquiry Follow-up</span>
              </div>
            </div>
          </div>

          {/* Selected day events */}
          {selected && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CalendarIcon size={14} /> {format(selected, 'dd MMM yyyy')}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => (
                    <div key={`${ev.type}-${ev.id}`} className={`rounded-lg p-2 ${ev.type === 'task' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {ev.type === 'task' ? (
                          <ClipboardList size={12} className="text-blue-600" />
                        ) : (
                          <MessageSquare size={12} className="text-purple-600" />
                        )}
                        <span className={`text-xs font-medium ${ev.type === 'task' ? 'text-blue-700' : 'text-purple-700'}`}>
                          {ev.type === 'task' ? 'Task' : 'Enquiry'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{ev.title}</p>
                      <span className={`text-xs badge mt-1 ${
                        ev.status === 'completed' || ev.status === 'converted' ? 'bg-green-100 text-green-700' :
                        ev.status === 'pending' || ev.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      } capitalize`}>
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={14} /> Upcoming (7 days)
            </h3>
            <div className="space-y-2">
              {events
                .filter((e) => {
                  const d = new Date(e.date);
                  const now = new Date();
                  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 7;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 8)
                .map((ev) => (
                  <div key={`${ev.type}-${ev.id}`} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[ev.type]}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">{format(new Date(ev.date), 'dd MMM')}</p>
                    </div>
                  </div>
                ))}
              {events.filter((e) => {
                const d = new Date(e.date);
                const now = new Date();
                const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 7;
              }).length === 0 && (
                <p className="text-sm text-gray-400">Nothing in the next 7 days</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
