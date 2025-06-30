
import React, { useState, useCallback, FC, ReactNode, FormEvent, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import * as htmlToImage from 'html-to-image';
import type { FinancialData, CalculationResult, ChatMessage, ChartData } from './types';

// --- Merged from geminiService.ts ---
const getAiStream = async ({
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


// --- Merged from App.tsx ---

// --- Helper Components & Icons (New Themed Icons) ---

interface InputFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  type?: string;
}

const InputField: FC<InputFieldProps> = ({ label, id, value, onChange, icon, type = 'number' }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-stone-700 mb-1">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </div>
      )}
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className={`block w-full rounded-md border-stone-300 ${icon ? 'pl-10' : 'pl-4'} shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm`}
        placeholder={type === 'text' ? 'e.g., Diwali promotion' : '0.00'}
        aria-label={label}
      />
    </div>
  </div>
);

const InputGroup: FC<{ title: string, children: ReactNode }> = ({ title, children }) => (
  <fieldset className="border border-stone-200 p-4 rounded-lg">
    <legend className="text-base font-semibold text-brand-dark px-2">{title}</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {children}
    </div>
  </fieldset>
);

const IconLock: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const IconArrowLeft: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const IconSwitch: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const IconUsers: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.274-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.274.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconMarketing: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.464 9.168-6M2 12h2" /></svg>;
const IconExclamation: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconSend: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const IconAdvisor: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const IconReport: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconShare: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>;
const IconCommission: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 14h.01M7 17h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zM15 3h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2V5a2 2 0 012-2zm0 14h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2z" /></svg>
const IconPackaging: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const IconStar: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
const IconReceipt: FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>

const EXPENSE_COLORS = ['#f59e0b', '#78716c', '#10b981', '#d97706', '#a3e635', '#f472b6', '#ef4444'];
const REVENUE_COLORS = ['#f59e0b', '#fbbf24'];
const MAINT_COLORS = ['#fcd34d', '#fdba74', '#fca5a5'];


const CORRECT_PASSWORD = 'Kun@f@4Ever';
const CURRENCIES = ['INR', 'USD', 'EUR'];

const initialInputsState = {
  revenue: { dineIn: '', outdoor: '' },
  maintenance: { electricity: '', rent: '', repairs: '' },
  foodCosts: { local: '', pune: '' },
  staffing: { salaries: '', welfare: '' },
  platformFees: { zomato: '', swiggy: '' },
  packaging: '',
  marketing: '',
  misc: '',
  operational: { outdoorOrders: '', avgRating: '' },
};

const App: FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const [inputs, setInputs] = useState(initialInputsState);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [expenseChartData, setExpenseChartData] = useState<ChartData[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<ChartData[]>([]);
  const [maintenanceChartData, setMaintenanceChartData] = useState<ChartData[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isSharing, setIsSharing] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState('');

  // Chat state - The history is now the single source of truth for the conversation
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Refs for charts
  const summaryRef = useRef<HTMLDivElement>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const maintenanceChartRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  useEffect(() => {
    if (copySuccessMessage) {
        const timer = setTimeout(() => setCopySuccessMessage(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [copySuccessMessage]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
      setPassword('');
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    if (keys.length === 2) {
      const [category, field] = keys as [keyof FinancialData, string];
      setInputs(prev => ({
        ...prev,
        [category]: { ...(prev[category] as object), [field]: value }
      }));
    } else {
      setInputs(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleSelectLocation = (location: string) => {
    setSelectedLocation(location);
    const presetRent = location === 'Udaipur' ? '56817' : location === 'Ahmedabad' ? '90000' : '';
    setInputs({ ...initialInputsState, maintenance: { ...initialInputsState.maintenance, rent: presetRent } });
    setResult(null);
    setChatHistory([]);
  };

  const handleChangeBranch = () => {
    setSelectedLocation(null);
    setInputs(initialInputsState);
    setResult(null);
    setChatHistory([]);
  };
  
  const handleGoBackToLogin = () => {
      setIsAuthenticated(false);
      setSelectedLocation(null);
      setAuthError('');
      setPassword('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency, minimumFractionDigits: 2 }).format(value);
  }
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-xs drop-shadow-sm">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Generic function to handle streaming AI responses
  const processStream = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let reading = true;
      let fullResponse = '';

      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].content = fullResponse;
            return newHistory;
        });
      }
  }


  const handleCalculate = useCallback(async () => {
    if (!selectedLocation) return;
    setError('');
    setChatHistory([]);
    setIsLoading(true);

    const parse = (val: string) => parseFloat(val) || 0;
    
    const financialData: FinancialData = {
      revenue: { dineIn: parse(inputs.revenue.dineIn), outdoor: parse(inputs.revenue.outdoor) },
      maintenance: { electricity: parse(inputs.maintenance.electricity), rent: parse(inputs.maintenance.rent), repairs: parse(inputs.maintenance.repairs) },
      foodCosts: { local: parse(inputs.foodCosts.local), pune: parse(inputs.foodCosts.pune) },
      staffing: { salaries: parse(inputs.staffing.salaries), welfare: parse(inputs.staffing.welfare) },
      platformFees: { zomato: parse(inputs.platformFees.zomato), swiggy: parse(inputs.platformFees.swiggy) },
      packaging: parse(inputs.packaging),
      marketing: parse(inputs.marketing),
      misc: parse(inputs.misc),
      operational: { outdoorOrders: parse(inputs.operational.outdoorOrders), avgRating: parse(inputs.operational.avgRating) },
    };
    
    const totalRevenue = financialData.revenue.dineIn + financialData.revenue.outdoor;
    const totalMaintenance = Object.values(financialData.maintenance).reduce((a, b) => a + b, 0);
    const totalFoodCosts = financialData.foodCosts.local + financialData.foodCosts.pune;
    const totalStaffing = financialData.staffing.salaries + financialData.staffing.welfare;
    const totalPlatformFees = financialData.platformFees.zomato + financialData.platformFees.swiggy;

    if (totalRevenue <= 0) {
      setError('Total Revenue must be greater than zero to calculate profit/loss.');
      setIsLoading(false);
      return;
    }

    const totalExpenses = totalMaintenance + totalFoodCosts + totalStaffing + totalPlatformFees + financialData.packaging + financialData.marketing + financialData.misc;
    const profitOrLoss = totalRevenue - totalExpenses;
    
    const calculationResult = { profitOrLoss, totalExpenses, totalRevenue };
    setResult(calculationResult);

    setExpenseChartData([
      { name: 'Maintenance', value: totalMaintenance }, { name: 'Food Costs', value: totalFoodCosts }, { name: 'Staffing', value: totalStaffing }, { name: 'Platform Fees', value: totalPlatformFees }, { name: 'Packaging', value: financialData.packaging }, { name: 'Marketing', value: financialData.marketing }, { name: 'Misc Costs', value: financialData.misc },
    ].filter(item => item.value > 0));

    setRevenueChartData([ { name: 'Dine-in', value: financialData.revenue.dineIn }, { name: 'Outdoor', value: financialData.revenue.outdoor }, ].filter(item => item.value > 0));
    setMaintenanceChartData([ { name: 'Electricity', value: financialData.maintenance.electricity }, { name: 'Rent', value: financialData.maintenance.rent }, { name: 'Repairs', value: financialData.maintenance.repairs }, ].filter(item => item.value > 0));

    // Start the AI chat
    const initialUserMessage: ChatMessage = { role: 'user', content: "Initial analysis request" };
    const currentHistory = [initialUserMessage];
    setChatHistory(currentHistory); // Show user message placeholder
    setChatHistory(prev => [...prev, {role: 'model', content: ''}]); // Add empty model message to populate

    try {
      const stream = await getAiStream({
          history: currentHistory,
          financialData,
          calculationResult,
          currency: selectedCurrency,
          location: selectedLocation,
      });
      await processStream(stream);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setChatHistory([]); // Clear history on error
    } finally {
      setIsLoading(false);
    }
  }, [inputs, selectedCurrency, selectedLocation]);
  
  const handleSendChatMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isChatLoading) return;
    
    const newUserMessage: ChatMessage = { role: 'user', content: chatMessage };
    const currentHistory = [...chatHistory, newUserMessage];
    
    setChatHistory(currentHistory);
    setChatMessage('');
    setIsChatLoading(true);
    setChatHistory(prev => [...prev, {role: 'model', content: ''}]); // Add empty model message

    try {
        const stream = await getAiStream({ history: currentHistory, currency: selectedCurrency, location: selectedLocation! });
        await processStream(stream);
    } catch (e: any) {
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].content = `Sorry, I encountered an error: ${e.message}`;
            return newHistory;
        });
    } finally {
        setIsChatLoading(false);
    }
  };
  
    const handleShare = async () => {
        if (!result || isSharing) return;
        setIsSharing(true);
        setCopySuccessMessage('');
        
        const firstModelMessage = chatHistory.find(m => m.role === 'model')?.content || '';

        const summaryText = `
Financial Summary for Kunafa Bytes ${selectedLocation}:
- Total Revenue: ${formatCurrency(result.totalRevenue)}
- Total Expenses: ${formatCurrency(result.totalExpenses)}
- Net Profit/Loss: ${formatCurrency(result.profitOrLoss)}

AI Advisor Recommendations:
${firstModelMessage.replace(/<br \/>/g, '\n').replace(/<[^>]*>/g, '')}
        `.trim();

        const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            return new File([blob], fileName, { type: 'image/png' });
        };

        if (navigator.share && navigator.canShare) {
            try {
                const files: File[] = [];
                const chartsToCapture = [ { ref: revenueChartRef, name: 'revenue-breakdown.png' }, { ref: maintenanceChartRef, name: 'maintenance-breakdown.png' }, { ref: expenseChartRef, name: 'expense-distribution.png' }, ];

                for (const chart of chartsToCapture) {
                    if (chart.ref.current) {
                        const dataUrl = await htmlToImage.toPng(chart.ref.current, { backgroundColor: '#FFFFFF' });
                        files.push(await dataUrlToFile(dataUrl, chart.name));
                    }
                }
                
                await navigator.share({ title: `Financial Report for Kunafa Bytes ${selectedLocation}`, text: summaryText, files: files, });
            } catch (error) {
                 try { await navigator.clipboard.writeText(summaryText); setCopySuccessMessage('Sharing failed, but report text copied to clipboard!'); } catch (copyError) { console.error('Copying to clipboard failed:', copyError); }
            }
        } else {
            try { await navigator.clipboard.writeText(summaryText); setCopySuccessMessage('Report text copied to clipboard!'); } catch (copyError) { console.error('Copying to clipboard failed:', copyError); }
        }
        setIsSharing(false);
    };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
            <h1 className="text-3xl font-bold text-brand-dark mb-2 font-serif">Welcome Back</h1>
            <p className="text-stone-600 mb-6">Please enter your password to continue.</p>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <InputField label="Password" id="password-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" icon={<IconLock />} />
                {authError && <p className="text-sm text-red-600">{authError}</p>}
                <button type="submit" className="w-full flex justify-center rounded-md bg-brand-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary transition-colors duration-200"> Unlock </button>
            </form>
        </div>
      </div>
    );
  }

  if (!selectedLocation) {
      return (
          <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
                  <h1 className="text-3xl font-bold text-brand-dark mb-2 font-serif">Select a Branch</h1>
                  <p className="text-stone-600 mb-8">Which branch's financial data are you entering?</p>
                  <div className="space-y-4">
                      <button onClick={() => handleSelectLocation('Ahmedabad')} className="w-full text-lg rounded-md bg-brand-secondary px-4 py-4 font-semibold text-brand-dark shadow-sm hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary transition-colors duration-200"> Kunafa Bytes Ahmedabad </button>
                      <button onClick={() => handleSelectLocation('Udaipur')} className="w-full text-lg rounded-md bg-brand-secondary px-4 py-4 font-semibold text-brand-dark shadow-sm hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary transition-colors duration-200"> Kunafa Bytes Udaipur </button>
                  </div>
                  <button onClick={handleGoBackToLogin} className="mt-8 text-sm text-stone-500 hover:text-brand-primary flex items-center justify-center w-full gap-1 transition-colors"> <IconArrowLeft /> Go Back </button>
              </div>
          </div>
      );
  }

  const profitLossColor = result && result.profitOrLoss >= 0 ? 'text-accent-green' : 'text-accent-loss';
  const renderMarkdown = (text: string) => {
    return text.replace(/\n/g, '<br />').replace(/\* /g, '• ').replace(/##\s?(.*?)<br \/>/g, '<h4 class="font-semibold my-2">$1</h4>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                     <h1 className="text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl font-serif"> Kunafa Bytes <span className="text-brand-primary">{selectedLocation}</span> </h1>
                     <p className="mt-2 text-lg text-stone-600">Monthly Profit & AI Advisor</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={handleChangeBranch} className="text-sm font-medium text-stone-600 hover:text-brand-primary flex items-center gap-1 transition-colors"> <IconSwitch /> Change Branch </button>
                    <div>
                        <label htmlFor="currency-select" className="sr-only">Currency</label>
                         <select id="currency-select" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                    </div>
                 </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 font-serif">Monthly Financial Inputs ({selectedCurrency})</h2>
            <div className="space-y-6">
              <InputGroup title="Revenue">
                <InputField label="Dine-in Sales" id="revenue.dineIn" value={inputs.revenue.dineIn} onChange={handleInputChange} />
                <InputField label="Outdoor Sales (Events, etc.)" id="revenue.outdoor" value={inputs.revenue.outdoor} onChange={handleInputChange} />
              </InputGroup>
               <InputGroup title="Operational Metrics">
                 <InputField label="Total Outdoor Orders" id="operational.outdoorOrders" value={inputs.operational.outdoorOrders} onChange={handleInputChange} icon={<IconReceipt />} />
                 <InputField label="Avg. Customer Rating (1-5)" id="operational.avgRating" value={inputs.operational.avgRating} onChange={handleInputChange} icon={<IconStar />} />
               </InputGroup>
              <InputGroup title="Maintenance Costs">
                <InputField label="Electricity" id="maintenance.electricity" value={inputs.maintenance.electricity} onChange={handleInputChange} />
                <InputField label="Rent" id="maintenance.rent" value={inputs.maintenance.rent} onChange={handleInputChange} />
                <InputField label="Repairs" id="maintenance.repairs" value={inputs.maintenance.repairs} onChange={handleInputChange} />
              </InputGroup>
              <InputGroup title="Food Costs">
                <InputField label="Local Purchases" id="foodCosts.local" value={inputs.foodCosts.local} onChange={handleInputChange} />
                <InputField label="Pune Purchases" id="foodCosts.pune" value={inputs.foodCosts.pune} onChange={handleInputChange} />
              </InputGroup>
              <InputGroup title="Staffing">
                <InputField label="Total Salaries" id="staffing.salaries" value={inputs.staffing.salaries} onChange={handleInputChange} icon={<IconUsers />} />
                <InputField label="Staff Welfare" id="staffing.welfare" value={inputs.staffing.welfare} onChange={handleInputChange} icon={<IconUsers />} />
              </InputGroup>
              <InputGroup title="Platform Commissions">
                <InputField label="Zomato Commission" id="platformFees.zomato" value={inputs.platformFees.zomato} onChange={handleInputChange} icon={<IconCommission />} />
                <InputField label="Swiggy Commission" id="platformFees.swiggy" value={inputs.platformFees.swiggy} onChange={handleInputChange} icon={<IconCommission />} />
              </InputGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <InputField label="Packaging Costs" id="packaging" value={inputs.packaging} onChange={handleInputChange} icon={<IconPackaging />} />
                <InputField label="Marketing & Advertising" id="marketing" value={inputs.marketing} onChange={handleInputChange} icon={<IconMarketing />} />
                <InputField label="Miscellaneous Costs" id="misc" value={inputs.misc} onChange={handleInputChange} icon={<IconExclamation />} />
              </div>
              <button onClick={handleCalculate} disabled={isLoading} className="w-full flex justify-center items-center gap-2 rounded-md bg-brand-primary px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:bg-stone-400 disabled:cursor-not-allowed transition-colors duration-200">
                {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing...</>) : 'Calculate & Advise'}
              </button>
              {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
            </div>
          </div>

          <div className="space-y-8">
             {result && (
               <div ref={summaryRef} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 font-serif">Financial Summary</h2>
                     <div className="relative">
                        <button onClick={handleShare} disabled={isSharing} className="flex items-center gap-2 rounded-md bg-brand-secondary px-3 py-2 text-sm font-semibold text-brand-dark shadow-sm hover:bg-amber-100 disabled:opacity-50 transition-colors">
                            <IconShare />
                            {isSharing ? 'Sharing...' : 'Share Report'}
                        </button>
                        {copySuccessMessage && <div className="absolute top-full right-0 mt-2 text-xs bg-brand-dark text-white px-2 py-1 rounded-md shadow-lg">{copySuccessMessage}</div>}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div><span className="text-lg text-stone-600 block">Total Revenue</span><span className="text-3xl font-semibold text-stone-800">{formatCurrency(result.totalRevenue)}</span></div>
                     <div><span className="text-lg text-stone-600 block">Total Expenses</span><span className="text-3xl font-semibold text-stone-800">{formatCurrency(result.totalExpenses)}</span></div>
                     <div><span className="text-lg text-stone-600 block">Net Profit / Loss</span><span className={`text-3xl font-bold ${profitLossColor}`}>{result.profitOrLoss >= 0 ? '+' : '−'}{formatCurrency(Math.abs(result.profitOrLoss))}</span></div>
                 </div>
               </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {revenueChartData.length > 0 && <div ref={revenueChartRef} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"><h3 className="text-xl font-semibold text-stone-800 mb-4 text-center">Revenue Breakdown</h3><div style={{ width: '100%', height: 250 }}><ResponsiveContainer><PieChart><Pie data={revenueChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>{revenueChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => [formatCurrency(value), 'Amount']} /><Legend /></PieChart></ResponsiveContainer></div></div>}
                {maintenanceChartData.length > 0 && <div ref={maintenanceChartRef} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"><h3 className="text-xl font-semibold text-stone-800 mb-4 text-center">Maintenance Breakdown</h3><div style={{ width: '100%', height: 250 }}><ResponsiveContainer><PieChart><Pie data={maintenanceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} >{maintenanceChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={MAINT_COLORS[index % MAINT_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => [formatCurrency(value), 'Cost']} /><Legend wrapperStyle={{fontSize: "14px"}}/></PieChart></ResponsiveContainer></div></div>}
            </div>
              
            {expenseChartData.length > 0 && <div ref={expenseChartRef} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"><h3 className="text-xl font-semibold text-stone-800 mb-4">Total Expense Distribution</h3><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={expenseChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><XAxis dataKey="name" /><YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={80}/><Tooltip formatter={(value: number) => [formatCurrency(value), 'Cost']} /><Legend /><Bar dataKey="value" name="Expenses">{expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div></div>}

            {(isLoading || chatHistory.length > 0) && (
              <div className="bg-brand-secondary rounded-xl shadow-lg flex flex-col">
                  <div className="p-6 flex items-center gap-4 border-b border-amber-200">
                      <IconAdvisor />
                      <h3 className="text-2xl font-bold text-brand-dark font-serif">
                        AI Financial Advisor
                      </h3>
                  </div>
                
                <div className="bg-white p-6 flex-grow h-96 overflow-y-auto" ref={chatContainerRef}>
                    {isLoading && chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full"><svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-4 text-stone-600">Generating insights for you...</p></div>
                    ) : (
                        <div className="space-y-4">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'user' ? 'bg-brand-primary text-white' : 'bg-stone-200 text-stone-800'}`}>
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-h4:my-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}></div>
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="p-3 rounded-lg bg-stone-200 text-stone-800">
                                        <div className="flex items-center gap-2"><div className="h-2 w-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="h-2 w-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="h-2 w-2 bg-brand-primary rounded-full animate-bounce"></div></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {chatHistory.length > 0 && (
                    <div className="p-4 border-t border-amber-200 bg-brand-secondary/50 rounded-b-xl">
                        <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                            <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Ask a follow-up question..." disabled={isChatLoading} className="flex-grow rounded-md border-stone-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm disabled:bg-stone-100" />
                            <button type="submit" disabled={!chatMessage.trim() || isChatLoading} className="p-2 rounded-full bg-brand-primary text-white hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-stone-400 disabled:cursor-not-allowed transition-all">
                                <IconSend />
                            </button>
                        </form>
                    </div>
                )}
              </div>
            )}

            {!result && !isLoading && (
              <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-xl shadow-lg h-full">
                <IconReport />
                <h3 className="mt-4 text-xl font-semibold text-stone-800 font-serif">Your Report Awaits</h3>
                <p className="mt-2 text-stone-500 max-w-sm">Fill in your financial details and click "Calculate & Advise" to see your business analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
