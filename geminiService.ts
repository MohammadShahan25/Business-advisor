import type { FinancialData, CalculationResult, ChatMessage } from './types';

export const getAiStream = async ({
    history,
    financialData,
    calculationResult,
    currency,
    location,
}: {
    history: ChatMessage[];
    financialData?: FinancialData;
    calculationResult?: CalculationResult;
    currency: string;
    location: string;
}): Promise<ReadableStream<Uint8Array>> => {
  const payload: any = { history, currency, location };
  if (financialData && calculationResult) {
    payload.financialData = financialData;
    payload.calculationResult = calculationResult;
  }
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response from API is empty.');
  }

  return response.body;
};
