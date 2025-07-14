import { DividendData } from '../types/investment';

// Real ULTY dividend data from March 2025 onwards (when it went weekly)
export const ULTY_2025_DIVIDENDS: DividendData[] = [
  // March 2025 - when weekly distributions started
  { date: '2025-03-07', amount: 0.4653, rocPercentage: 100 },
  { date: '2025-03-14', amount: 0.1025, rocPercentage: 100 },
  { date: '2025-03-21', amount: 0.0977, rocPercentage: 100 },
  { date: '2025-03-28', amount: 0.0986, rocPercentage: 100 },
  
  // April 2025
  { date: '2025-04-04', amount: 0.0916, rocPercentage: 100 },
  { date: '2025-04-11', amount: 0.0822, rocPercentage: 100 },
  { date: '2025-04-21', amount: 0.0852, rocPercentage: 100 },
  { date: '2025-04-25', amount: 0.0836, rocPercentage: 100 },
  
  // May 2025
  { date: '2025-05-02', amount: 0.0936, rocPercentage: 100 },
  { date: '2025-05-09', amount: 0.1181, rocPercentage: 100 },
  { date: '2025-05-16', amount: 0.1059, rocPercentage: 100 },
  { date: '2025-05-23', amount: 0.0979, rocPercentage: 100 },
  { date: '2025-05-30', amount: 0.0954, rocPercentage: 100 },
  
  // June 2025
  { date: '2025-06-06', amount: 0.0945, rocPercentage: 100 },
  { date: '2025-06-13', amount: 0.0950, rocPercentage: 100 },
  { date: '2025-06-23', amount: 0.0875, rocPercentage: 100 },
  { date: '2025-06-27', amount: 0.0923, rocPercentage: 100 },
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

// Calculate average of last 6 dividends for future estimates
const getAverageOfLastSix = (): number => {
  const lastSix = ULTY_2025_DIVIDENDS.slice(-6);
  const sum = lastSix.reduce((total, div) => total + div.amount, 0);
  return sum / lastSix.length;
};

// Generate estimated future dividends (weekly through end of 2025)
const generateEstimatedDividends = (): DividendData[] => {
  const estimatedAmount = getAverageOfLastSix();
  const lastDate = new Date(ULTY_2025_DIVIDENDS[ULTY_2025_DIVIDENDS.length - 1].date);
  const estimatedDividends: DividendData[] = [];
  
  // Generate weekly dividends from July through December 2025
  let currentDate = new Date(lastDate);
  currentDate.setDate(currentDate.getDate() + 7); // Start one week after last known dividend
  
  const endOfYear = new Date('2025-12-31');
  
  while (currentDate <= endOfYear) {
    // Skip major holidays (approximate dates)
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    
    // Skip around July 4th, Thanksgiving week, Christmas week
    const isHoliday = (month === 7 && day === 4) || 
                     (month === 11 && day >= 25) || 
                     (month === 12 && day >= 23);
    
    if (!isHoliday) {
      estimatedDividends.push({
        date: currentDate.toISOString().split('T')[0],
        amount: estimatedAmount,
        rocPercentage: 100,
        isEstimated: true
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return estimatedDividends;
};

// Combine actual and estimated dividends
export const ALL_DIVIDENDS = [
  ...ULTY_2025_DIVIDENDS,
  ...generateEstimatedDividends()
];

export const getNextDividendDate = (): string | null => {
  const today = new Date();
  const nextDividend = ALL_DIVIDENDS.find(dividend => 
    new Date(dividend.date) > today
  );
  return nextDividend ? nextDividend.date : null;
};

export const getDividendAmount = (date: string): number => {
  const dividend = ALL_DIVIDENDS.find(d => d.date === date);
  return dividend ? dividend.amount : 0;
};

export const getEstimatedWeeklyAmount = (): number => {
  return getAverageOfLastSix();
};