'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { 
  Play, 
  Square, 
  Clock, 
  History, 
  Settings, 
  TrendingUp,
  User,
  Printer,
  Cog,
  Brush,
  Sparkles,
  Plus,
  Trash2,
  Sun,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Palmtree
} from 'lucide-react'

// Types
type Role = 'WORKER' | 'MASTER' | 'ADMIN'
type StageType = 'PREPARATION' | 'EXPOSURE' | 'SETUP' | 'PRINTING' | 'WASHING'
type DayType = 'WORKING' | 'WEEKEND' | 'COMPLETED'

interface Worker {
  id: number
  telegramId: string
  name: string
  role: Role
  createdAt: string
}

interface Stage {
  id: number
  taskId: number
  stageType: StageType
  startTime: string | null
  endTime: string | null
  duration: number | null
  units: number | null
  efficiency: number | null
}

interface ExtraWork {
  id: number
  taskId: number
  name: string
  startTime: string | null
  endTime: string | null
  duration: number | null
}

interface Task {
  id: number
  taskNumber: string
  startTime: string
  endTime: string | null
  totalDuration: number | null
  workerId: number
  dayId?: number | null
  createdAt: string
  stages: Stage[]
  extraWorks: ExtraWork[]
  overallEfficiency?: number
}

interface Day {
  id: number
  date: string
  type: DayType
  startTime: string | null
  endTime: string | null
  duration: number | null
  efficiency: number | null
  workerId: number
  tasks: Task[]
  createdAt: string
  activeTask?: Task | null
}

interface Norm {
  id: number
  stageType: StageType
  unitsPerHour: number
  unitName: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

interface TelegramWebApp {
  initData: string
  user?: TelegramUser
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

const stageConfig: Record<StageType, { label: string; icon: React.ReactNode }> = {
  PREPARATION: { label: 'Подготовка формы', icon: <Brush className="w-4 h-4" /> },
  EXPOSURE: { label: 'Засветка', icon: <Sun className="w-4 h-4" /> },
  SETUP: { label: 'Настройка', icon: <Cog className="w-4 h-4" /> },
  PRINTING: { label: 'Печать', icon: <Printer className="w-4 h-4" /> },
  WASHING: { label: 'Смывка формы', icon: <Sparkles className="w-4 h-4" /> },
}

const defaultStageTypes: StageType[] = ['PREPARATION', 'EXPOSURE', 'SETUP', 'PRINTING', 'WASHING']

const demoUser: Worker = {
  id: 1,
  telegramId: 'demo-user',
  name: 'Демо Пользователь',
  role: 'ADMIN',
  createdAt: new Date().toISOString(),
}

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export default function Home() {
  // State
  const [worker, setWorker] = useState<Worker | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [norms, setNorms] = useState<Norm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTelegram, setIsTelegram] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [days, setDays] = useState<Day[]>([])
  const [activeWorkDay, setActiveWorkDay] = useState<Day | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayDialog, setShowDayDialog] = useState(false)
  const [showDayInfo, setShowDayInfo] = useState<Day | null>(null)
  
  // Form state
  const [taskNumber, setTaskNumber] = useState('')
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [shiftSeconds, setShiftSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const shiftTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Stage units state
  const [stageUnits, setStageUnits] = useState<Record<StageType, string>>({
    PREPARATION: '',
    EXPOSURE: '',
    SETUP: '',
    PRINTING: '',
    WASHING: '',
  })
  
  // Extra work state
  const [newExtraWorkName, setNewExtraWorkName] = useState('')
  
  // Results state
  const [lastResults, setLastResults] = useState<Task | null>(null)
  
  // Settings state
  const [normsDialogOpen, setNormsDialogOpen] = useState(false)
  const [editingNorms, setEditingNorms] = useState<Norm[]>([])

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      setIsTelegram(true)
      setTheme(tg.colorScheme || 'light')
    }
  }, [])

  // Initialize worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        let telegramId = 'demo-user'
        let name = 'Демо Пользователь'

        if (isTelegram && window.Telegram?.WebApp?.user) {
          const tgUser = window.Telegram.WebApp.user
          telegramId = String(tgUser.id)
          name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'User'
        }

        const response = await fetch('/api/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, name }),
        })

        if (response.ok) {
          setWorker(await response.json())
        }
      } catch (error) {
        console.error('Error initializing worker:', error)
        setWorker(demoUser)
      }
    }

    initWorker()
  }, [isTelegram])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!worker) return
      
      try {
        // Check for active work day
        const activeDayRes = await fetch(`/api/days/active?workerId=${worker.id}`)
        if (activeDayRes.ok) {
          const activeDay = await activeDayRes.json()
          if (activeDay) {
            setActiveWorkDay(activeDay)
            if (activeDay.activeTask) {
              setActiveTask(activeDay.activeTask)
              setTaskNumber(activeDay.activeTask.taskNumber)
              const elapsed = Math.floor((Date.now() - new Date(activeDay.activeTask.startTime).getTime()) / 1000)
              setTimerSeconds(elapsed)
              setIsRunning(true)
            }
            if (activeDay.startTime) {
              const shiftElapsed = Math.floor((Date.now() - new Date(activeDay.startTime).getTime()) / 1000)
              setShiftSeconds(shiftElapsed)
            }
          }
        }

        // Load days for current month
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const daysRes = await fetch(`/api/days?workerId=${worker.id}&month=${monthStr}`)
        if (daysRes.ok) {
          setDays(await daysRes.json())
        }

        // Load tasks
        const tasksRes = await fetch(`/api/tasks?workerId=${worker.id}`)
        if (tasksRes.ok) {
          const data = await tasksRes.json()
          setTasks(data.tasks || [])
        }

        // Load norms
        const normsRes = await fetch('/api/norms')
        if (normsRes.ok) {
          setNorms(await normsRes.json())
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [worker, currentMonth])

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // Shift timer logic
  useEffect(() => {
    if (activeWorkDay && activeWorkDay.type === 'WORKING') {
      shiftTimerRef.current = setInterval(() => {
        if (activeWorkDay.startTime) {
          const elapsed = Math.floor((Date.now() - new Date(activeWorkDay.startTime).getTime()) / 1000)
          setShiftSeconds(elapsed)
        }
      }, 1000)
    }
    return () => {
      if (shiftTimerRef.current) clearInterval(shiftTimerRef.current)
    }
  }, [activeWorkDay])

    // Live timer for active stages
  useEffect(() => {
    if (!activeTask || !isRunning) return
    
    const interval = setInterval(() => {
      // Force re-render to update live timers
      setActiveTask(prev => prev ? { ...prev } : null)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [activeTask, isRunning])

  // Haptic feedback helper
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
    if (isTelegram && window.Telegram?.WebApp?.HapticFeedback) {
      if (['light', 'medium', 'heavy'].includes(type)) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy')
      } else {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type as 'error' | 'success' | 'warning')
      }
    }
  }, [isTelegram])

  // Format time
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Format duration short
  const formatDurationShort = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}ч ${m}м`
    return `${m}м`
  }

  // Get stage status
  const getStageStatus = (stageType: StageType) => {
    const stage = activeTask?.stages.find(s => s.stageType === stageType)
    const isActive = !!stage?.startTime && !stage?.endTime
    const isCompleted = !!stage?.endTime
    const duration = stage?.duration ?? null
    return { stage, isActive, isCompleted, duration }
  }
    // Start work day
  const handleStartWorkDay = async (date: Date) => {
    if (!worker) return

    try {
      const response = await fetch('/api/days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: worker.id,
          date: date.toISOString(),
          type: 'WORKING',
        }),
      })

      if (response.ok) {
        const newDay = await response.json()
        setActiveWorkDay(newDay)
        setShiftSeconds(0)
        setShowDayDialog(false)
        setSelectedDate(null)
        
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const daysRes = await fetch(`/api/days?workerId=${worker.id}&month=${monthStr}`)
        if (daysRes.ok) setDays(await daysRes.json())
        
        haptic('success')
        toast({ title: 'Рабочий день начат' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // Mark as weekend
  const handleMarkWeekend = async (date: Date) => {
    if (!worker) return

    try {
      const response = await fetch('/api/days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: worker.id,
          date: date.toISOString(),
          type: 'WEEKEND',
        }),
      })

      if (response.ok) {
        setShowDayDialog(false)
        setSelectedDate(null)
        
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const daysRes = await fetch(`/api/days?workerId=${worker.id}&month=${monthStr}`)
        if (daysRes.ok) setDays(await daysRes.json())
        
        haptic('success')
        toast({ title: 'Выходной отмечен' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // End work day
  const handleEndWorkDay = async () => {
    if (!activeWorkDay) return

    try {
      if (activeTask) {
        await fetch(`/api/tasks/${activeTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const response = await fetch(`/api/days/${activeWorkDay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const completedDay = await response.json()
        
        setActiveWorkDay(null)
        setActiveTask(null)
        setIsRunning(false)
        setTimerSeconds(0)
        setShiftSeconds(0)
        setTaskNumber('')
        setStageUnits({ PREPARATION: '', EXPOSURE: '', SETUP: '', PRINTING: '', WASHING: '' })
        setNewExtraWorkName('')
        
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const daysRes = await fetch(`/api/days?workerId=${worker?.id}&month=${monthStr}`)
        if (daysRes.ok) setDays(await daysRes.json())
        
        const tasksRes = await fetch(`/api/tasks?workerId=${worker?.id}`)
        if (tasksRes.ok) {
          const data = await tasksRes.json()
          setTasks(data.tasks || [])
        }
        
        haptic('success')
        toast({ 
          title: 'Рабочий день завершён', 
          description: `Время: ${formatDurationShort(completedDay.duration || 0)}` 
        })
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // Start task
  const handleStartTask = async () => {
    if (!worker || !activeWorkDay || !taskNumber.trim()) {
      toast({ title: 'Введите номер задания', variant: 'destructive' })
      return
    }

    if (activeTask) {
      toast({ title: 'Сначала завершите текущую задачу', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskNumber,
          workerId: worker.id,
          dayId: activeWorkDay.id,
        }),
      })

      if (response.ok) {
        const newTask = await response.json()
        setActiveTask(newTask)
        setIsRunning(true)
        setTimerSeconds(0)
        haptic('success')
        toast({ title: 'Задача начата' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // Stop task
  const handleStopTask = async () => {
    if (!activeTask) return

    try {
      const response = await fetch(`/api/tasks/${activeTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const completedTask = await response.json()
        setLastResults(completedTask)
        setTasks((prev) => [completedTask, ...prev.filter((t) => t.id !== completedTask.id)])
        setActiveTask(null)
        setIsRunning(false)
        setTimerSeconds(0)
        setTaskNumber('')
        setStageUnits({ PREPARATION: '', EXPOSURE: '', SETUP: '', PRINTING: '', WASHING: '' })
        setNewExtraWorkName('')
        
        haptic('success')
        toast({ title: 'Задача завершена' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

    // Toggle stage
  const handleToggleStage = async (stageType: StageType) => {
    if (!activeTask) return

    try {
      const units = stageType === 'PRINTING' ? parseInt(stageUnits.PRINTING) || null : null
      
      const response = await fetch(`/api/tasks/${activeTask.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageType, units }),
      })

      if (response.ok) {
        const updatedStage = await response.json()
        console.log('Stage updated:', updatedStage)
        
        setActiveTask((prev) => {
          if (!prev) return prev
          const existingIndex = prev.stages.findIndex(s => s.stageType === stageType)
          const newStages = [...prev.stages]
          
          if (existingIndex >= 0) {
            newStages[existingIndex] = updatedStage
          } else {
            newStages.push(updatedStage)
          }
          
          return { ...prev, stages: newStages }
        })
        
        haptic('medium')
      } else {
        const error = await response.json()
        console.error('Stage error:', error)
        toast({ title: 'Ошибка', description: error.error, variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error toggling stage:', error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // Add extra work
  const handleAddExtraWork = async () => {
    if (!activeTask || !newExtraWorkName.trim()) {
      toast({ title: 'Введите название', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch(`/api/tasks/${activeTask.id}/extra-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newExtraWorkName.trim() }),
      })

      if (response.ok) {
        const newExtraWork = await response.json()
        setActiveTask((prev) => {
          if (!prev) return prev
          return { ...prev, extraWorks: [...prev.extraWorks, newExtraWork] }
        })
        setNewExtraWorkName('')
        haptic('success')
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Ошибка', variant: 'destructive' })
    }
  }

  // Toggle extra work
  const handleToggleExtraWork = async (extraWorkId: number) => {
    try {
      const response = await fetch(`/api/extra-work/${extraWorkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const updated = await response.json()
        setActiveTask((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            extraWorks: prev.extraWorks.map(ew => ew.id === extraWorkId ? updated : ew),
          }
        })
        haptic('medium')
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Delete extra work
  const handleDeleteExtraWork = async (extraWorkId: number) => {
    try {
      const response = await fetch(`/api/extra-work/${extraWorkId}`, { method: 'DELETE' })
      if (response.ok) {
        setActiveTask((prev) => {
          if (!prev) return prev
          return { ...prev, extraWorks: prev.extraWorks.filter(ew => ew.id !== extraWorkId) }
        })
        haptic('light')
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Get efficiency color
  const getEfficiencyColor = (efficiency: number | null | undefined): string => {
    if (efficiency === null || efficiency === undefined) return 'text-muted-foreground'
    if (efficiency >= 80) return 'text-green-500'
    if (efficiency >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Format day date
  const formatDayDate = (date: Date | string): string => {
    const d = new Date(date)
    return `${d.getDate()} ${monthNames[d.getMonth()].toLowerCase()}`
  }

  // Get days in month
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: (Date | null)[] = []
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    
    return days
  }

  // Get day data
  const getDayData = (date: Date): Day | undefined => {
    return days.find(d => {
      const dayDate = new Date(d.date)
      return dayDate.getDate() === date.getDate() && 
             dayDate.getMonth() === date.getMonth() && 
             dayDate.getFullYear() === date.getFullYear()
    })
  }

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dayData = getDayData(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clickDate = new Date(date)
    clickDate.setHours(0, 0, 0, 0)
    
    if (dayData) {
      setShowDayInfo(dayData)
    } else if (clickDate <= today) {
      setSelectedDate(date)
      setShowDayDialog(true)
    }
  }

  // Navigate month
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto animate-pulse text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  // If there's an active work day, show timer screen
  if (activeWorkDay && activeWorkDay.type === 'WORKING') {
    return (
      <div className={`min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Хронометраж</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Смена</div>
                <div className="font-mono text-sm font-semibold">{formatTime(shiftSeconds)}</div>
              </div>
              <Badge variant="outline">{worker?.name}</Badge>
            </div>
          </div>
        </header>

        <main className="container px-4 py-4 pb-20">
          <Tabs defaultValue="timer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timer"><Clock className="w-4 h-4 mr-1" />Таймер</TabsTrigger>
              <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />История</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />Настройки</TabsTrigger>
            </TabsList>

            {/* Timer Tab */}
            <TabsContent value="timer" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">📋 Задание</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="taskNumber">Номер задания</Label>
                  <Input
                    id="taskNumber"
                    placeholder="Например: 12345"
                    value={taskNumber}
                    onChange={(e) => setTaskNumber(e.target.value)}
                    disabled={isRunning}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">⏱️ Общее время</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="font-mono text-5xl font-bold tracking-wider">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="flex justify-center gap-3">
                      {!isRunning ? (
                        <Button size="lg" className="w-full max-w-xs" onClick={handleStartTask}>
                          <Play className="w-5 h-5 mr-2" />Старт
                        </Button>
                      ) : (
                        <Button size="lg" variant="destructive" className="w-full max-w-xs" onClick={handleStopTask}>
                          <Square className="w-5 h-5 mr-2" />Стоп
                        </Button>
                      )}
                    </div>
                    {activeTask && (
                      <Badge variant="secondary" className="text-base">Задание #{activeTask.taskNumber}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stages */}
              {isRunning && activeTask && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">📝 Этапы задания</CardTitle>
                    <CardDescription>Отмечайте этапы чекбоксами по мере выполнения</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                                        {defaultStageTypes.map((stageType) => {
                      const { stage, isActive, isCompleted, duration } = getStageStatus(stageType)
                      const config = stageConfig[stageType]
                      
                      return (
                        <div key={stageType} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isActive || isCompleted}
                                onCheckedChange={() => handleToggleStage(stageType)}
                              />
                              <div className="flex items-center gap-2">
                                {config.icon}
                                <Label 
                                  className={`cursor-pointer ${isActive ? 'font-semibold text-primary' : ''} ${isCompleted ? 'text-green-600' : ''}`}
                                >
                                  {config.label}
                                </Label>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono text-sm ${isCompleted ? 'text-green-500 font-bold' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                {duration ? formatTime(duration) : isActive ? formatTime(Math.floor((Date.now() - new Date(stage?.startTime || 0).getTime()) / 1000)) : '--:--:--'}
                              </div>
                              {isCompleted && stage?.efficiency !== null && stage?.efficiency !== undefined && (
                                <div className={`text-xs font-bold ${getEfficiencyColor(stage.efficiency)}`}>
                                  {stage.efficiency.toFixed(0)}%
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground pl-9">
                            {!stage?.startTime && 'Нажмите для начала'}
                            {isActive && '⏳ В процессе...'}
                            {isCompleted && '✓ Завершено'}
                          </div>
                          {stageType === 'PRINTING' && isActive && (
                            <div className="mt-3 pl-9">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Количество"
                                  value={stageUnits.PRINTING}
                                  onChange={(e) => setStageUnits(prev => ({ ...prev, PRINTING: e.target.value }))}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">оттисков</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Extra Works */}
              {isRunning && activeTask && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">➕ Дополнительные работы</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeTask.extraWorks.map((ew) => (
                      <div key={ew.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={!!ew.startTime && !ew.endTime}
                              onCheckedChange={() => handleToggleExtraWork(ew.id)}
                            />
                            <span className={ew.endTime ? 'text-muted-foreground line-through' : ''}>{ew.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ew.duration && <span className="font-mono text-sm text-green-500">{formatTime(ew.duration)}</span>}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteExtraWork(ew.id)}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Добавить работу..."
                        value={newExtraWorkName}
                        onChange={(e) => setNewExtraWorkName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExtraWork()}
                      />
                      <Button variant="outline" size="icon" onClick={handleAddExtraWork} disabled={!newExtraWorkName.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* End Day Button */}
              <Button variant="destructive" className="w-full" size="lg" onClick={handleEndWorkDay}>
                Завершить рабочий день
              </Button>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">История заданий</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh]">
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">История пуста</div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">#{task.taskNumber}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{new Date(task.startTime).toLocaleDateString('ru-RU')}</span>
                                <span>{task.totalDuration ? formatTime(task.totalDuration) : '-'}</span>
                              </div>
                            </div>
                            <div className={`text-lg font-semibold ${getEfficiencyColor(task.overallEfficiency)}`}>
                              {task.overallEfficiency?.toFixed(0) || '-'}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Нормы выработки</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Процесс</TableHead>
                        <TableHead className="text-right">Норма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {norms.map((norm) => (
                        <TableRow key={norm.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {stageConfig[norm.stageType].icon}
                              {stageConfig[norm.stageType].label}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {norm.unitsPerHour} {norm.unitName}/ч
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Информация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Имя:</span>
                      <span className="font-medium">{worker?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Роль:</span>
                      <Badge>{worker?.role}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    )
  }

  // Calendar Screen
  return (
    <div className={`min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Хронометраж</h1>
          </div>
          <Badge variant="outline">{worker?.name}</Badge>
        </div>
      </header>

      <main className="container px-4 py-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm text-muted-foreground font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={index} className="aspect-square" />
                }

                const dayData = getDayData(date)
                const isToday = new Date().toDateString() === date.toDateString()
                const isPast = date < new Date() && !isToday

                let bgColor = 'bg-muted/30'
                let textColor = 'text-muted-foreground'
                
                if (dayData) {
                  if (dayData.type === 'WORKING') {
                    bgColor = 'bg-yellow-100 dark:bg-yellow-900/30'
                    textColor = 'text-yellow-800 dark:text-yellow-200'
                  } else if (dayData.type === 'COMPLETED') {
                    bgColor = 'bg-green-100 dark:bg-green-900/30'
                    textColor = 'text-green-800 dark:text-green-200'
                  } else if (dayData.type === 'WEEKEND') {
                    bgColor = 'bg-red-100 dark:bg-red-900/30'
                    textColor = 'text-red-800 dark:text-red-200'
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg ${bgColor} ${textColor} hover:opacity-80 transition-opacity ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <span className="text-sm font-medium">{date.getDate()}</span>
                    {dayData && dayData.type === 'COMPLETED' && dayData.duration && (
                      <span className="text-xs">{formatDurationShort(dayData.duration)}</span>
                    )}
                    {dayData && dayData.type === 'COMPLETED' && dayData.efficiency !== null && (
                      <span className="text-xs">{dayData.efficiency?.toFixed(0)}%</span>
                    )}
                    {dayData && dayData.type === 'WORKING' && (
                      <span className="text-xs">⏳</span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30" />
            <span>Рабочий день</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
            <span>Завершён</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30" />
            <span>Выходной</span>
          </div>
        </div>
      </main>

      {/* Day Selection Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите тип дня</DialogTitle>
            <DialogDescription>{selectedDate && formatDayDate(selectedDate)}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button size="lg" onClick={() => selectedDate && handleStartWorkDay(selectedDate)}>
              <Briefcase className="w-5 h-5 mr-2" />
              Рабочий день
            </Button>
            <Button size="lg" variant="outline" onClick={() => selectedDate && handleMarkWeekend(selectedDate)}>
              <Palmtree className="w-5 h-5 mr-2" />
              Выходной
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDayDialog(false)}>Отмена</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Info Dialog */}
      <Dialog open={!!showDayInfo} onOpenChange={() => setShowDayInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showDayInfo && formatDayDate(showDayInfo.date)}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тип:</span>
              <Badge>{showDayInfo?.type === 'WORKING' ? 'В процессе' : showDayInfo?.type === 'COMPLETED' ? 'Завершён' : 'Выходной'}</Badge>
            </div>
            {showDayInfo?.duration && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Время:</span>
                <span>{formatDurationShort(showDayInfo.duration)}</span>
              </div>
            )}
            {showDayInfo?.efficiency !== null && showDayInfo?.efficiency !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Эффективность:</span>
                <span className={getEfficiencyColor(showDayInfo.efficiency)}>{showDayInfo.efficiency.toFixed(0)}%</span>
              </div>
            )}
            {showDayInfo?.tasks && showDayInfo.tasks.length > 0 && (
              <div className="mt-4">
                <span className="text-muted-foreground text-sm">Задания:</span>
                <div className="mt-2 space-y-2">
                  {showDayInfo.tasks.map((task) => (
                    <div key={task.id} className="flex justify-between text-sm p-2 rounded bg-muted">
                      <span>#{task.taskNumber}</span>
                      <span>{task.totalDuration ? formatTime(task.totalDuration) : '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}