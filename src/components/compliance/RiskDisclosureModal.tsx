import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Shield } from 'lucide-react';
import { RISK_DISCLAIMERS } from '@/lib/complianceEnforcement';

interface RiskDisclosureModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  context?: 'strategy' | 'trading' | 'leverage';
}

export function RiskDisclosureModal({
  open,
  onAccept,
  onDecline,
  context = 'trading',
}: RiskDisclosureModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [understoodRisk, setUnderstoodRisk] = useState(false);
  const [notAdvice, setNotAdvice] = useState(false);

  const canProceed = acknowledged && understoodRisk && notAdvice;

  const handleAccept = () => {
    if (canProceed) {
      onAccept();
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case 'strategy':
        return 'Strategy Activation Risk Disclosure';
      case 'leverage':
        return 'Leverage Trading Risk Disclosure';
      default:
        return 'Trading Risk Disclosure';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {getContextTitle()}
          </DialogTitle>
          <DialogDescription>
            Please read and acknowledge the following risk disclosure before proceeding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="font-semibold text-destructive mb-2">⚠️ Risk Warning</p>
              <p className="text-muted-foreground leading-relaxed">
                {RISK_DISCLAIMERS.fullDisclaimer}
              </p>
            </div>

            {context === 'leverage' && (
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="font-medium text-warning-foreground">
                  {RISK_DISCLAIMERS.leverageWarning}
                </p>
              </div>
            )}

            {context === 'strategy' && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  {RISK_DISCLAIMERS.strategyReturn}
                </p>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {RISK_DISCLAIMERS.regulatoryNotice}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-3 py-4 border-t">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <span className="text-sm leading-tight">
              I have read and understood the risk disclosure above
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={understoodRisk}
              onCheckedChange={(checked) => setUnderstoodRisk(checked === true)}
            />
            <span className="text-sm leading-tight">
              I understand that I may lose some or all of my invested capital
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={notAdvice}
              onCheckedChange={(checked) => setNotAdvice(checked === true)}
            />
            <span className="text-sm leading-tight">
              I understand this is not financial advice and I am trading at my own risk
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!canProceed}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            I Accept the Risks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
