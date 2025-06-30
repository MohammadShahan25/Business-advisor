export interface RevenueData {
  dineIn: number;
  outdoor: number;
}

export interface MaintenanceData {
  electricity: number;
  rent: number;
  repairs: number;
}

export interface FoodCostData {
  local: number;
  pune: number;
}

export interface PlatformFeesData {
  zomato: number;
  swiggy: number;
}

export interface StaffingData {
  salaries: number;
  welfare: number;
}

export interface OperationalData {
  outdoorOrders: number;
  avgRating: number;
}

export interface FinancialData {
  revenue: RevenueData;
  maintenance: MaintenanceData;
  foodCosts: FoodCostData;
  staffing: StaffingData;
  platformFees: PlatformFeesData;
  packaging: number;
  marketing: number;
  misc: number;
  operational: OperationalData;
}


export interface ChartData {
  name: string;
  value: number;
}

export interface CalculationResult {
  profitOrLoss: number;
  totalExpenses: number;
  totalRevenue: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
