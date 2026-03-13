import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VendorGoal {
  vendor_id: string;
  vendor_name: string;
  avatar_url: string | null;
  daily_contacts_goal: number;
  daily_visits_goal: number;
  daily_proposals_goal: number;
  daily_orders_goal: number;
}

export function VendorGoalsManagement() {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [vendorGoals, setVendorGoals] = useState<VendorGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const monthOptions = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = -3; i <= 11; i++) {
      const d = i < 0 ? addMonths(now, Math.abs(i)) : i === 0 ? now : subMonths(now, i);
      months.push({
        value: format(i < 0 ? addMonths(now, Math.abs(i)) : i === 0 ? now : subMonths(now, i), 'yyyy-MM'),
        label: format(i < 0 ? addMonths(now, Math.abs(i)) : i === 0 ? now : subMonths(now, i), 'MMMM yyyy', { locale: ptBR }),
      });
    }
    // Sort future first, then current, then past
    return months.sort((a, b) => b.value.localeCompare(a.value)).reverse();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load vendors
      const { data: vendors } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url');

      // Load existing goals for the month
      const { data: goals } = await (supabase as any)
        .from('crm_vendor_goals')
        .select('*')
        .eq('month_year', selectedMonth);

      const goalsMap = new Map((goals || []).map((g: any) => [g.vendor_id, g]));

      const vendorGoalsList: VendorGoal[] = (vendors || []).map(v => {
        const existing = goalsMap.get(v.id) as any;
        return {
          vendor_id: v.id,
          vendor_name: v.full_name,
          avatar_url: v.avatar_url,
          daily_contacts_goal: existing?.daily_contacts_goal || 0,
          daily_visits_goal: existing?.daily_visits_goal || 0,
          daily_proposals_goal: existing?.daily_proposals_goal || 0,
          daily_orders_goal: existing?.daily_orders_goal || 0,
        };
      });

      setVendorGoals(vendorGoalsList);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateGoal = (vendorId: string, field: keyof VendorGoal, value: number) => {
    setVendorGoals(prev =>
      prev.map(v => v.vendor_id === vendorId ? { ...v, [field]: value } : v)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only save vendors that have at least one goal set
      const goalsToSave = vendorGoals.filter(
        v => v.daily_contacts_goal > 0 || v.daily_visits_goal > 0 || v.daily_proposals_goal > 0 || v.daily_orders_goal > 0
      );

      for (const goal of goalsToSave) {
        await (supabase as any)
          .from('crm_vendor_goals')
          .upsert({
            vendor_id: goal.vendor_id,
            month_year: selectedMonth,
            daily_contacts_goal: goal.daily_contacts_goal,
            daily_visits_goal: goal.daily_visits_goal,
            daily_proposals_goal: goal.daily_proposals_goal,
            daily_orders_goal: goal.daily_orders_goal,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'vendor_id,month_year' });
      }

      toast.success('Metas por vendedor salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSaving(false);
    }
  };

  const formatFirstName = (name: string) => {
    const first = name.split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Metas Diárias por Vendedor
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Defina metas diárias de contatos, visitas, propostas e pedidos para cada vendedor
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs gap-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[180px]">Vendedor</TableHead>
                  <TableHead className="text-xs text-center">Contatos/dia</TableHead>
                  <TableHead className="text-xs text-center">Visitas/dia</TableHead>
                  <TableHead className="text-xs text-center">Propostas/dia</TableHead>
                  <TableHead className="text-xs text-center">Pedidos/dia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorGoals.map(vendor => (
                  <TableRow key={vendor.vendor_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={vendor.avatar_url || ''} />
                          <AvatarFallback className="text-[8px] bg-muted">
                            {vendor.vendor_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{formatFirstName(vendor.vendor_name)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={vendor.daily_contacts_goal || ''}
                        onChange={e => updateGoal(vendor.vendor_id, 'daily_contacts_goal', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs text-center w-16 mx-auto"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={vendor.daily_visits_goal || ''}
                        onChange={e => updateGoal(vendor.vendor_id, 'daily_visits_goal', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs text-center w-16 mx-auto"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={vendor.daily_proposals_goal || ''}
                        onChange={e => updateGoal(vendor.vendor_id, 'daily_proposals_goal', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs text-center w-16 mx-auto"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={vendor.daily_orders_goal || ''}
                        onChange={e => updateGoal(vendor.vendor_id, 'daily_orders_goal', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs text-center w-16 mx-auto"
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
