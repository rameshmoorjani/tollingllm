import { MongoDBService } from './mongodbService';
import { BedrockService } from './bedrockService';
import crypto from 'crypto';

interface Transaction {
  customer_id: string;
  toll_amount: number;
  toll_point_name: string;
  tolltime: Date;
  tollstatus: string;
  connection_status: boolean;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class ChatAgentService {
  private mongoService: MongoDBService;
  private bedrockService: BedrockService;
  
  // Request queue to prevent rate limiting
  private requestQueue: Promise<any> = Promise.resolve();
  private minRequestIntervalMs = 3000; // Increased from 1000 to 3000 (3 seconds) to stay within Mistral TPM limits while quota increases
  private lastRequestTime = 0;

  // Response cache to avoid repeated Bedrock calls
  private responseCache: Map<string, CacheEntry> = new Map();
  private cacheExpireMs = 3600000; // 1 hour cache TTL

  constructor() {
    this.mongoService = new MongoDBService();
    this.bedrockService = new BedrockService();
  }

  /**
   * Generate a cache key from customer ID, query, and transaction count
   */
  private getCacheKey(customerId: string, query: string, transactionCount: number): string {
    const keyData = `${customerId}:${query}:${transactionCount}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  /**
   * Check if a cached response exists and is still valid
   */
  private getCachedResponse(cacheKey: string): string | null {
    const entry = this.responseCache.get(cacheKey);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    console.log(`✅ Cache hit! Using cached response (${age}ms old)`);
    return entry.response;
  }

  /**
   * Store a response in cache
   */
  private setCachedResponse(cacheKey: string, response: string): void {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl: this.cacheExpireMs,
    });
    console.log(`💾 Cached response for future use`);
  }

  /**
   * Queue a Bedrock request to prevent concurrent rate limiting
   */
  private async queueBedrockRequest<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue = this.requestQueue
        .then(async () => {
          // Ensure minimum interval between requests
          const timeSinceLastRequest = Date.now() - this.lastRequestTime;
          if (timeSinceLastRequest < this.minRequestIntervalMs) {
            await new Promise(r => 
              setTimeout(r, this.minRequestIntervalMs - timeSinceLastRequest)
            );
          }
          
          this.lastRequestTime = Date.now();
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
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

      // Check cache first (avoid Bedrock call if we have a recent response)
      const cacheKey = this.getCacheKey(customerId, query, transactions.length);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        if (onChunk) {
          // Stream the cached response in chunks
          const words = cachedResponse.split(' ');
          for (const word of words) {
            onChunk(word + ' ');
          }
        }
        return cachedResponse;
      }

      // Generate prompt for Bedrock
      const prompt = this.generatePrompt(customerId, transactions, query, isAllCustomers);

      // Queue Bedrock request to prevent rate limiting
      try {
        let response: string;
        if (onChunk) {
          const result = await this.queueBedrockRequest(() =>
            this.bedrockService.streamInvoke({ prompt }, onChunk)
          );
          response = result.message;
        } else {
          const result = await this.queueBedrockRequest(() =>
            this.bedrockService.invoke({ prompt })
          );
          response = result.message;
        }

        // Cache the response for future use
        this.setCachedResponse(cacheKey, response);

        return response;
      } catch (bedrockError: any) {
        const errorMsg = bedrockError.message || JSON.stringify(bedrockError);
        console.error('Bedrock error:', errorMsg);
        
        // Check if this is a rate limit or quota error
        const isQuotaExhausted = 
          errorMsg.includes('Too many tokens') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('Rate limit') ||
          errorMsg.includes('Too many requests') ||
          errorMsg.includes('ThrottlingException');
        
        // If Bedrock is down due to quota/rate limiting, use data analysis fallback
        if (isQuotaExhausted) {
          console.log('⚠️  Bedrock service unavailable, switching to data analysis mode...');
          
          const fallbackResponse = this.analyzeTransactionsDirectly(
            customerId,
            transactions,
            query,
            isAllCustomers
          );
          
          // Add notice that this is from fallback
          const response = `[AI Service Status: Using data analysis mode due to service limits]\n\n${fallbackResponse}`;
          
          // Cache this fallback response too
          this.setCachedResponse(cacheKey, response);
          
          if (onChunk) {
            // Stream the fallback response
            const words = response.split(' ');
            for (const word of words) {
              onChunk(word + ' ');
            }
          }
          
          return response;
        }
        
        // For other errors, throw them
        throw bedrockError;
      }
    } catch (error: any) {
      const errorMsg = error.message || JSON.stringify(error);
      console.error('Chat agent error:', errorMsg);
      
      // Check if this is a quota-related error that we couldn't handle
      if (errorMsg.includes('Too many tokens') || 
          errorMsg.includes('Rate limit') || 
          errorMsg.includes('ThrottlingException')) {
        throw new Error(`AI service temporarily unavailable. Please try again in 30 seconds. Details: ${errorMsg}`);
      }
      
      throw new Error(`Failed to process query: ${errorMsg}`);
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

    // Check if query mentions a specific toll location
    const locationMatch = query.match(/(?:Toll|Exit|Mile Marker|Plaza|Bridge|Skyway|Point|Booth)[^.!?]*/gi);
    if (locationMatch && locationMatch.length > 0) {
      const mentionedLocation = locationMatch[0].trim();
      const locationTransactions = transactions.filter((t: any) => 
        t.toll_point_name.toLowerCase().includes(mentionedLocation.toLowerCase())
      );
      
      if (locationTransactions.length > 0) {
        if (isAllCustomers) {
          // Show which customers used this location
          const customerMap: {[key: string]: number} = {};
          locationTransactions.forEach((t: any) => {
            customerMap[t.customer_id] = (customerMap[t.customer_id] || 0) + 1;
          });
          const topCustomers = Object.entries(customerMap)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([cust, count]) => `${cust} (${count} times)`)
            .join(', ');
          return `At ${mentionedLocation}, the following customers passed through: ${topCustomers}. Total combined transactions: ${locationTransactions.length}.`;
        } else {
          // Show how many times this customer used this location
          const locationAmount = locationTransactions.reduce((sum: number, t: any) => 
            sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0), 0
          );
          return `Customer ${customerId} has crossed ${mentionedLocation} ${locationTransactions.length} times, spending $${locationAmount.toFixed(2)} at this location.`;
        }
      } else {
        return `No transactions found for ${mentionedLocation}. This location may not exist in the records.`;
      }
    }

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
    // Limit to last 20 transactions (not 50) to drastically reduce tokens for TPM limit
    const limitedTransactions = transactions.slice(-20);
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce(
      (sum: number, t: any) => sum + (t.toll_amount ? Math.max(t.toll_amount, 0) : 0),
      0
    );
    const successfulTransactions = transactions.filter(
      (t: any) => t.connection_status
    ).length;
    const locations = [...new Set(transactions.map((t: any) => t.toll_point_name))];

    // Calculate date range for context
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const earliestDate = transactions.length > 0 
      ? new Date(transactions[0].tolltime).toISOString().split('T')[0]
      : todayStr;
    const latestDate = transactions.length > 0 
      ? new Date(transactions[transactions.length - 1].tolltime).toISOString().split('T')[0]
      : todayStr;

    // Calculate monthly breakdown
    const monthlyData: any = {};
    transactions.forEach((t: any) => {
      const date = new Date(t.tolltime);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, total: 0 };
      }
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].total += t.toll_amount ? Math.max(t.toll_amount, 0) : 0;
    });

    const monthlyStr = Object.entries(monthlyData)
      .map((entry: any) => `${entry[0]}: $${entry[1].total.toFixed(2)} (${entry[1].count} txn)`)
      .join(' | ');

    if (isAllCustomers) {
      // Build ultra-minimal customer summary
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
        .slice(0, 5)  // Reduced from 10 to 5
        .map((entry: any) => `${entry[0]}: $${entry[1].total_amount.toFixed(2)}`)
        .join('; ');

      // Enhanced format with date context
      const dataContext = `TODAY: ${todayStr}
CUSTOMERS: ${Object.keys(customerMap).length}, TOTAL: $${totalAmount.toFixed(2)}, TXN: ${totalTransactions}
MONTHLY: ${monthlyStr}
TOP: ${topCustomers}
Q: ${userQuery}
Answer in 1-2 sentences.`;

      return dataContext;
    } else {
      // Single customer - improved format with dates
      const recentTxns = limitedTransactions
        .map((t: any) => {
          const date = new Date(t.tolltime).toISOString().split('T')[0];
          return `${date}: $${(t.toll_amount || 0).toFixed(2)}`;
        })
        .join(' | ');

      // Enhanced format with date context
      const dataContext = `TODAY: ${todayStr}
CUST: ${customerId}
DATA RANGE: ${earliestDate} to ${latestDate}
MONTHLY: ${monthlyStr}
TOTAL: $${totalAmount.toFixed(2)} (${totalTransactions} TXN)
RECENT: ${recentTxns}
LOCS: ${locations.join('; ')}
Q: ${userQuery}
ANSWER in 1-2 sentences. If asked about specific months, reference MONTHLY data above.`;

      return dataContext;
    }
  }
}
