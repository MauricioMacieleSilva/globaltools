import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeVoiceChat } from '@/utils/RealtimeVoice';

interface VoiceInterfaceProps {
  onTranscript?: (text: string, isUser: boolean) => void;
}

export function VoiceInterface({ onTranscript }: VoiceInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatRef = useRef<RealtimeVoiceChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Voice event:', event.type);
    
    switch (event.type) {
      case 'session.created':
        console.log('Session created');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (onTranscript && event.transcript) {
          onTranscript(event.transcript, true);
        }
        break;
        
      case 'response.audio_transcript.delta':
        if (onTranscript && event.delta) {
          onTranscript(event.delta, false);
        }
        break;
        
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
        
      case 'error':
        console.error('Voice error:', event.error);
        toast.error('Erro na comunicação de voz');
        break;
    }
  };

  const handleError = (error: Error) => {
    console.error('Voice interface error:', error);
    toast.error('Erro ao conectar interface de voz');
    setIsConnected(false);
    setIsConnecting(false);
  };

  const startConversation = async () => {
    setIsConnecting(true);
    try {
      chatRef.current = new RealtimeVoiceChat(handleMessage, handleError);
      await chatRef.current.init();
      setIsConnected(true);
      
      toast.success('Interface de voz conectada');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar conversa');
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);
    
    toast.info('Interface de voz desconectada');
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          }`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        
        <div className="flex gap-2">
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Ouvindo...</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Falando...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        {!isConnected ? (
          <Button
            onClick={startConversation}
            disabled={isConnecting}
            size="lg"
            className="w-full max-w-xs"
          >
            {isConnecting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Conectando...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Iniciar Conversa por Voz
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="w-full max-w-xs"
          >
            <MicOff className="mr-2 h-5 w-5" />
            Encerrar Conversa
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>💡 Fale naturalmente com o Zé da Global</p>
        <p>🎤 O microfone será ativado automaticamente</p>
      </div>
    </Card>
  );
}
