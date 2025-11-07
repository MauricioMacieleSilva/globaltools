import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function WhatsAppButton({ 
  phoneNumber, 
  message = "", 
  size = "sm", 
  variant = "outline",
  className 
}: WhatsAppButtonProps) {
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it starts with 0, remove it
    const withoutLeadingZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
    
    // If it doesn't start with 55 (Brazil country code), add it
    if (!withoutLeadingZero.startsWith('55')) {
      return `55${withoutLeadingZero}`;
    }
    
    return withoutLeadingZero;
  };

  const handleWhatsAppClick = () => {
    if (!phoneNumber) return;
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (!phoneNumber) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppClick}
      className={cn("text-green-600 hover:text-green-700 hover:bg-green-50", className)}
      title={`Chamar ${phoneNumber} no WhatsApp`}
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}