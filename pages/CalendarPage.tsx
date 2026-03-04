import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarEvent, UserAccount } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarPageProps {
  currentUser: UserAccount;
}

const CalendarPage = ({ currentUser }: CalendarPageProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
    type: 'meeting',
    description: ''
  });

  useEffect(() => {
    // Fetch events for current month (simplified query for now)
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

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/30 border border-slate-100 rounded-2xl opacity-50"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.start.startsWith(dateStr));
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      days.push(
        <div key={day} className={`h-32 bg-white border border-slate-100 p-3 rounded-3xl hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
          <span className={`text-xs font-black ${isToday ? 'text-blue-600' : 'text-slate-400'} absolute top-3 right-4`}>{day}</span>
          <div className="mt-6 space-y-1 overflow-y-auto max-h-[80px] pr-1 custom-scrollbar">
            {dayEvents.map(ev => (
              <div key={ev.id} className="text-[9px] font-bold truncate bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100">
                {ev.title}
              </div>
            ))}
          </div>
          <button 
            onClick={() => {
              setNewEvent({...newEvent, start: `${dateStr}T09:00`, end: `${dateStr}T10:00`});
              setIsModalOpen(true);
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-slate-900 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <Plus size={12} />
          </button>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Agenda</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Compromissos e Reuniões</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-sm font-black text-slate-900 uppercase tracking-widest min-w-[140px] text-center">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight size={20} /></button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus size={16} strokeWidth={3} /> Novo Evento
        </button>
      </div>

      <div className="flex-1 bg-white rounded-[40px] shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 gap-4 mb-4 text-center">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {renderCalendarDays()}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Evento</h3>
                  <p className="text-slate-500 text-sm font-medium">Agende um compromisso.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Evento</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Reunião de Diretoria" 
                    className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-600 text-xs"
                      value={newEvent.start}
                      onChange={e => setNewEvent({...newEvent, start: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-600 text-xs"
                      value={newEvent.end}
                      onChange={e => setNewEvent({...newEvent, end: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select 
                    className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-600 text-xs uppercase tracking-widest"
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                  >
                    <option value="meeting">Reunião</option>
                    <option value="task">Tarefa</option>
                    <option value="reminder">Lembrete</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea 
                    placeholder="Detalhes..." 
                    className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 h-32 resize-none"
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Agendar
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
