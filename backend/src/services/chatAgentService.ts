import { MongoDBService } from './mongodbService';
import { BedrockService } from './bedrockService';

interface Transaction {
  customer_id: string;
  toll_amount: number;
  toll_point_name: string;
  tolltime: Date;
  tollstatus: string;
  connection_status: boolean;
}

export class ChatAgentService {
  private mongoService: MongoDBService;
  private bedrockService: BedrockService;

  constructor() {
    this.mongoService = new MongoDBService();
    this.bedrockService = new BedrockService();
  }

  async processQuery(
    customerId: string,
    query: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      // Fetch transactions
      let transactions: any[];
      let isAllCustomers = false;

      if (customerId.toUpperCase() === 'ALL') {
        transactions = await this.mongoService.getAllTransactions();
        isAllCustomers = true;
      } else {
        transactions = await this.mongoService.getCustomerTransactions(customerId);
      }

      if (transactions.length === 0) {
        return `No tolling transactions found${isAllCustomers ? '' : ` for customer ${customerId}`}.`;
      }

      // Generate prompt for Bedrock
      const prompt = this.generatePrompt(customerId, transactions, query, isAllCustomers);

      // Call Bedrock - NO FALLBACK
      let response: string;
      if (onChunk) {
        const result = await this.bedrockService.streamInvoke(
          { prompt },
          onChunk
        );
        response = result.message;
      } else {
        const result = await this.bedrockService.invoke({ prompt });
        response = result.message;
      }

      return response;
    } catch (error: any) {
      console.error('Chat agent error:', error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  private analyzeTransactionsDirectly(
    customerId: string,
    transactions: any[],
    query: string,
    isAllCustomers: boolean
  ): string {
    const queryLower = query.toLowerCase();
    
    // Calculate summary statistics from real data
    const stats = this.calculateStats(transactions);

    // Match user intent and provide data-driven response
    if (queryLower.includes('total') && queryLower.includes('amount')) {
      return `The total toll amount ${isAllCustomers ? 'across all customers' : `for customer ${customerId}`} is $${stats.totalAmount.toFixed(2)} across ${transactions.length} transactions.`;
    } 
    else if (queryLower.includes('last month')) {
      const monthStats = this.getMonthStats(transactions);
      if (monthStats.count === 0) {
        const now = new Date();
        return `No tolling transactions found in ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
      }
      const now = new Date();
      return `This month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}), you have ${monthStats.count} toll transactions totaling $${monthStats.total.toFixed(2)}.`;
    }
    else if (queryLower.includes('this month')) {
      const monthStats = this.getMonthStats(transactions);
      if (monthStats.count === 0) {
        const now = new Date();
        return `No tolling transactions in ${now.toLocaleDateString('en-US', { month: 'long' })}.`;
      }
      const now = new Date();
      return `This month (${now.toLocaleDateString('en-US', { month: 'long' })}), you have ${monthStats.count} transactions totaling $${monthStats.total.toFixed(2)}.`;
    }
    else if (queryLower.includes('week')) {
      const weekStats = this.getWeekStats(transactions);
      if (weekStats.count === 0) {
        return `No tolling transactions found this week.`;
      }
      return `This week, you have ${weekStats.count} toll transactions totaling $${weekStats.total.toFixed(2)}.`;
    }
    else if (queryLower.includes('average')) {
      return `The average toll amount per transaction is $${stats.averageAmount.toFixed(2)}.`;
    }
    else if (queryLower.includes('highest') || queryLower.includes('maximum') || queryLower.includes('max')) {
      return `The highest toll amount is $${stats.maxAmount.toFixed(2)}.`;
    }
    else if (queryLower.includes('lowest') || queryLower.includes('minimum') || queryLower.includes('min')) {
      return `The lowest toll amount is $${stats.minAmount.toFixed(2)}.`;
    }
    else if (queryLower.includes('location') || queryLower.includes('point') || queryLower.includes('where')) {
      const locations = [...new Set(transactions.map((t: any) => t.toll_point_name))];
      return `Your tolling activity has been recorded at these ${locations.length} locations: ${locations.join(', ')}.`;
    }
    else if (queryLower.includes('how many') || queryLower.includes('count') || queryLower.includes('transactions')) {
      return `You have ${transactions.length} total tolling transactions on record.`;
    }
    else if (queryLower.includes('status') || queryLower.includes('error')) {
      const statuses = this.getStatusBreakdown(transactions);
      return `Transaction status breakdown: Completed: ${statuses.completed}, Pending: ${statuses.pending}, Error: ${statuses.error}, Incomplete: ${statuses.incomplete}.`;
    }
    else if (queryLower.includes('success rate')) {
      const successCount = transactions.filter((t: any) => t.connection_status).length;
      const rate = ((successCount / transactions.length) * 100).toFixed(1);
      return `Your toll transaction success rate is ${rate}% (${successCount}/${transactions.length} successful connections).`;
    }
    else {
      // Default: provide comprehensive summary
      return `Based on your tolling records: ${transactions.length} total transactions, $${stats.totalAmount.toFixed(2)} total amount spent. Average per transaction: $${stats.averageAmount.toFixed(2)}. Range: $${stats.minAmount.toFixed(2)} - $${stats.maxAmount.toFixed(2)}. Toll locations: ${[...new Set(transactions.map((t: any) => t.toll_point_name))].join(', ')}.`;
    }
  }

  private calculateStats(transactions: any[]) {
    const amounts = transactions
      .map((t: any) => t.toll_amount || 0)
      .filter(a => a > 0);
    
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const averageAmount = totalAmount / (amounts.length || 1);
    const maxAmount = Math.max(...amounts, 0);
    const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;

    return { totalAmount, averageAmount, maxAmount, minAmount };
  }

  private getMonthStats(transactions: any[]) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(t => 
      new Date(t.tolltime) >= startOfMonth
    );
    
    const total = monthTransactions.reduce(
      (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
      0
    );

    return { count: monthTransactions.length, total };
  }

  private getWeekStats(transactions: any[]) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const weekTransactions = transactions.filter(t => 
      new Date(t.tolltime) >= startOfWeek
    );
    
    const total = weekTransactions.reduce(
      (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
      0
    );

    return { count: weekTransactions.length, total };
  }

  private getStatusBreakdown(transactions: any[]) {
    const breakdown = {
      completed: 0,
      pending: 0,
      error: 0,
      incomplete: 0
    };

    transactions.forEach((t: any) => {
      const status = (t.tollstatus || '').toLowerCase();
      if (status === 'completed') breakdown.completed++;
      else if (status === 'pending') breakdown.pending++;
      else if (status === 'error') breakdown.error++;
      else if (status === 'incomplete') breakdown.incomplete++;
    });

    return breakdown;
  }

  private generatePrompt(
    customerId: string,
    transactions: any[],
    userQuery: string,
    isAllCustomers: boolean = false
  ): string {
    // Limit to last 50 transactions to drastically reduce tokens
    const limitedTransactions = transactions.slice(-50);
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce(
      (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
      0
    );
    const successfulTransactions = transactions.filter(
      (t: any) => t.connection_status
    ).length;
    const locations = [...new Set(transactions.map((t: any) => t.toll_point_name))];

    if (isAllCustomers) {
      // Build minimal customer summary
      const customerMap: any = {};
      transactions.forEach((t: any) => {
        if (!customerMap[t.customer_id]) {
          customerMap[t.customer_id] = {
            total_amount: 0,
            count: 0,
          };
        }
        customerMap[t.customer_id].total_amount += t.toll_amount ? Math.max(t.toll_amount, 0) : 0;
        customerMap[t.customer_id].count += 1;
      });

      const topCustomers = Object.entries(customerMap)
        .sort((a: any, b: any) => b[1].total_amount - a[1].total_amount)
        .slice(0, 10)
        .map((entry: any) => `${entry[0]}: $${entry[1].total_amount.toFixed(2)}`)
        .join(', ');

      const dataContext = `Customers: ${Object.keys(customerMap).length} | Total: $${totalAmount.toFixed(2)} | Transactions: ${totalTransactions}
Top customers: ${topCustomers}
Query: ${userQuery}
Answer briefly.`;

      return dataContext;
    } else {
      // Single customer - minimal format
      const recentTxns = limitedTransactions
        .map((t: any) => `${new Date(t.tolltime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: $${(t.toll_amount || 0).toFixed(2)}`)
        .join(', ');

      const dataContext = `Customer: ${customerId}
Total: $${totalAmount.toFixed(2)} (${totalTransactions} txns)
Recent: ${recentTxns}
Locations: ${locations.join(', ')}
Query: ${userQuery}
Answer concisely.`;

      return dataContext;
    }
  }
}
