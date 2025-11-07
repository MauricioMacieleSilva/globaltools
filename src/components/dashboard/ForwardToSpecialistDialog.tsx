import React, { useState } from 'react';
import { SpecialistAssignmentDialog } from './SpecialistAssignmentDialog';
import { Lead } from '@/context/PreVendasContext';

interface ForwardToSpecialistDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onForward: (leadId: string, specialistId: string, briefing: string) => Promise<void>;
}

export const ForwardToSpecialistDialog: React.FC<ForwardToSpecialistDialogProps> = ({
  open,
  onClose,
  lead,
  onForward
}) => {
  return (
    <SpecialistAssignmentDialog
      open={open}
      onClose={onClose}
      lead={lead}
      onAssign={onForward}
    />
  );
};