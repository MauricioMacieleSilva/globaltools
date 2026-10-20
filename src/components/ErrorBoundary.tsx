import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Erro capturado:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Detalhes do erro:', error, errorInfo);

    // Detect chunk load errors (dynamic import failures due to new deploys)
    // Only reload ONCE to avoid infinite loops
    const errorMsg = (error && error.message) ? error.message.toLowerCase() : '';
    const isChunkError = errorMsg.includes('failed to fetch') ||
                         errorMsg.includes('dynamically imported') ||
                         errorMsg.includes('importing a module script failed') ||
                         errorMsg.includes('chunkloaderror');

    if (isChunkError) {
      const RELOAD_KEY = 'chunk-error-reload';
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        console.warn('[ErrorBoundary] Chunk error detectado. Recarregando pagina uma vez...');
        window.location.reload();
      } else {
        sessionStorage.removeItem(RELOAD_KEY);
        console.warn('[ErrorBoundary] Chunk error persiste apos reload. Exibindo erro.');
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Ops! Algo deu errado neste componente.
                {this.state.error && this.state.error.message && (
                  <div className="text-xs mt-1 opacity-70">
                    {this.state.error.message}
                  </div>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="ml-2"
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
