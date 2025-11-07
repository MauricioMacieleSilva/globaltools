
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { AssistantAvatar } from './AssistantAvatar';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  content: 'Oi! Sou o Zé da Global 👋 Como posso te ajudar hoje?',
  role: 'assistant',
  timestamp: new Date(),
  status: 'sent'
};

const SUGGESTED_QUESTIONS = [
  "Quais produtos vocês têm?",
  "Como funciona o corte?",
  "Preciso de um orçamento"
];

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Preparar histórico de conversação (últimas 10 mensagens)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Enviar mensagem para a Edge Function do Zé da Global com histórico
      const { data, error } = await supabase.functions.invoke('ze-global-chat', {
        body: { 
          message: content,
          conversationHistory
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const responseData = data;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseData.message || responseData.response || 'Desculpe, não consegui processar sua pergunta.',
        role: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const clearHistory = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col shadow-lg border-0 bg-gradient-card">
        <CardHeader className="border-b bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AssistantAvatar />
              <div>
                <CardTitle className="text-primary text-lg">Zé da Global</CardTitle>
                <p className="text-sm text-muted-foreground">Assistente de Conhecimento Organizacional</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isLoading && <TypingIndicator />}
            
            {messages.length === 1 && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">Sugestões para começar:</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left justify-start h-auto p-3 whitespace-normal"
                      onClick={() => handleSuggestionClick(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
