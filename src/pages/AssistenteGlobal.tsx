import React, { useState } from 'react';
import { ZeChat } from '@/components/ze/ZeChat';
import { VoiceInterface } from '@/components/chat/VoiceInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mic } from 'lucide-react';

const AssistenteGlobal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col p-3 sm:p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-auto mb-3 grid w-full max-w-sm grid-cols-2" data-tour="assistente-tabs">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversa
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Por voz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-0 min-h-0 flex-1 overflow-hidden rounded-2xl border bg-background shadow-sm data-[state=inactive]:hidden" data-tour="assistente-chat">
          <ZeChat variant="page" autoFocus />
        </TabsContent>

        <TabsContent value="voice" className="mt-0 flex-1" data-tour="assistente-voice">
          <div className="mx-auto max-w-2xl">
            <VoiceInterface />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistenteGlobal;
