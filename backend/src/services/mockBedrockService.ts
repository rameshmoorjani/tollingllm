/**
 * Mock Bedrock Service - Used when Bedrock quotas are exceeded
 * Provides intelligent fallback responses based on transaction data
 * 
 * This is a TEMPORARY solution while AWS quotas are being increased.
 * Switch back to real Bedrock when quotas are available.
 */

import { MongoDBService } from './mongodbService';

export class MockBedrockService {
  private mongoService: MongoDBService;

  constructor() {
    this.mongoService = new MongoDBService();
  }

  async processQuery(
    customerId: string,
    query: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const queries = query.toLowerCase();
    
    // Fetch transactions
    let transactions: any[];
    
    if (customerId.toUpperCase() === 'ALL') {
      transactions = await this.mongoService.getAllTransactions();
    } else {
      transactions = await this.mongoService.getCustomerTransactions(customerId);
    }

    if (transactions.length === 0) {
      const msg = `No tolling transactions found${customerId.toUpperCase() === 'ALL' ? '' : ` for customer ${customerId}`}.`;
      if (onChunk) {
        onChunk(msg);
      }
      return msg;
    }

    // Generate response based on query keywords
    let response = '';

    if (queries.includes('total') && queries.includes('amount')) {
      const total = transactions.reduce(
        (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
        0
      );
      response = `The total toll amount ${customerId.toUpperCase() === 'ALL' ? 'across all customers' : `for customer ${customerId}`} is $${total.toFixed(2)} across ${transactions.length} transactions.`;
    } 
    else if (queries.includes('month')) {
      const thisMonth = new Date();
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      
      const monthTransactions = transactions.filter(t => 
        new Date(t.tolltime) >= startOfMonth
      );
      
      if (monthTransactions.length === 0) {
        response = `No tolling transactions found in ${thisMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
      } else {
        const monthTotal = monthTransactions.reduce(
          (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
          0
        );
        response = `This month (${thisMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}), you have ${monthTransactions.length} toll transactions totaling $${monthTotal.toFixed(2)}.`;
      }
    }
    else if (queries.includes('week')) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      
      const weekTransactions = transactions.filter(t => 
        new Date(t.tolltime) >= startOfWeek
      );
      
      if (weekTransactions.length === 0) {
        response = `No tolling transactions found this week.`;
      } else {
        const weekTotal = weekTransactions.reduce(
          (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
          0
        );
        response = `This week, you have ${weekTransactions.length} toll transactions totaling $${weekTotal.toFixed(2)}.`;
      }
    }
    else if (queries.includes('average')) {
      const total = transactions.reduce(
        (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
        0
      );
      const average = total / transactions.length;
      response = `The average toll amount per transaction is $${average.toFixed(2)}.`;
    }
    else if (queries.includes('highest') || queries.includes('maximum') || queries.includes('max')) {
      const amounts = transactions
        .map((t: any) => t.toll_amount || 0)
        .filter(a => a > 0);
      const max = Math.max(...amounts);
      response = `The highest toll amount is $${max.toFixed(2)}.`;
    }
    else if (queries.includes('lowest') || queries.includes('minimum') || queries.includes('min')) {
      const amounts = transactions
        .map((t: any) => t.toll_amount || 0)
        .filter(a => a > 0);
      const min = Math.min(...amounts);
      response = `The lowest toll amount is $${min.toFixed(2)}.`;
    }
    else if (queries.includes('location') || queries.includes('point')) {
      const locations = [...new Set(transactions.map((t: any) => t.toll_point_name))];
      response = `Your tolling activity has been at these locations: ${locations.join(', ')}.`;
    }
    else if (queries.includes('how many') || queries.includes('count')) {
      response = `You have ${transactions.length} total tolling transactions on record.`;
    }
    else {
      // Default fallback response
      const total = transactions.reduce(
        (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
        0
      );
      response = `Based on your tolling data: ${transactions.length} total transactions, $${total.toFixed(2)} total amount spent. The average per transaction is $${(total / transactions.length).toFixed(2)}. For more detailed analysis, please ask about specific time periods (month, week) or statistics (highest, lowest, average).`;
    }

    // Stream response if callback provided
    if (onChunk) {
      const words = response.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return response;
  }
}
