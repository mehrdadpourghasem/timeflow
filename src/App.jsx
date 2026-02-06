import React, { useState, useEffect, useCallback } from 'react';
import { Play, Coffee, Clock, Calendar, BarChart3, Plus, X, ChevronLeft, ChevronRight, Moon, Edit3, Trash2, Check, Timer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STORAGE_KEY = 'timetracker-data';

const loadData = async () => {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    return result ? JSON.parse(result.value) : null;
  } catch { return null; }
};

const saveData = async (data) => {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error('Failed to save:', e); }
};

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

const formatTimeOfDay = (isoString) => new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getDateKey = (date) => date.toISOString().split('T')[0];

const getWeekKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return getDateKey(d);
};

const getMonthKey = (date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

const TASK_COLORS = [
  '#635BFF', '#00D4FF', '#0ACF83', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
  '#14B8A6', '#6366F1', '#F43F5E', '#22C55E', '#3B82F6'
];
const BREAK_COLOR = '#94A3B8';

export default function TimeTracker() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('timer');
  const [isTracking, setIsTracking] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentTask, setCurrentTask] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskColor, setNewTaskColor] = useState(TASK_COLORS[0]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewPeriod, setViewPeriod] = useState('day');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ startTime: '', endTime: '', taskId: '' });

  useEffect(() => {
    const init = async () => {
      const data = await loadData();
      if (data) {
        setTasks(data.tasks || []);
        setEntries(data.entries || []);
        if (data.activeSession) {
          setIsTracking(true);
          setIsOnBreak(data.activeSession.isBreak);
          setCurrentTask(data.activeSession.task);
          setSessionStartTime(new Date(data.activeSession.startTime));
          setWorkStartTime(data.activeSession.workStartTime ? new Date(data.activeSession.workStartTime) : null);
        }
      } else {
        setTasks([
          { id: '1', name: 'Development', color: TASK_COLORS[0] },
          { id: '2', name: 'Meetings', color: TASK_COLORS[1] },
          { id: '3', name: 'Admin', color: TASK_COLORS[2] },
        ]);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveData({
        tasks, entries,
        activeSession: isTracking ? { task: currentTask, isBreak: isOnBreak, startTime: sessionStartTime?.toISOString(), workStartTime: workStartTime?.toISOString() } : null
      });
    }
  }, [tasks, entries, isTracking, currentTask, isOnBreak, sessionStartTime, workStartTime, isLoading]);

  useEffect(() => {
    let interval;
    if (isTracking && sessionStartTime) {
      interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, sessionStartTime]);

  const startWork = (taskId) => {
    const now = new Date();
    setIsTracking(true); setIsOnBreak(false); setCurrentTask(taskId); setSessionStartTime(now); setElapsedTime(0);
    if (!workStartTime) setWorkStartTime(now);
  };

  const startBreak = () => {
    if (isTracking && !isOnBreak) {
      setEntries(prev => [...prev, { id: Date.now().toString(), taskId: currentTask, isBreak: false, startTime: sessionStartTime.toISOString(), endTime: new Date().toISOString(), duration: elapsedTime, date: getDateKey(sessionStartTime) }]);
    }
    const now = new Date();
    setIsTracking(true); setIsOnBreak(true); setCurrentTask('break'); setSessionStartTime(now); setElapsedTime(0);
  };

  const endBreak = (taskId) => {
    if (isOnBreak) {
      setEntries(prev => [...prev, { id: Date.now().toString(), taskId: 'break', isBreak: true, startTime: sessionStartTime.toISOString(), endTime: new Date().toISOString(), duration: elapsedTime, date: getDateKey(sessionStartTime) }]);
    }
    startWork(taskId);
  };

  const finishWork = () => {
    if (isTracking) {
      setEntries(prev => [...prev, { id: Date.now().toString(), taskId: currentTask, isBreak: isOnBreak, startTime: sessionStartTime.toISOString(), endTime: new Date().toISOString(), duration: elapsedTime, date: getDateKey(sessionStartTime) }]);
    }
    setIsTracking(false); setIsOnBreak(false); setCurrentTask(''); setSessionStartTime(null); setElapsedTime(0); setWorkStartTime(null);
  };

  const addTask = () => {
    if (newTaskName.trim()) {
      setTasks(prev => [...prev, { id: Date.now().toString(), name: newTaskName.trim(), color: newTaskColor }]);
      setNewTaskName(''); setShowAddTask(false); setNewTaskColor(TASK_COLORS[0]);
    }
  };

  const deleteTask = (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId));
  const getTaskById = (taskId) => tasks.find(t => t.id === taskId);

  const getEntriesForPeriod = useCallback(() => {
    const dateKey = getDateKey(selectedDate);
    const weekKey = getWeekKey(selectedDate);
    const monthKey = getMonthKey(selectedDate);
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (viewPeriod === 'day') return entry.date === dateKey;
      if (viewPeriod === 'week') return getWeekKey(entryDate) === weekKey;
      if (viewPeriod === 'month') return getMonthKey(entryDate) === monthKey;
      return false;
    });
  }, [entries, selectedDate, viewPeriod]);

  const getEntriesForDate = useCallback((date) => entries.filter(entry => entry.date === getDateKey(date)), [entries]);

  const getStats = useCallback(() => {
    const periodEntries = getEntriesForPeriod();
    const taskTime = {};
    let totalWork = 0, totalBreak = 0;
    periodEntries.forEach(entry => {
      if (entry.isBreak) { totalBreak += entry.duration; taskTime['break'] = (taskTime['break'] || 0) + entry.duration; }
      else { totalWork += entry.duration; taskTime[entry.taskId] = (taskTime[entry.taskId] || 0) + entry.duration; }
    });
    return { taskTime, totalWork, totalBreak, total: totalWork + totalBreak };
  }, [getEntriesForPeriod]);

  // Get previous period stats for trends
  const getPreviousPeriodStats = useCallback(() => {
    const prevDate = new Date(selectedDate);
    if (viewPeriod === 'day') prevDate.setDate(prevDate.getDate() - 1);
    else if (viewPeriod === 'week') prevDate.setDate(prevDate.getDate() - 7);
    else prevDate.setMonth(prevDate.getMonth() - 1);
    
    const dateKey = getDateKey(prevDate);
    const weekKey = getWeekKey(prevDate);
    const monthKey = getMonthKey(prevDate);
    
    const periodEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (viewPeriod === 'day') return entry.date === dateKey;
      if (viewPeriod === 'week') return getWeekKey(entryDate) === weekKey;
      if (viewPeriod === 'month') return getMonthKey(entryDate) === monthKey;
      return false;
    });
    
    let totalWork = 0, totalBreak = 0;
    periodEntries.forEach(entry => {
      if (entry.isBreak) totalBreak += entry.duration;
      else totalWork += entry.duration;
    });
    return { totalWork, totalBreak, total: totalWork + totalBreak };
  }, [entries, selectedDate, viewPeriod]);

  // Get hourly distribution for timeline
  const getHourlyDistribution = useCallback(() => {
    const periodEntries = getEntriesForPeriod();
    const hourlyData = Array(24).fill(null).map(() => ({ work: 0, break: 0 }));
    
    periodEntries.forEach(entry => {
      const startHour = new Date(entry.startTime).getHours();
      const endHour = new Date(entry.endTime).getHours();
      const duration = entry.duration;
      
      // Simple distribution - assign to start hour for now
      if (entry.isBreak) {
        hourlyData[startHour].break += duration;
      } else {
        hourlyData[startHour].work += duration;
      }
    });
    
    return hourlyData;
  }, [getEntriesForPeriod]);

  const navigatePeriod = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewPeriod === 'day') newDate.setDate(newDate.getDate() + direction);
    else if (viewPeriod === 'week') newDate.setDate(newDate.getDate() + (7 * direction));
    else newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const getPeriodLabel = () => {
    if (viewPeriod === 'day') return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (viewPeriod === 'week') {
      const start = new Date(selectedDate); start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = firstDay.getDay() - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return days;
  };

  const isToday = (date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date) => date.toDateString() === selectedDate.toDateString();
  const hasEntries = (date) => getEntriesForDate(date).length > 0;

  const startEditEntry = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      startTime: new Date(entry.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(entry.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      taskId: entry.taskId
    });
  };

  const saveEditEntry = (entryId) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      const [startH, startM] = editForm.startTime.split(':').map(Number);
      const [endH, endM] = editForm.endTime.split(':').map(Number);
      const startDate = new Date(entry.startTime); startDate.setHours(startH, startM, 0);
      const endDate = new Date(entry.endTime); endDate.setHours(endH, endM, 0);
      return { ...entry, taskId: editForm.taskId, isBreak: editForm.taskId === 'break', startTime: startDate.toISOString(), endTime: endDate.toISOString(), duration: Math.max(0, Math.floor((endDate - startDate) / 1000)) };
    }));
    setEditingEntry(null);
  };

  const deleteEntry = (entryId) => setEntries(prev => prev.filter(e => e.id !== entryId));

  const stats = getStats();
  const prevStats = getPreviousPeriodStats();
  const hourlyData = getHourlyDistribution();
  const todayEntries = getEntriesForDate(selectedDate).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // Calculate trends
  const workTrend = prevStats.totalWork > 0 ? ((stats.totalWork - prevStats.totalWork) / prevStats.totalWork * 100) : 0;
  const breakTrend = prevStats.totalBreak > 0 ? ((stats.totalBreak - prevStats.totalBreak) / prevStats.totalBreak * 100) : 0;

  const styles = {
    container: { minHeight: '100vh', background: '#F6F9FC', color: '#0A2540', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    header: { background: 'linear-gradient(135deg, #0A2540 0%, #1B3A5C 100%)', padding: '1.5rem 2rem' },
    headerInner: { maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    logoIcon: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #635BFF 0%, #00D4FF 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: '1.5rem', fontWeight: '600', color: '#fff', margin: 0 },
    workingBadge: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(10, 207, 131, 0.15)', borderRadius: '20px', border: '1px solid rgba(10, 207, 131, 0.3)' },
    workingDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#0ACF83', animation: 'pulse 2s infinite' },
    workingText: { fontSize: '0.875rem', color: '#0ACF83', fontWeight: 500 },
    main: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
    tabs: { display: 'flex', gap: '0.25rem', marginBottom: '2rem', background: '#fff', padding: '0.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: 'fit-content' },
    tab: (active) => ({ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: active ? '#635BFF' : 'transparent', border: 'none', borderRadius: '8px', color: active ? '#fff' : '#64748B', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500 }),
    card: { background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' },
    cardAccent: (color) => ({ width: '4px', height: '20px', background: color, borderRadius: '2px' }),
    cardTitle: { fontSize: '0.8125rem', color: '#64748B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
    timerDisplay: { fontSize: '4.5rem', fontWeight: '300', fontFamily: "'SF Mono', monospace", letterSpacing: '-0.02em', marginBottom: '0.75rem', textAlign: 'center' },
    taskBadge: (color, bg) => ({ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: bg, borderRadius: '20px' }),
    taskBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#0A2540', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', width: '100%', marginBottom: '0.5rem' },
    actionBtn: (bg, color) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: bg, border: 'none', borderRadius: '10px', color: color, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 500 }),
    statCard: (bg) => ({ background: bg, borderRadius: '12px', padding: '1.25rem' }),
    statLabel: { color: '#64748B', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 500 },
    statValue: (color) => ({ color: color, fontSize: '1.75rem', fontWeight: '600' }),
    progressBar: { height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' },
    progressFill: (width, color) => ({ width: `${width}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s ease' }),
    calendarBtn: { padding: '0.5rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    calendarDay: (selected, today) => ({ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', background: selected ? '#635BFF' : today ? '#F0EFFF' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }),
    entryRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '0.75rem' },
    input: { padding: '0.5rem', border: '1px solid #E2E8F0', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.875rem' },
    iconBtn: (color) => ({ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: color, borderRadius: '6px' }),
    colorPicker: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' },
    colorOption: (color, selected) => ({ width: '28px', height: '28px', borderRadius: '6px', background: color, border: selected ? '3px solid #0A2540' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }),
  };

  if (isLoading) return <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#635BFF', fontSize: '1.25rem' }}>Loading...</div></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><Timer size={22} color="#fff" /></div>
            <h1 style={styles.logoText}>TimeFlow</h1>
          </div>
          {workStartTime && (
            <div style={styles.workingBadge}>
              <div style={styles.workingDot} />
              <span style={styles.workingText}>Working since {workStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.tabs}>
          {[{ id: 'timer', icon: Clock, label: 'Timer' }, { id: 'calendar', icon: Calendar, label: 'Calendar' }, { id: 'tasks', icon: Plus, label: 'Tasks' }, { id: 'stats', icon: BarChart3, label: 'Analytics' }].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setCurrentView(id)} style={styles.tab(currentView === id)}><Icon size={18} />{label}</button>
          ))}
        </div>

        {currentView === 'timer' && (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardAccent('#635BFF')} /><h2 style={styles.cardTitle}>Current Session</h2></div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ ...styles.timerDisplay, color: isOnBreak ? '#F59E0B' : '#0A2540' }}>{formatTime(elapsedTime)}</div>
                {isTracking && (
                  <div style={styles.taskBadge(isOnBreak ? '#F59E0B' : getTaskById(currentTask)?.color, isOnBreak ? '#FEF3C7' : `${getTaskById(currentTask)?.color}15`)}>
                    {isOnBreak ? <Coffee size={16} color="#F59E0B" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getTaskById(currentTask)?.color }} />}
                    <span style={{ color: isOnBreak ? '#92400E' : getTaskById(currentTask)?.color, fontSize: '0.875rem', fontWeight: 500 }}>{isOnBreak ? 'On Break' : getTaskById(currentTask)?.name}</span>
                  </div>
                )}
              </div>
              {!isTracking && (
                <div>
                  <p style={{ color: '#64748B', marginBottom: '1rem', fontSize: '0.875rem' }}>Select a task to begin:</p>
                  {tasks.map(task => (
                    <button key={task.id} onClick={() => startWork(task.id)} style={styles.taskBtn}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: task.color }} />
                      <span style={{ fontWeight: 500 }}>{task.name}</span>
                      <Play size={16} style={{ marginLeft: 'auto' }} color={task.color} />
                    </button>
                  ))}
                </div>
              )}
              {isTracking && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {!isOnBreak ? (
                    <>
                      <button onClick={startBreak} style={styles.actionBtn('#FEF3C7', '#92400E')}><Coffee size={18} />Take Break</button>
                      <button onClick={finishWork} style={styles.actionBtn('#0A2540', '#fff')}><Moon size={18} />End Day</button>
                    </>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <p style={{ color: '#64748B', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Resume work on:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {tasks.map(task => (
                          <button key={task.id} onClick={() => endBreak(task.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: `${task.color}15`, border: `1px solid ${task.color}30`, borderRadius: '8px', color: task.color, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 500 }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: task.color }} />{task.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}><div style={styles.cardAccent('#0ACF83')} /><h2 style={styles.cardTitle}>Today's Summary</h2></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={styles.statCard('linear-gradient(135deg, #635BFF15 0%, #00D4FF15 100%)')}>
                  <div style={styles.statLabel}>WORK TIME</div>
                  <div style={styles.statValue('#635BFF')}>{formatDuration(stats.totalWork + (isTracking && !isOnBreak ? elapsedTime : 0))}</div>
                </div>
                <div style={styles.statCard('#FEF3C720')}>
                  <div style={styles.statLabel}>BREAK TIME</div>
                  <div style={styles.statValue('#F59E0B')}>{formatDuration(stats.totalBreak + (isTracking && isOnBreak ? elapsedTime : 0))}</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '1rem', fontWeight: 500 }}>Task Breakdown</h3>
                {Object.entries(stats.taskTime).length === 0 && !isTracking ? (
                  <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>No tasks tracked today</p>
                ) : (
                  <div>
                    {tasks.map(task => {
                      const time = (stats.taskTime[task.id] || 0) + (isTracking && currentTask === task.id && !isOnBreak ? elapsedTime : 0);
                      if (time === 0) return null;
                      const pct = ((time / (stats.total + elapsedTime)) * 100) || 0;
                      return (
                        <div key={task.id} style={{ marginBottom: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0A2540' }}>{task.name}</span>
                            <span style={{ color: '#64748B', fontSize: '0.875rem' }}>{formatDuration(time)}</span>
                          </div>
                          <div style={styles.progressBar}><div style={styles.progressFill(pct, task.color)} /></div>
                        </div>
                      );
                    })}
                    {(stats.taskTime['break'] || (isTracking && isOnBreak)) && (
                      <div style={{ marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0A2540', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Coffee size={14} />Breaks</span>
                          <span style={{ color: '#64748B', fontSize: '0.875rem' }}>{formatDuration((stats.taskTime['break'] || 0) + (isTracking && isOnBreak ? elapsedTime : 0))}</span>
                        </div>
                        <div style={styles.progressBar}><div style={styles.progressFill(((stats.taskTime['break'] || 0) + (isTracking && isOnBreak ? elapsedTime : 0)) / (stats.total + elapsedTime) * 100, BREAK_COLOR)} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'calendar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
            <div style={{ ...styles.card, padding: '1.5rem', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} style={styles.calendarBtn}><ChevronLeft size={18} color="#64748B" /></button>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0A2540' }}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} style={styles.calendarBtn}><ChevronRight size={18} color="#64748B" /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', padding: '0.5rem' }}>{day}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                {getCalendarDays().map((day, i) => (
                  <button key={i} onClick={() => setSelectedDate(day.date)} style={styles.calendarDay(isSelected(day.date), isToday(day.date))}>
                    <span style={{ fontSize: '0.875rem', fontWeight: isSelected(day.date) || isToday(day.date) ? 600 : 400, color: isSelected(day.date) ? '#fff' : day.isCurrentMonth ? '#0A2540' : '#CBD5E1' }}>{day.date.getDate()}</span>
                    {hasEntries(day.date) && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected(day.date) ? '#fff' : '#635BFF' }} />}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ ...styles.card, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: '#0A2540', margin: 0, fontWeight: 600 }}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                  <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{todayEntries.length} {todayEntries.length === 1 ? 'entry' : 'entries'} • {formatDuration(todayEntries.reduce((acc, e) => acc + e.duration, 0))} total</p>
                </div>
              </div>
              {todayEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}><Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} /><p style={{ margin: 0 }}>No entries for this day</p></div>
              ) : (
                <div>
                  {todayEntries.map(entry => {
                    const task = entry.isBreak ? null : getTaskById(entry.taskId);
                    const isEditing = editingEntry === entry.id;
                    return (
                      <div key={entry.id} style={styles.entryRow}>
                        <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: entry.isBreak ? BREAK_COLOR : task?.color || '#94A3B8' }} />
                        {isEditing ? (
                          <div style={{ flex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} style={styles.input} />
                            <span style={{ color: '#64748B' }}>→</span>
                            <input type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} style={styles.input} />
                            <select value={editForm.taskId} onChange={e => setEditForm({ ...editForm, taskId: e.target.value })} style={{ ...styles.input, background: '#fff' }}>
                              <option value="break">Break</option>
                              {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => saveEditEntry(entry.id)} style={{ padding: '0.5rem', background: '#0ACF83', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}><Check size={16} color="#fff" /></button>
                            <button onClick={() => setEditingEntry(null)} style={{ padding: '0.5rem', background: '#E2E8F0', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}><X size={16} color="#64748B" /></button>
                          </div>
                        ) : (
                          <>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, color: '#0A2540', marginBottom: '0.25rem' }}>{entry.isBreak ? 'Break' : task?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{formatTimeOfDay(entry.startTime)} → {formatTimeOfDay(entry.endTime)}</div>
                            </div>
                            <div style={{ fontWeight: 600, color: '#0A2540', fontSize: '0.9375rem' }}>{formatDuration(entry.duration)}</div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => startEditEntry(entry)} style={styles.iconBtn('#64748B')}><Edit3 size={16} /></button>
                              <button onClick={() => deleteEntry(entry.id)} style={styles.iconBtn('#EF4444')}><Trash2 size={16} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'tasks' && (
          <div style={{ ...styles.card, maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#0A2540', margin: 0, fontWeight: 600 }}>Manage Tasks</h2>
                <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{tasks.length} tasks configured</p>
              </div>
              <button onClick={() => setShowAddTask(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: '#635BFF', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500 }}><Plus size={18} />Add Task</button>
            </div>
            {showAddTask && (
              <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Task name..." style={{ flex: 1, padding: '0.625rem 1rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem' }} onKeyPress={(e) => e.key === 'Enter' && addTask()} autoFocus />
                  <button onClick={addTask} style={{ padding: '0.625rem 1.25rem', background: '#635BFF', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Add</button>
                  <button onClick={() => { setShowAddTask(false); setNewTaskName(''); setNewTaskColor(TASK_COLORS[0]); }} style={{ padding: '0.625rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={18} color="#64748B" /></button>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Choose color:</label>
                  <div style={styles.colorPicker}>
                    {TASK_COLORS.map(color => (
                      <button key={color} onClick={() => setNewTaskColor(color)} style={styles.colorOption(color, newTaskColor === color)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              {tasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '0.5rem' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: task.color }} />
                  <span style={{ flex: 1, fontWeight: 500, color: '#0A2540' }}>{task.name}</span>
                  <button onClick={() => deleteTask(task.id)} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'stats' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem', background: '#fff', padding: '0.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {['day', 'week', 'month'].map(period => (
                  <button key={period} onClick={() => setViewPeriod(period)} style={{ padding: '0.5rem 1rem', background: viewPeriod === period ? '#635BFF' : 'transparent', border: 'none', borderRadius: '8px', color: viewPeriod === period ? '#fff' : '#64748B', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{period}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', padding: '0.375rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <button onClick={() => navigatePeriod(-1)} style={{ padding: '0.5rem', background: '#F8FAFC', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} color="#64748B" /></button>
                <span style={{ minWidth: '180px', textAlign: 'center', fontSize: '0.9375rem', fontWeight: 500, color: '#0A2540' }}>{getPeriodLabel()}</span>
                <button onClick={() => navigatePeriod(1)} style={{ padding: '0.5rem', background: '#F8FAFC', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronRight size={18} color="#64748B" /></button>
              </div>
            </div>

            {/* Stats Cards with Trends */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={styles.card}>
                <div style={{ color: '#64748B', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Work</div>
                <div style={{ color: '#635BFF', fontSize: '2.25rem', fontWeight: '600' }}>{formatDuration(stats.totalWork)}</div>
                {prevStats.totalWork > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {workTrend > 0 ? <TrendingUp size={14} color="#0ACF83" /> : workTrend < 0 ? <TrendingDown size={14} color="#EF4444" /> : <Minus size={14} color="#94A3B8" />}
                    <span style={{ fontSize: '0.75rem', color: workTrend > 0 ? '#0ACF83' : workTrend < 0 ? '#EF4444' : '#94A3B8' }}>
                      {workTrend > 0 ? '+' : ''}{workTrend.toFixed(0)}% vs previous
                    </span>
                  </div>
                )}
              </div>
              <div style={styles.card}>
                <div style={{ color: '#64748B', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Breaks</div>
                <div style={{ color: '#F59E0B', fontSize: '2.25rem', fontWeight: '600' }}>{formatDuration(stats.totalBreak)}</div>
                {prevStats.totalBreak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {breakTrend > 0 ? <TrendingUp size={14} color="#F59E0B" /> : breakTrend < 0 ? <TrendingDown size={14} color="#0ACF83" /> : <Minus size={14} color="#94A3B8" />}
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {breakTrend > 0 ? '+' : ''}{breakTrend.toFixed(0)}% vs previous
                    </span>
                  </div>
                )}
              </div>
              <div style={styles.card}>
                <div style={{ color: '#64748B', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Productivity</div>
                <div style={{ color: '#0ACF83', fontSize: '2.25rem', fontWeight: '600' }}>{stats.total > 0 ? Math.round((stats.totalWork / stats.total) * 100) : 0}%</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem' }}>Work / Total time ratio</div>
              </div>
            </div>

            {/* Time Allocation Donut */}
            <div style={styles.card}>
              <h3 style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Time Allocation</h3>
              {stats.total === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}><BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} /><p style={{ margin: 0 }}>No data for this period</p></div>
              ) : (
                <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      {(() => {
                        let currentAngle = 0;
                        const segments = [];
                        tasks.forEach(task => {
                          const time = stats.taskTime[task.id] || 0;
                          if (time > 0) {
                            const percentage = (time / stats.total) * 100;
                            segments.push({ color: task.color, startAngle: currentAngle, percentage });
                            currentAngle += (percentage / 100) * 360;
                          }
                        });
                        if (stats.taskTime['break'] > 0) segments.push({ color: BREAK_COLOR, startAngle: currentAngle, percentage: (stats.taskTime['break'] / stats.total) * 100 });
                        return segments.map((seg, i) => {
                          const circumference = 2 * Math.PI * 35;
                          return <circle key={i} cx="50" cy="50" r="35" fill="none" stroke={seg.color} strokeWidth="12" strokeDasharray={`${(seg.percentage / 100) * circumference} ${circumference}`} strokeDashoffset={-(seg.startAngle / 360) * circumference} strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />;
                        });
                      })()}
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#0A2540' }}>{formatDuration(stats.total)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Total</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {tasks.map(task => {
                      const time = stats.taskTime[task.id] || 0;
                      if (time === 0) return null;
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: task.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 500, color: '#0A2540' }}>{task.name}</span><span style={{ color: '#64748B' }}>{Math.round((time / stats.total) * 100)}%</span></div>
                            <div style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>{formatDuration(time)}</div>
                          </div>
                        </div>
                      );
                    })}
                    {stats.taskTime['break'] > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: BREAK_COLOR }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 500, color: '#0A2540' }}>Breaks</span><span style={{ color: '#64748B' }}>{Math.round((stats.taskTime['break'] / stats.total) * 100)}%</span></div>
                          <div style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>{formatDuration(stats.taskTime['break'])}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hourly Activity Timeline */}
            <div style={{ ...styles.card, marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Activity Throughout the Day</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '120px' }}>
                  {hourlyData.map((hour, i) => {
                    const maxVal = Math.max(...hourlyData.map(h => h.work + h.break), 1);
                    const workHeight = (hour.work / maxVal) * 100;
                    const breakHeight = (hour.break / maxVal) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <div style={{ height: `${workHeight}%`, background: '#635BFF', borderRadius: '2px 2px 0 0', minHeight: hour.work > 0 ? '4px' : 0 }} />
                        <div style={{ height: `${breakHeight}%`, background: BREAK_COLOR, minHeight: hour.break > 0 ? '4px' : 0 }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                  {[0, 6, 12, 18, 23].map(h => (
                    <div key={h} style={{ flex: h === 0 ? 0 : 1, textAlign: h === 0 ? 'left' : h === 23 ? 'right' : 'center', fontSize: '0.6875rem', color: '#94A3B8' }}>
                      {h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : h === 18 ? '6pm' : '11pm'}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#635BFF' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Work</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: BREAK_COLOR }} />
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Breaks</span>
                </div>
              </div>
            </div>

            {/* Daily Breakdown with Legend */}
            {viewPeriod !== 'day' && (
              <div style={{ ...styles.card, marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Daily Breakdown</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '200px' }}>
                  {(() => {
                    const periodEntries = getEntriesForPeriod();
                    const dailyTotals = {};
                    periodEntries.forEach(entry => {
                      if (!dailyTotals[entry.date]) dailyTotals[entry.date] = { work: 0, break: 0, byTask: {} };
                      if (entry.isBreak) dailyTotals[entry.date].break += entry.duration;
                      else {
                        dailyTotals[entry.date].work += entry.duration;
                        dailyTotals[entry.date].byTask[entry.taskId] = (dailyTotals[entry.date].byTask[entry.taskId] || 0) + entry.duration;
                      }
                    });
                    const numDays = viewPeriod === 'week' ? 7 : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                    const startDate = viewPeriod === 'week' ? new Date(new Date(selectedDate).setDate(selectedDate.getDate() - selectedDate.getDay())) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    let maxTotal = 0;
                    const days = [];
                    for (let i = 0; i < numDays; i++) {
                      const d = new Date(startDate); d.setDate(startDate.getDate() + i);
                      const key = getDateKey(d);
                      const total = (dailyTotals[key]?.work || 0) + (dailyTotals[key]?.break || 0);
                      if (total > maxTotal) maxTotal = total;
                      days.push({ date: d, key, work: dailyTotals[key]?.work || 0, break: dailyTotals[key]?.break || 0, byTask: dailyTotals[key]?.byTask || {} });
                    }
                    return days.map((day, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '160px', width: '100%', maxWidth: viewPeriod === 'month' ? '20px' : '40px' }}>
                          {/* Stack task colors */}
                          {tasks.map(task => {
                            const taskTime = day.byTask[task.id] || 0;
                            const height = maxTotal > 0 ? (taskTime / maxTotal) * 160 : 0;
                            return height > 0 ? <div key={task.id} style={{ height: `${height}px`, background: task.color, transition: 'height 0.3s ease' }} /> : null;
                          })}
                          {/* Break bar */}
                          {day.break > 0 && <div style={{ height: `${maxTotal > 0 ? (day.break / maxTotal) * 160 : 0}px`, background: BREAK_COLOR, transition: 'height 0.3s ease' }} />}
                        </div>
                        <div style={{ fontSize: viewPeriod === 'month' ? '0.625rem' : '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>{viewPeriod === 'week' ? day.date.toLocaleDateString('en-US', { weekday: 'short' }) : day.date.getDate()}</div>
                      </div>
                    ));
                  })()}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                  {tasks.filter(t => stats.taskTime[t.id] > 0).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: task.color }} />
                      <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>{task.name}</span>
                    </div>
                  ))}
                  {stats.taskTime['break'] > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: BREAK_COLOR }} />
                      <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Breaks</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
