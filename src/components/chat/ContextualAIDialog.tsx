import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageContext } from "@/hooks/useContextualAI";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { AssistantAvatar } from "./AssistantAvatar";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

interface ContextualAIDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext: PageContext | null;
}

const WELCOME_MESSAGE: Message = {
  id: '0',
  content: 'Olá! Estou aqui para ajudar com esta página. O que você gostaria de saber?',
  role: 'assistant',
  timestamp: new Date(),
  status: 'sent'
};

export function ContextualAIDialog({ isOpen, onClose, pageContext }: ContextualAIDialogProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && pageContext) {
      // Reset messages when opening with new context
      setMessages([
        {
          ...WELCOME_MESSAGE,
          content: `Olá! Estou aqui para ajudar com a página de ${pageContext.pageName}. ${pageContext.description || 'O que você gostaria de saber?'}`
        }
      ]);
    }
  }, [isOpen, pageContext]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.role !== 'assistant' || m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('ze-global-chat', {
        body: {
          message: content,
          conversationHistory,
          pageContext
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [
        ...prev.map(m => m.id === userMessage.id ? { ...m, status: 'sent' as const } : m),
        assistantMessage
      ]);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar mensagem');
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, status: 'error' as const } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AssistantAvatar />
              <div>
                <DialogTitle className="text-lg">Zé da Global</DialogTitle>
                {pageContext && (
                  <p className="text-sm text-muted-foreground">
                    Contexto: {pageContext.pageName}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {pageContext && (
              <Card className="p-3 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Contexto ativo</p>
                    <p className="text-muted-foreground mt-1">
                      Tenho acesso aos dados e filtros desta página para respostas mais precisas.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t">
          <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
