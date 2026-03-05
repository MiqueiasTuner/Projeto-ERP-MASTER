import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarEvent, UserAccount } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  MoreVertical, 
  Trash2,
  Search,
  HelpCircle,
  Settings,
  Menu,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarPageProps {
  currentUser: UserAccount;
}

const CalendarPage = ({ currentUser }: CalendarPageProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'Mês' | 'Semana' | 'Dia'>('Mês');
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
    type: 'meeting',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'events'), where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      setEvents(eventList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        userId: currentUser.id,
        attendees: [currentUser.id]
      });
      setIsModalOpen(false);
      setNewEvent({ title: '', start: '', end: '', type: 'meeting', description: '' });
    } catch (error) {
      console.error("Error adding event: ", error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Deseja excluir este compromisso?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      console.error("Error deleting event", error);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const renderMiniCalendar = () => {
    const miniDaysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const miniFirstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];
    
    for (let i = 0; i < miniFirstDayOfMonth; i++) {
      days.push(<div key={`mini-empty-${i}`} className="h-6 w-6"></div>);
    }
    
    for (let day = 1; day <= miniDaysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
      
      days.push(
        <button 
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-6 w-6 flex items-center justify-center text-[10px] rounded-full transition-colors ${
            isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const renderCalendarGrid = () => {
    const days = [];
    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="border-r border-b border-slate-700/50 p-2 opacity-30">
          <span className="text-xs text-slate-400">{prevMonthLastDay - i}</span>
        </div>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.start.startsWith(dateStr));
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div 
          key={day} 
          className="border-r border-b border-slate-700/50 min-h-[120px] p-1 flex flex-col group relative"
          onClick={() => {
            setSelectedDate(date);
            const dateStr = date.toISOString().split('T')[0];
            setNewEvent({...newEvent, start: `${dateStr}T09:00`, end: `${dateStr}T10:00`});
          }}
        >
          <div className="flex justify-center mb-1">
            <span className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${
              isToday ? 'bg-blue-600 text-white' : 'text-slate-300'
            }`}>
              {day}
            </span>
          </div>
          
          <div className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
            {dayEvents.map(ev => (
              <div 
                key={ev.id} 
                className={`text-[10px] px-2 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 ${
                  ev.type === 'meeting' ? 'bg-blue-600 text-white' : 
                  ev.type === 'task' ? 'bg-emerald-600 text-white' : 
                  'bg-slate-600 text-white'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEvent(ev.id);
                }}
              >
                {new Date(ev.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {ev.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Next month days to fill the grid (total 42 cells for 6 weeks)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="border-r border-b border-slate-700/50 p-2 opacity-30">
          <span className="text-xs text-slate-400">{i}</span>
        </div>
      );
    }

    return days;
  };

  const inputClass = "w-full bg-slate-800 px-4 py-3 rounded-lg border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white text-sm";

  return (
    <div className="h-full flex flex-col bg-[#1F1F1F] text-slate-300 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1 rounded-lg">
              <CalendarIcon size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-medium text-white">Agenda</h1>
          </div>
          
          <div className="flex items-center gap-2 ml-8">
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-1.5 border border-slate-700 rounded-md text-sm font-medium hover:bg-slate-800 transition-all"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-2 hover:bg-slate-800 rounded-full"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-2 hover:bg-slate-800 rounded-full"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <h2 className="text-lg font-medium text-white ml-2">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-800 rounded-full"><Search size={20} /></button>
          
          <div className="flex items-center gap-1 ml-4 border border-slate-700 rounded-md px-2 py-1.5 hover:bg-slate-800 cursor-pointer">
            <span className="text-sm font-medium">{view}</span>
            <ChevronDown size={14} />
          </div>
          
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold ml-4">
            {currentUser.name.charAt(0)}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-700/50 flex flex-col p-4 shrink-0 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-all mb-8 group"
          >
            <Plus size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Criar</span>
            <ChevronDown size={14} className="ml-auto opacity-50" />
          </button>

          {/* Mini Calendar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm font-medium text-white">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-slate-800 rounded-full"><ChevronLeft size={14} /></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-slate-800 rounded-full"><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[10px] font-bold text-slate-500">{d}</div>
              ))}
              {renderMiniCalendar()}
            </div>
          </div>

          {/* Calendars List */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Minhas agendas</h3>
              <div className="space-y-1">
                {[
                  { name: currentUser.name, color: 'bg-blue-600' },
                  { name: 'Aniversários', color: 'bg-emerald-600' },
                  { name: 'Tarefas', color: 'bg-blue-400' }
                ].map(cal => (
                  <div key={cal.name} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer group">
                    <div className={`w-4 h-4 rounded border border-slate-600 flex items-center justify-center ${cal.color}`}>
                      <Check size={10} className="text-white" />
                    </div>
                    <span className="text-sm text-slate-300">{cal.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Outras agendas</h3>
              <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer">
                <div className="w-4 h-4 rounded border border-slate-600 bg-emerald-600 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
                <span className="text-sm text-slate-300">Feriados no Brasil</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-700/50 shrink-0">
            {['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'].map((d, i) => (
              <div key={i} className="py-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest">{d}</span>
              </div>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 h-full">
              {renderCalendarGrid()}
            </div>
          </div>
        </main>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#2D2E30] rounded-2xl shadow-2xl z-[110] overflow-hidden border border-slate-700"
            >
              <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-medium text-white">Criar evento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="p-6 space-y-6">
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Adicionar título" 
                    className="w-full bg-transparent border-b-2 border-slate-700 focus:border-blue-500 outline-none py-2 text-xl text-white placeholder:text-slate-500 transition-colors"
                    value={newEvent.title} 
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs font-medium text-slate-500">Início</label>
                    <input type="datetime-local" className={inputClass} value={newEvent.start} onChange={e => setNewEvent({...newEvent, start: e.target.value})} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs font-medium text-slate-500">Fim</label>
                    <input type="datetime-local" className={inputClass} value={newEvent.end} onChange={e => setNewEvent({...newEvent, end: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">Tipo</label>
                  <div className="flex gap-2">
                    {['meeting', 'task', 'reminder'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({...newEvent, type: type as any})}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                          newEvent.type === type 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {type === 'meeting' ? 'Evento' : type === 'task' ? 'Tarefa' : 'Lembrete'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea 
                    placeholder="Adicionar descrição" 
                    className={`${inputClass} h-24 resize-none`} 
                    value={newEvent.description} 
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-8 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
