import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, FileText, FileSpreadsheet, Film, Download, Eye, Trash2, GraduationCap, Calendar, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Treinamento {
  id: string
  titulo: string
  descricao: string | null
  categoria: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number | null
  thumbnail_url: string | null
  created_by: string | null
  created_at: string
  is_active: boolean
}

const CATEGORIAS = ['Geral', 'Comercial', 'Operacional', 'Segurança', 'Qualidade', 'Processos']

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
  if (fileType.includes('presentation') || fileType.includes('pptx') || fileType.includes('ppt')) return <FileSpreadsheet className="h-8 w-8 text-orange-500" />
  if (fileType.includes('video')) return <Film className="h-8 w-8 text-blue-500" />
  return <FileText className="h-8 w-8 text-muted-foreground" />
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Treinamentos() {
  const { user } = useAuth()
  const { isAdmin } = useUserPermissions()
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [filterCategoria, setFilterCategoria] = useState<string>('todas')

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Geral')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)

  const fetchTreinamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('treinamentos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTreinamentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar treinamentos:', err)
      toast.error('Erro ao carregar treinamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTreinamentos()
  }, [])

  const handleUpload = async () => {
    if (!arquivo || !titulo.trim()) {
      toast.error('Preencha o título e selecione um arquivo')
      return
    }

    setUploading(true)
    try {
      const fileExt = arquivo.name.split('.').pop()
      const filePath = `${Date.now()}_${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, arquivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath)

      let thumbnailPublicUrl: string | null = null
      if (thumbnail) {
        const thumbPath = `thumbs/${Date.now()}_${thumbnail.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: thumbError } = await supabase.storage
          .from('treinamentos')
          .upload(thumbPath, thumbnail)
        if (!thumbError) {
          thumbnailPublicUrl = supabase.storage.from('treinamentos').getPublicUrl(thumbPath).data.publicUrl
        }
      }

      const { error: insertError } = await supabase
        .from('treinamentos')
        .insert({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          categoria,
          file_url: publicUrl,
          file_name: arquivo.name,
          file_type: arquivo.type || fileExt || 'unknown',
          file_size: arquivo.size,
          thumbnail_url: thumbnailPublicUrl,
          created_by: user?.id,
        })

      if (insertError) throw insertError

      toast.success('Treinamento adicionado com sucesso!')
      setUploadOpen(false)
      resetForm()
      fetchTreinamentos()
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err)
      toast.error(err.message || 'Erro ao fazer upload do treinamento')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (treinamento: Treinamento) => {
    if (!confirm(`Deseja realmente excluir "${treinamento.titulo}"?`)) return

    try {
      const { error } = await supabase
        .from('treinamentos')
        .update({ is_active: false })
        .eq('id', treinamento.id)

      if (error) throw error
      toast.success('Treinamento removido')
      fetchTreinamentos()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast.error('Erro ao excluir treinamento')
    }
  }

  const handleOpen = (treinamento: Treinamento) => {
    const isPdf = treinamento.file_type.includes('pdf')
    if (isPdf) {
      setViewerUrl(treinamento.file_url)
      setViewerTitle(treinamento.titulo)
      setViewerOpen(true)
    } else {
      window.open(treinamento.file_url, '_blank')
    }
  }

  const resetForm = () => {
    setTitulo('')
    setDescricao('')
    setCategoria('Geral')
    setArquivo(null)
    setThumbnail(null)
  }

  const filteredTreinamentos = filterCategoria === 'todas'
    ? treinamentos
    : treinamentos.filter(t => t.categoria === filterCategoria)

  const categorias = [...new Set(treinamentos.map(t => t.categoria))]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Treinamentos</h2>
            <p className="text-sm text-muted-foreground">Materiais de capacitação e treinamento</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Treinamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Treinamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="titulo">Título *</Label>
                    <Input id="titulo" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nome do treinamento" maxLength={200} />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea id="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição breve do conteúdo" maxLength={500} rows={3} />
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="arquivo">Arquivo *</Label>
                    <div className="mt-1">
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {arquivo ? arquivo.name : 'Selecionar arquivo (PDF, PPT, vídeo...)'}
                        </span>
                        <input
                          id="arquivo"
                          type="file"
                          className="hidden"
                          accept=".pdf,.ppt,.pptx,.mp4,.mov,.avi,.doc,.docx,.xls,.xlsx"
                          onChange={e => setArquivo(e.target.files?.[0] || null)}
                        />
                      </label>
                      {arquivo && (
                        <p className="text-xs text-muted-foreground mt-1">{formatFileSize(arquivo.size)}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="thumbnail">Capa / Primeira Página (imagem)</Label>
                    <div className="mt-1">
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {thumbnail ? thumbnail.name : 'Selecionar imagem de capa (opcional)'}
                        </span>
                        <input
                          id="thumbnail"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={e => setThumbnail(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={uploading || !titulo.trim() || !arquivo} className="w-full">
                    {uploading ? 'Enviando...' : 'Adicionar Treinamento'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-40" />
            </Card>
          ))}
        </div>
      ) : filteredTreinamentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhum treinamento encontrado</p>
            <p className="text-sm">
              {isAdmin ? 'Clique em "Novo Treinamento" para adicionar o primeiro.' : 'Nenhum material disponível no momento.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTreinamentos.map(treinamento => (
            <Card key={treinamento.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpen(treinamento)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    {getFileIcon(treinamento.file_type)}
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight line-clamp-2">{treinamento.titulo}</CardTitle>
                      {treinamento.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{treinamento.descricao}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{treinamento.categoria}</Badge>
                    {treinamento.file_size && (
                      <span className="text-xs text-muted-foreground">{formatFileSize(treinamento.file_size)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {treinamento.file_type.includes('pdf') ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); handleOpen(treinamento) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); window.open(treinamento.file_url, '_blank') }}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); handleDelete(treinamento) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(treinamento.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewerTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <iframe
              src={viewerUrl}
              className="w-full h-full rounded-md border"
              title={viewerTitle}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
