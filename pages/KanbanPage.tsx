import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, arrayUnion 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Task, TaskStatus, TaskPriority, UserAccount, UserRole, Team, Property, TaskComment 
} from '../types';
import { 
  Plus, MoreHorizontal, Calendar, User, Tag, CheckCircle2, Clock, AlertCircle, X, 
  MessageSquare, Building2, Users, Paperclip, Send, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanPageProps {
  currentUser: UserAccount;
  users?: UserAccount[];
  teams?: Team[];
  properties?: Property[];
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const TaskCard = ({ task, isOverlay, onClick, style, attributes, listeners, setNodeRef }: { 
  task: Task, 
  isOverlay?: boolean, 
  onClick?: () => void,
  style?: any,
  attributes?: any,
  listeners?: any,
  setNodeRef?: (node: HTMLElement | null) => void
}) => {
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return 'bg-rose-50 text-rose-600 border-rose-100';
      case TaskPriority.HIGH: return 'bg-orange-50 text-orange-600 border-orange-100';
      case TaskPriority.MEDIUM: return 'bg-blue-50 text-blue-600 border-blue-100';
      case TaskPriority.LOW: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white p-5 rounded-[20px] border group cursor-pointer relative ${
        isOverlay 
          ? 'shadow-2xl border-blue-500/50 rotate-3 cursor-grabbing opacity-90 scale-105' 
          : 'shadow-sm border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        {task.departmentId && (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
            {task.departmentId}
          </span>
        )}
      </div>
      
      <h4 className="text-sm font-bold text-slate-900 mb-2 leading-relaxed line-clamp-2">{task.title}</h4>
      
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-50">
        <div className="flex -space-x-2">
          {(task.assigneeIds && task.assigneeIds.length > 0) ? (
             task.assigneeIds.slice(0, 3).map((uid, idx) => (
               <div key={idx} className="w-7 h-7 rounded-full bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center text-[9px] font-black text-slate-600 uppercase">
                 {uid.substring(0, 2)}
               </div>
             ))
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-slate-300">
              <User size={12} />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {task.commentsList && task.commentsList.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
              <MessageSquare size={14} /> 
              <span>{task.commentsList.length}</span>
            </div>
          )}
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
              new Date(task.dueDate) < new Date() ? 'text-rose-500' : 'text-slate-400'
            }`}>
              <Clock size={14} />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SortableTaskItem: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white p-5 rounded-[20px] shadow-none border-2 border-blue-500/20 opacity-40 h-[180px]"
      />
    );
  }

  return (
    <TaskCard 
      task={task} 
      onClick={onClick} 
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  );
};

const KanbanColumn: React.FC<{ status: TaskStatus, tasks: Task[], onTaskClick: (task: Task) => void }> = ({ status, tasks, onTaskClick }) => {
  const { setNodeRef } = useDroppable({ id: status });

  const getColumnColor = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.TODO: return 'border-t-slate-400';
      case TaskStatus.IN_PROGRESS: return 'border-t-blue-500';
      case TaskStatus.REVIEW: return 'border-t-amber-500';
      case TaskStatus.DONE: return 'border-t-emerald-500';
      default: return 'border-t-slate-200';
    }
  };

  return (
    <div className="flex flex-col min-w-[320px] w-[320px] h-full">
      <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm border-t-4 ${getColumnColor(status)}`}>
        <div className="flex items-center gap-3">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">{status}</h3>
        </div>
        <span className="text-xs font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          {tasks.length}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 bg-slate-100/40 rounded-[24px] border border-slate-200/50 p-3 overflow-y-auto custom-scrollbar space-y-3 scroll-smooth">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-300 opacity-60">
            <div className="p-4 bg-white/50 rounded-full mb-3 shadow-sm border border-slate-100">
              <Tag size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Sem tarefas</p>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanPage = ({ currentUser, users = [], teams = [], properties = [] }: KanbanPageProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form States
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigneeIds: [],
    departmentId: '',
    linkedPropertyId: ''
  });
  const [commentText, setCommentText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let q = query(collection(db, 'tasks'));
    if (currentUser.role !== UserRole.ADMIN && currentUser.teamId) {
       // Ideally we filter by department OR assignee. For now, let's fetch all and filter in memory or keep simple query
       // q = query(collection(db, 'tasks'), where('departmentId', '==', currentUser.teamId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    if (!isActiveTask) return;

    // Dropping over another task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        if (tasks[activeIndex].status !== tasks[overIndex].status) {
           // Status changed
           const newStatus = tasks[overIndex].status;
           updateDoc(doc(db, 'tasks', activeId as string), { status: newStatus });
           tasks[activeIndex].status = newStatus;
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping over a column
    const isOverColumn = Object.values(TaskStatus).includes(overId as TaskStatus);
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newStatus = overId as TaskStatus;

        if (tasks[activeIndex].status !== newStatus) {
          updateDoc(doc(db, 'tasks', activeId as string), { status: newStatus });
          tasks[activeIndex].status = newStatus;
        }
        
        return arrayMove(tasks, activeIndex, activeIndex); // No reorder needed here really
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    // Date validation
    if (newTask.dueDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const [year, month, day] = newTask.dueDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      
      if (selectedDate < today) {
        alert("A data de entrega não pode ser anterior a hoje.");
        return;
      }
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        creatorId: currentUser.id,
        createdAt: new Date().toISOString(),
        departmentId: newTask.departmentId || currentUser.teamId || 'general',
        commentsList: []
      });
      setIsNewTaskOpen(false);
      setNewTask({ 
        title: '', description: '', status: TaskStatus.TODO, 
        priority: TaskPriority.MEDIUM, assigneeIds: [], departmentId: '', linkedPropertyId: '' 
      });
    } catch (error) {
      console.error("Error adding task: ", error);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    
    const newComment: TaskComment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userPhoto: currentUser.photoUrl,
      content: commentText,
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        commentsList: arrayUnion(newComment)
      });
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment", error);
    }
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  const inputClass = "w-full bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 text-sm";

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tarefas Internas</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Fluxo e Projetos</p>
        </div>
        <button 
          onClick={() => setIsNewTaskOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus size={16} strokeWidth={3} /> Nova Tarefa
        </button>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-[1000px]">
            {Object.values(TaskStatus).map((status) => (
              <KanbanColumn 
                key={status} 
                status={status} 
                tasks={tasks.filter(t => t.status === status)} 
                onTaskClick={setEditingTask}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* New Task Drawer */}
      <AnimatePresence>
        {isNewTaskOpen && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewTaskOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nova Tarefa</h3>
                  <p className="text-slate-500 text-sm font-medium">Adicione uma tarefa ao quadro.</p>
                </div>
                <button onClick={() => setIsNewTaskOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                  <input type="text" className={inputClass} value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Ex: Revisar contrato..." />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea className={`${inputClass} h-32 resize-none`} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Detalhes da tarefa..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <select className={inputClass} value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}>
                      {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Entrega</label>
                    <input type="date" className={inputClass} value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                  <select className={inputClass} value={newTask.departmentId || ''} onChange={e => setNewTask({...newTask, departmentId: e.target.value})}>
                    <option value="">Geral</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsáveis</label>
                  <select 
                    multiple 
                    className={`${inputClass} h-32`} 
                    value={newTask.assigneeIds || []} 
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                      setNewTask({...newTask, assigneeIds: selected});
                    }}
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 ml-1">Segure Ctrl/Cmd para selecionar múltiplos.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Imóvel</label>
                  <select className={inputClass} value={newTask.linkedPropertyId || ''} onChange={e => setNewTask({...newTask, linkedPropertyId: e.target.value})}>
                    <option value="">Nenhum</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.neighborhood} - {p.city}</option>)}
                  </select>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setIsNewTaskOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all">Criar Tarefa</button>
                </div>
              </form>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* Edit Task Drawer */}
      <AnimatePresence>
        {editingTask && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes da Tarefa</h3>
                  <p className="text-slate-500 text-sm font-medium">Visualize e edite as informações.</p>
                </div>
                <button onClick={() => setEditingTask(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                      editingTask.priority === TaskPriority.URGENT ? 'bg-rose-100 text-rose-600 border-rose-200' :
                      editingTask.priority === TaskPriority.HIGH ? 'bg-orange-100 text-orange-600 border-orange-200' :
                      editingTask.priority === TaskPriority.MEDIUM ? 'bg-blue-100 text-blue-600 border-blue-200' :
                      'bg-emerald-100 text-emerald-600 border-emerald-200'
                    }`}>
                      {editingTask.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingTask.status}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{editingTask.title}</h2>
                  <p className="text-slate-600 leading-relaxed">{editingTask.description || "Sem descrição."}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsáveis</label>
                    <div className="flex -space-x-2">
                      {editingTask.assigneeIds?.map(uid => {
                        const user = users.find(u => u.id === uid);
                        return (
                          <div key={uid} title={user?.name} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {user?.name?.substring(0, 2).toUpperCase() || uid.substring(0, 2)}
                          </div>
                        );
                      })}
                      {(!editingTask.assigneeIds || editingTask.assigneeIds.length === 0) && <span className="text-sm text-slate-400">Ninguém atribuído</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entrega</label>
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Calendar size={16} className="text-slate-400" />
                      {editingTask.dueDate ? new Date(editingTask.dueDate).toLocaleDateString() : 'Sem data'}
                    </div>
                  </div>
                </div>

                {editingTask.linkedPropertyId && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imóvel Vinculado</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {properties.find(p => p.id === editingTask.linkedPropertyId)?.neighborhood || 'Imóvel'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {properties.find(p => p.id === editingTask.linkedPropertyId)?.city}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-8">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquare size={16} /> Comentários ({editingTask.commentsList?.length || 0})
                  </h4>
                  
                  <div className="space-y-6 mb-6">
                    {editingTask.commentsList?.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-500">
                          {comment.userName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{comment.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva um comentário..." 
                      className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(editingTask.id)}
                    />
                    <button 
                      onClick={() => handleAddComment(editingTask.id)}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default KanbanPage;
