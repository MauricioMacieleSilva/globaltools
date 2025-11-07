import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, AlertCircle, AlertTriangle, Info, Lightbulb, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface AINotificationListProps {
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function AINotificationList({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onClose 
}: AINotificationListProps) {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'secondary';
    }
  };

  const handleAction = (notification: any) => {
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
      if (!notification.is_read) {
        onMarkAsRead(notification.id);
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Notificações da IA</h3>
          <p className="text-xs text-muted-foreground">
            Alertas e insights inteligentes
          </p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Marcar todas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Info className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação no momento
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            A IA está monitorando seu sistema
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium leading-tight">
                        {notification.title}
                      </h4>
                      <Badge 
                        variant={getPriorityColor(notification.priority) as any}
                        className="text-xs flex-shrink-0"
                      >
                        {notification.priority}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>

                      {notification.action_url && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(notification);
                          }}
                        >
                          {notification.action_label || 'Ver mais'}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
