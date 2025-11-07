import React, { useState } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { VoiceInterface } from '@/components/chat/VoiceInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mic } from 'lucide-react';

const AssistenteGlobal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Assistente Zé da Global</h1>
        <p className="text-muted-foreground">Converse por texto ou voz com seu assistente de IA</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat de Texto
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Conversa por Voz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex-1 flex flex-col mt-0">
          <ChatInterface />
        </TabsContent>

        <TabsContent value="voice" className="flex-1 mt-0">
          <div className="max-w-2xl mx-auto">
            <VoiceInterface />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistenteGlobal;
