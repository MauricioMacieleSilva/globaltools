import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContextualAIButtonProps {
  onClick: () => void;
  variant?: "default" | "floating";
}

export function ContextualAIButton({ onClick, variant = "floating" }: ContextualAIButtonProps) {
  if (variant === "floating") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onClick}
              size="icon"
              className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Perguntar ao Zé sobre esta página</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button onClick={onClick} variant="outline" size="sm">
      <MessageCircle className="mr-2 h-4 w-4" />
      Perguntar ao Zé
    </Button>
  );
}
