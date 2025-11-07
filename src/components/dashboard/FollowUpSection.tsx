import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, List, Plus, Check, X, Clock, Filter, Search, CalendarDays, CalendarRange, CalendarClock, User } from 'lucide-react';
import { useFollowUps, FollowUpType } from '@/hooks/useFollowUps';
import { useIsMobile } from '@/hooks/use-mobile';
import { FollowUpDialog } from './FollowUpDialog';
import { FollowUpTableMobile } from './FollowUpTableMobile';

const followUpTypeLabels: Record<FollowUpType, string> = {
  reativar_cliente: "Reativar cliente",
  ligar_followup: "Ligar para follow-up",
  enviar_material: "Enviar material",
  reforcar_proposta: "Reforçar proposta",
  ajustar_proposta: "Ajustar proposta",
  agendar_reuniao: "Agendar reunião",
  agendar_visita: "Agendar visita",
  cobrar_retorno: "Cobrar retorno",
  enviar_novo_orcamento: "Enviar novo orçamento",
  checar_status_decisao: "Checar status da decisão",
  agendar_nova_tentativa: "Agendar nova tentativa",
  solicitar_documentos: "Solicitar documentos",
  reabrir_negociacao_futura: "Reabrir negociação futura",
  outro: "Outro",
};

const followUpTypeColors: Record<FollowUpType, string> = {
  reativar_cliente: "bg-red-100 text-red-800",
  ligar_followup: "bg-blue-100 text-blue-800",
  enviar_material: "bg-purple-100 text-purple-800",
  reforcar_proposta: "bg-green-100 text-green-800",
  ajustar_proposta: "bg-orange-100 text-orange-800",
  agendar_reuniao: "bg-indigo-100 text-indigo-800",
  agendar_visita: "bg-pink-100 text-pink-800",
  cobrar_retorno: "bg-yellow-100 text-yellow-800",
  enviar_novo_orcamento: "bg-teal-100 text-teal-800",
  checar_status_decisao: "bg-cyan-100 text-cyan-800",
  agendar_nova_tentativa: "bg-amber-100 text-amber-800",
  solicitar_documentos: "bg-lime-100 text-lime-800",
  reabrir_negociacao_futura: "bg-gray-100 text-gray-800",
  outro: "bg-slate-100 text-slate-800",
};

export function FollowUpSection() {
  const { followUps, loading, markAsCompleted, deleteFollowUp } = useFollowUps();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<FollowUpType | 'all'>('all');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [followUpToDelete, setFollowUpToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [followUpDetailOpen, setFollowUpDetailOpen] = useState(false);

  // Filter follow-ups
  const filteredFollowUps = useMemo(() => {
    return followUps.filter(followUp => {
      const matchesSearch = !searchTerm.trim() || 
        followUp.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (followUp.budget_number && followUp.budget_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (followUp.client_name && followUp.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'pending' && !followUp.is_completed) ||
        (statusFilter === 'completed' && followUp.is_completed);
      
      const matchesType = typeFilter === 'all' || followUp.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [followUps, searchTerm, statusFilter, typeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = followUps.length;
    const pending = followUps.filter(f => !f.is_completed).length;
    const completed = followUps.filter(f => f.is_completed).length;
    const today = followUps.filter(f => {
      const today = new Date();
      const followUpDate = new Date(f.scheduled_date);
      return followUpDate.toDateString() === today.toDateString() && !f.is_completed;
    }).length;
    const thisWeek = followUps.filter(f => {
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const followUpDate = new Date(f.scheduled_date);
      return followUpDate >= weekStart && followUpDate < weekEnd && !f.is_completed;
    }).length;

    return { total, pending, completed, today, thisWeek };
  }, [followUps]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('pt-BR')
    };
  };

  const isOverdue = (dateString: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    return new Date(dateString) < new Date();
  };

  const handleDeleteFollowUp = (id: string) => {
    setFollowUpToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (showDeleteDialog) {
      await deleteFollowUp(showDeleteDialog);
      setShowDeleteDialog(null);
    }
    if (followUpToDelete) {
      await deleteFollowUp(followUpToDelete);
      setFollowUpToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Calendar view components
  const CalendarView = () => {
    const today = new Date();
    
    // Group follow-ups by date
    const followUpsByDate = useMemo(() => {
      const grouped: Record<string, typeof filteredFollowUps> = {};
      
      filteredFollowUps.forEach(followUp => {
        const date = new Date(followUp.scheduled_date).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(followUp);
      });
      
      return grouped;
    }, [filteredFollowUps]);

    if (calendarView === 'month') {
      return <MonthView followUpsByDate={followUpsByDate} today={today} />;
    } else {
      return <WeekView followUpsByDate={followUpsByDate} today={today} />;
    }
  };

  const MonthView = ({ followUpsByDate, today }: { followUpsByDate: Record<string, typeof filteredFollowUps>, today: Date }) => {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endOfMonth || currentDate.getDay() !== 0) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            const dayKey = day.toDateString();
            const dayFollowUps = followUpsByDate[dayKey] || [];
            const isCurrentMonth = day.getMonth() === today.getMonth();
            const isToday = day.toDateString() === today.toDateString();
            
            return (
              <div 
                key={index} 
                className={`min-h-20 p-1 border border-border ${
                  !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
                } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
              >
                <div className="text-sm font-medium mb-1">
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayFollowUps.slice(0, 2).map(followUp => (
                    <div 
                      key={followUp.id} 
                      className="text-xs p-1 rounded bg-primary/20 text-primary truncate cursor-pointer hover:bg-primary/30 transition-colors"
                      title={`${followUp.client_name || 'Cliente não informado'} - ${followUp.subject}`}
                      onClick={() => {
                        setSelectedFollowUp(followUp);
                        setFollowUpDetailOpen(true);
                      }}
                    >
                      {followUp.client_name || 'Cliente'}
                    </div>
                  ))}
                  {dayFollowUps.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayFollowUps.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const WeekView = ({ followUpsByDate, today }: { followUpsByDate: Record<string, typeof filteredFollowUps>, today: Date }) => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            Semana de {startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a{' '}
            {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayKey = day.toDateString();
            const dayFollowUps = followUpsByDate[dayKey] || [];
            const isToday = day.toDateString() === today.toDateString();
            
            return (
              <div key={index} className={`space-y-2 p-3 border rounded-lg ${isToday ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className="text-lg">{day.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {dayFollowUps.map(followUp => {
                    const time = new Date(followUp.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={followUp.id} 
                        className="text-xs p-2 rounded bg-background border cursor-pointer hover:bg-muted transition-colors"
                        title={followUp.subject}
                        onClick={() => {
                          setSelectedFollowUp(followUp);
                          setFollowUpDetailOpen(true);
                        }}
                      >
                        <div className="font-medium truncate">{time}</div>
                        <div className="truncate">{followUp.client_name || 'Cliente'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const DayView = ({ followUpsByDate, today }: { followUpsByDate: Record<string, typeof filteredFollowUps>, today: Date }) => {
    const todayKey = today.toDateString();
    const todayFollowUps = followUpsByDate[todayKey] || [];
    
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {hours.map(hour => {
            const hourFollowUps = todayFollowUps.filter(followUp => {
              const followUpHour = new Date(followUp.scheduled_date).getHours();
              return followUpHour === hour;
            });
            
            return (
              <div key={hour} className="flex border-b">
                <div className="w-16 p-2 text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {hourFollowUps.map(followUp => {
                    const time = new Date(followUp.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={followUp.id} className="p-2 bg-primary/10 rounded border-l-2 border-primary">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{time} - {followUp.client_name || 'Cliente'}</div>
                            <div className="text-xs text-muted-foreground">{followUp.subject}</div>
                          </div>
                          <Badge className={followUpTypeColors[followUp.type]} variant="secondary">
                            {followUpTypeLabels[followUp.type]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600">{stats.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(value: 'list' | 'calendar') => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agenda
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Calendar View Options */}
          {viewMode === 'calendar' && (
            <Select value={calendarView} onValueChange={(value: 'month' | 'week') => setCalendarView(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Mensal
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    Semanal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por cliente, pedido ou assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'completed') => setStatusFilter(value)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value: FollowUpType | 'all') => setTypeFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(followUpTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setFollowUpDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Follow-up
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            {isMobile ? (
              <div className="p-4">
                <FollowUpTableMobile
                  followUps={filteredFollowUps}
                  onMarkComplete={markAsCompleted}
                  onDelete={handleDeleteFollowUp}
                  onViewDetails={(followUp) => {
                    setSelectedFollowUp(followUp);
                    setFollowUpDetailOpen(true);
                  }}
                  followUpTypeLabels={followUpTypeLabels}
                  followUpTypeColors={followUpTypeColors}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowUps.map((followUp) => {
                    const { date, time } = formatDateTime(followUp.scheduled_date);
                    const overdue = isOverdue(followUp.scheduled_date, followUp.is_completed);

                    return (
                      <TableRow key={followUp.id} className={overdue ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{followUp.client_name || '-'}</TableCell>
                        <TableCell className="font-medium">{followUp.budget_number || '-'}</TableCell>
                        <TableCell>
                          <Badge className={followUpTypeColors[followUp.type]}>
                            {followUpTypeLabels[followUp.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={followUp.subject}>
                          {followUp.subject}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className={overdue ? 'text-red-600 font-medium' : ''}>{date}</div>
                            <div className="text-muted-foreground">{time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {followUp.is_completed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Concluído
                            </Badge>
                          ) : overdue ? (
                            <Badge variant="destructive">
                              Atrasado
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {followUp.user_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!followUp.is_completed && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsCompleted(followUp.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteFollowUp(followUp.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredFollowUps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {followUps.length === 0 
                          ? "Nenhum follow-up criado ainda."
                          : "Nenhum follow-up encontrado com os filtros aplicados."
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <CalendarView />
          </CardContent>
        </Card>
      )}

      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        budgetNumber=""
        clientName=""
        searchBy="leads"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este follow-up? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Follow-up Detail Dialog */}
      <Dialog open={followUpDetailOpen} onOpenChange={setFollowUpDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalhes do Follow-up
            </DialogTitle>
          </DialogHeader>
          
          {selectedFollowUp && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={followUpTypeColors[selectedFollowUp.type]}>
                    {selectedFollowUp.type === "outro" && selectedFollowUp.custom_type_text 
                      ? selectedFollowUp.custom_type_text
                      : followUpTypeLabels[selectedFollowUp.type]
                    }
                  </Badge>
                  {selectedFollowUp.is_completed && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Concluído
                    </Badge>
                  )}
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Cliente</div>
                  <div className="text-sm">{selectedFollowUp.client_name || 'Não informado'}</div>
                </div>
                
                {selectedFollowUp.budget_number && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Pedido</div>
                    <div className="text-sm">{selectedFollowUp.budget_number}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Assunto</div>
                  <div className="text-sm">{selectedFollowUp.subject}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Data e Hora</div>
                  <div className="text-sm">
                    {new Date(selectedFollowUp.scheduled_date).toLocaleString('pt-BR')}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Criado por</div>
                  <div className="text-sm">{selectedFollowUp.user_name}</div>
                </div>
              </div>
              
              {!selectedFollowUp.is_completed && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await markAsCompleted(selectedFollowUp.id);
                      setFollowUpDetailOpen(false);
                    }}
                    className="flex-1"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Marcar como Concluído
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFollowUpToDelete(selectedFollowUp.id);
                      setDeleteDialogOpen(true);
                      setFollowUpDetailOpen(false);
                    }}
                    className="text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}