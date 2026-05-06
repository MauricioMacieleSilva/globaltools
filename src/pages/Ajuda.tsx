import { useMemo, useState } from 'react';
import { helpArticles, helpModules, type HelpArticle } from '@/content/help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, BookOpen, ChevronRight, Lightbulb, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Ajuda() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HelpArticle>(helpArticles[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpArticles;
    return helpArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.intro.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q) ||
        a.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="lg:w-80 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Central de Ajuda</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild variant="outline" className="w-full gap-2">
          <a href="/manual-global-tools.pdf" download>
            <Download className="h-4 w-4" /> Baixar Manual em PDF
          </a>
        </Button>

        <ScrollArea className="h-[calc(100vh-18rem)] pr-2">
          {helpModules.map((mod) => {
            const items = filtered.filter((a) => a.module === mod);
            if (!items.length) return null;
            return (
              <div key={mod} className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-2">{mod}</p>
                <div className="space-y-1">
                  {items.map((a) => (
                    <button
                      key={a.slug}
                      onClick={() => setSelected(a)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors ${
                        selected.slug === a.slug
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="truncate">{a.title}</span>
                      <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{selected.module}</Badge>
              <CardTitle className="text-2xl">{selected.title}</CardTitle>
            </div>
            <p className="text-muted-foreground pt-2">{selected.intro}</p>
            <p className="text-sm text-muted-foreground"><strong>Quem acessa:</strong> {selected.access}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {selected.screenshot && (
              <img
                src={selected.screenshot}
                alt={selected.title}
                className="w-full rounded-lg border shadow-sm"
              />
            )}

            <section>
              <h3 className="text-lg font-semibold mb-3">Passo a passo</h3>
              <ol className="space-y-3">
                {selected.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {selected.tips && selected.tips.length > 0 && (
              <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h4 className="flex items-center gap-2 font-semibold mb-2 text-blue-900 dark:text-blue-200">
                  <Lightbulb className="h-4 w-4" /> Dicas
                </h4>
                <ul className="text-sm space-y-1 list-disc pl-5 text-blue-900 dark:text-blue-200">
                  {selected.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            {selected.troubleshooting && selected.troubleshooting.length > 0 && (
              <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <h4 className="flex items-center gap-2 font-semibold mb-2 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" /> Erros comuns
                </h4>
                <div className="space-y-2">
                  {selected.troubleshooting.map((t, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-200">{t.problem}</p>
                      <p className="text-amber-800 dark:text-amber-300">{t.solution}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}