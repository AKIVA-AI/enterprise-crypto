/**
 * Regulatory Warning Component
 * 
 * Displays warnings for exchanges that are not available in certain jurisdictions.
 * Helps users understand compliance requirements.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ExchangeType, EXCHANGE_CONFIGS } from '@/components/ui/exchange-badge';

interface RegulatoryWarningProps {
  userLocation?: 'US' | 'INTERNATIONAL';
  configuredExchanges: ExchangeType[];
}

export function RegulatoryWarning({
  userLocation = 'US',
  configuredExchanges,
}: RegulatoryWarningProps) {
  const restrictedExchanges = configuredExchanges.filter(
    exchange => !EXCHANGE_CONFIGS[exchange].usCompliant
  );

  const compliantExchanges = configuredExchanges.filter(
    exchange => EXCHANGE_CONFIGS[exchange].usCompliant
  );

  if (userLocation !== 'US' || restrictedExchanges.length === 0) {
    return null;
  }

  return (
    <Alert className="border-warning/50 bg-warning/5">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">Regulatory Notice</AlertTitle>
      <AlertDescription className="text-warning">
        <p className="mb-3">
          Based on your location (United States), the following exchanges are not available:
        </p>
        
        <div className="space-y-2 mb-3">
          {restrictedExchanges.map(exchange => {
            const config = EXCHANGE_CONFIGS[exchange];
            return (
              <div key={exchange} className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="font-medium">{config.name}</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  ❌ Not available in US
                </Badge>
              </div>
            );
          })}
        </div>

        {compliantExchanges.length > 0 && (
          <>
            <p className="mb-2 font-medium">✅ Available exchanges for US users:</p>
            <div className="space-y-1">
              {compliantExchanges.map(exchange => {
                const config = EXCHANGE_CONFIGS[exchange];
                return (
                  <div key={exchange} className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-3 text-sm">
          💡 If you're traveling or using a VPN, you can temporarily disable restricted exchanges in your settings.
        </p>
      </AlertDescription>
    </Alert>
  );
}

interface ExchangeCardWarningProps {
  exchange: ExchangeType;
  userLocation?: 'US' | 'INTERNATIONAL';
}

export function ExchangeCardWarning({
  exchange,
  userLocation = 'US',
}: ExchangeCardWarningProps) {
  const config = EXCHANGE_CONFIGS[exchange];

  if (userLocation !== 'US' || config.usCompliant) {
    return null;
  }

  return (
    <Alert className="border-warning/50 bg-warning/5">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning">
        <p className="font-medium mb-2">
          ⚠️ This exchange is not available in the United States
        </p>
        <p className="text-sm">
          This exchange is configured but cannot be used from your current location. 
          You can keep it configured for when you travel internationally.
        </p>
      </AlertDescription>
    </Alert>
  );
}

interface ComplianceStatusProps {
  exchanges: ExchangeType[];
  userLocation?: 'US' | 'INTERNATIONAL';
}

export function ComplianceStatus({
  exchanges,
  userLocation = 'US',
}: ComplianceStatusProps) {
  const allCompliant = exchanges.every(
    exchange => EXCHANGE_CONFIGS[exchange].usCompliant || userLocation !== 'US'
  );

  if (allCompliant) {
    return (
      <Alert className="border-success/50 bg-success/5">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          ✅ All configured exchanges are compliant with your location
        </AlertDescription>
      </Alert>
    );
  }

  const restrictedCount = exchanges.filter(
    exchange => !EXCHANGE_CONFIGS[exchange].usCompliant
  ).length;

  return (
    <Alert className="border-warning/50 bg-warning/5">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning">
        ⚠️ {restrictedCount} of your configured exchanges {restrictedCount === 1 ? 'is' : 'are'} not available in your location
      </AlertDescription>
    </Alert>
  );
}

