import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";

type LeadSource = {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number | null;
};

type BusinessSector = {
  id: string;
  name: string;
  is_active: boolean;
};

type LossReason = {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number | null;
  is_definitive: boolean;
};

type EditKind = "lead_source" | "business_sector" | "loss_reason";

function normalizeName(value: string) {
  return value.trim();
}

export function LeadOrigemRamoConfig() {
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [sectors, setSectors] = useState<BusinessSector[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);

  const [edit, setEdit] = useState<{
    open: boolean;
    kind: EditKind;
    item: LeadSource | BusinessSector | null;
  }>({ open: false, kind: "lead_source", item: null });

  const [form, setForm] = useState({
    name: "",
    is_active: true,
    display_order: 0,
    is_definitive: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    if (edit.kind === "lead_source") return edit.item ? "Editar origem" : "Adicionar origem";
    if (edit.kind === "loss_reason") return edit.item ? "Editar motivo de perda" : "Adicionar motivo de perda";
    return edit.item ? "Editar ramo" : "Adicionar ramo";
  }, [edit.kind, edit.item]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [srcRes, secRes, lrRes] = await Promise.all([
        (supabase as any)
          .from("crm_lead_sources")
          .select("id, name, is_active, display_order")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        (supabase as any)
          .from("crm_business_sectors")
          .select("id, name, is_active")
          .order("name", { ascending: true }),
        (supabase as any)
          .from("crm_loss_reasons")
          .select("id, name, is_active, display_order, is_definitive")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (srcRes.error) throw srcRes.error;
      if (secRes.error) throw secRes.error;
      if (lrRes.error) throw lrRes.error;

      setSources(srcRes.data || []);
      setSectors(secRes.data || []);
      setLossReasons(lrRes.data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao carregar listas", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!edit.open) return;

    if (edit.kind === "lead_source" || edit.kind === "loss_reason") {
      const item = edit.item as LeadSource | LossReason | null;
      setForm({
        name: item?.name ?? "",
        is_active: item?.is_active ?? true,
        display_order: item?.display_order ?? 0,
        is_definitive: edit.kind === "loss_reason" ? ((item as LossReason | null)?.is_definitive ?? false) : false,
      });
    } else {
      const item = edit.item as BusinessSector | null;
      setForm({
        name: item?.name ?? "",
        is_active: item?.is_active ?? true,
        display_order: 0,
        is_definitive: false,
      });
    }
  }, [edit.open, edit.kind, edit.item]);

  const openCreate = (kind: EditKind) => setEdit({ open: true, kind, item: null });
  const openEdit = (kind: EditKind, item: any) => setEdit({ open: true, kind, item });

  const handleDelete = async (kind: EditKind, id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      const table = kind === "lead_source" ? "crm_lead_sources" : kind === "loss_reason" ? "crm_loss_reasons" : "crm_business_sectors";
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success("Item excluído");
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao excluir", { description: e?.message });
    }
  };

  const handleToggleActive = async (kind: EditKind, id: string, current: boolean) => {
    try {
      const table = kind === "lead_source" ? "crm_lead_sources" : kind === "loss_reason" ? "crm_loss_reasons" : "crm_business_sectors";
      const { error } = await (supabase as any).from(table).update({ is_active: !current }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado");
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar status", { description: e?.message });
    }
  };

  const handleSave = async () => {
    const name = normalizeName(form.name);
    if (!name) return toast.error("Informe um nome");

    setSubmitting(true);
    try {
      if (edit.kind === "lead_source" || edit.kind === "loss_reason") {
        const table = edit.kind === "lead_source" ? "crm_lead_sources" : "crm_loss_reasons";
        const label = edit.kind === "lead_source" ? "Origem" : "Motivo de perda";
        const payload: Record<string, any> = {
          name,
          is_active: form.is_active,
          display_order: Number.isFinite(form.display_order) ? form.display_order : 0,
        };
        if (edit.kind === "loss_reason") {
          payload.is_definitive = form.is_definitive;
        }

        if (edit.item) {
          const { error } = await (supabase as any).from(table).update(payload).eq("id", edit.item.id);
          if (error) throw error;
          toast.success(`${label} atualizado(a)`);
        } else {
          const { error } = await (supabase as any).from(table).insert(payload);
          if (error) throw error;
          toast.success(`${label} adicionado(a)`);
        }
      } else {
        const payload = {
          name,
          is_active: form.is_active,
        };

        if (edit.item) {
          const { error } = await (supabase as any)
            .from("crm_business_sectors")
            .update(payload)
            .eq("id", (edit.item as BusinessSector).id);
          if (error) throw error;
          toast.success("Ramo atualizado");
        } else {
          const { error } = await (supabase as any).from("crm_business_sectors").insert(payload);
          if (error) throw error;
          toast.success("Ramo adicionado");
        }
      }

      setEdit(e => ({ ...e, open: false }));
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Listas do CRM</CardTitle>
          <CardDescription>
            Gerencie as opções disponíveis nos campos <strong>Origem</strong>, <strong>Ramo de atuação</strong> e <strong>Motivos de Perda</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Origens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Origens</h3>
                <p className="text-xs text-muted-foreground">(tabela crm_lead_sources)</p>
              </div>
              <Button size="sm" onClick={() => openCreate("lead_source")}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm text-muted-foreground">{s.display_order ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit("lead_source", s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive("lead_source", s.id, s.is_active)}
                        >
                          {s.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete("lead_source", s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Ramos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Ramo de atuação</h3>
                <p className="text-xs text-muted-foreground">(tabela crm_business_sectors)</p>
              </div>
              <Button size="sm" onClick={() => openCreate("business_sector")}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit("business_sector", s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive("business_sector", s.id, s.is_active)}
                        >
                          {s.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete("business_sector", s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Motivos de Perda */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Motivos de Perda</h3>
                <p className="text-xs text-muted-foreground">(tabela crm_loss_reasons)</p>
              </div>
              <Button size="sm" onClick={() => openCreate("loss_reason")}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lossReasons.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">{r.display_order ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit("loss_reason", r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive("loss_reason", r.id, r.is_active)}
                        >
                          {r.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete("loss_reason", r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={edit.open} onOpenChange={(open) => setEdit(e => ({ ...e, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {(edit.kind === "lead_source" || edit.kind === "loss_reason") && (
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  min={0}
                  onChange={(e) => setForm(f => ({ ...f, display_order: parseInt(e.target.value || "0", 10) }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Controla se aparece nas opções do CRM</div>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(e => ({ ...e, open: false }))}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
