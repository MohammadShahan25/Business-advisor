import { GoogleGenAI, type Content } from "@google/genai";
import type { FinancialData, CalculationResult } from '../types';

// This function is now on the server to securely generate the prompt
const createInitialPrompt = (
  financialData: FinancialData,
  calculationResult: CalculationResult,
  currency: string,
  location: string
): string => {
  const { revenue, maintenance, foodCosts, staffing, platformFees, packaging, marketing, misc, operational } = financialData;
  const { profitOrLoss, totalRevenue } = calculationResult;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  return `
    A business owner has provided their monthly financial and operational data for the ${location} branch. 
    Your primary task is to provide a concise, actionable analysis and 3-5 specific recommendations to improve profitability for this specific branch.
    Analyze the expense distribution and suggest practical steps the owner can take.

    Here is the detailed data for the month (all values in ${currency}):
    
    **Revenue Breakdown:**
    - Dine-in Sales: ${formatCurrency(revenue.dineIn)}
    - Outdoor Sales (Events, Takeaway): ${formatCurrency(revenue.outdoor)}
    - **Total Revenue: ${formatCurrency(totalRevenue)}**

    **Expense Breakdown:**
    - **Maintenance Costs:**
      - Electricity: ${formatCurrency(maintenance.electricity)}, Rent: ${formatCurrency(maintenance.rent)}, Repairs: ${formatCurrency(maintenance.repairs)}
    - **Food Costs:**
      - Local Purchases: ${formatCurrency(foodCosts.local)}, Pune Purchases: ${formatCurrency(foodCosts.pune)}
    - **Staffing Costs:**
      - Total Salaries: ${formatCurrency(staffing.salaries)}
      - Staff Welfare: ${formatCurrency(staffing.welfare)}
    - **Platform & Delivery Commissions:**
      - Zomato: ${formatCurrency(platformFees.zomato)}
      - Swiggy: ${formatCurrency(platformFees.swiggy)}
    - **Other Variable Costs:**
       - Packaging Materials: ${formatCurrency(packaging)}
    - **Marketing & Advertising:** ${formatCurrency(marketing)}
    - **Miscellaneous Costs:** ${formatCurrency(misc)}
    
    **Operational Metrics:**
    - Total Outdoor Orders: ${operational.outdoorOrders || 'N/A'}
    - Average Customer Rating (out of 5): ${operational.avgRating > 0 ? operational.avgRating : 'N/A'}

    **Calculated Result:**
    - **Net ${profitOrLoss >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(profitOrLoss))}**

    Based on this simplified data for the ${location} branch, provide your expert analysis and recommendations. Structure your response in Markdown format. Start with a brief "Financial Health Summary for Kunafa Bytes ${location}" and then provide a bulleted list of "Actionable Recommendations". 
    **Crucially, you must perform the following analysis:**
    1. If order data is available, calculate and analyze the Average Order Value (AOV) for Outdoor Sales.
    2. Correlate the provided customer rating with the sales performance.
    3. Pay special attention to the impact of platform commissions on profitability.
    
    Be encouraging but realistic in your tone. After this initial analysis, the user will be able to ask you follow-up questions.
  `;
};


export const config = {
  runtime: 'edge', // Vercel Edge Function for speed and streaming
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { history, financialData, calculationResult, currency, location } = await req.json();

    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured on the server" }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contents: Content[] = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (financialData && calculationResult && history.length === 1) {
        const initialPrompt = createInitialPrompt(financialData, calculationResult, currency, location);
        contents[0].parts = [{ text: initialPrompt }];
    }

    const systemInstruction = `You are an expert financial advisor for "Kunafa Bytes", a specialized food business. The user has provided initial financial data for one of their branches and may ask follow-up questions. Always be concise, actionable, and encouraging but realistic. Base your answers on the financial context provided. The branch is ${location} and currency is ${currency}.`;

    const geminiStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        },
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of geminiStream) {
          const chunkText = chunk.text;
          if (chunkText) {
            controller.enqueue(encoder.encode(chunkText));
          }
        }
        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });

  } catch (error: any) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ error: error.message || "An internal server error occurred." }), { status: 500 });
  }
}
