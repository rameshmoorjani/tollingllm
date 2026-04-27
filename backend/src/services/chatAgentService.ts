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
        // Fetch all transactions across all customers
        transactions = await this.mongoService.getAllTransactions();
        isAllCustomers = true;
      } else {
        // Fetch single customer transactions
        transactions = await this.mongoService.getCustomerTransactions(customerId);
      }

      if (transactions.length === 0) {
        return `No tolling transactions found${isAllCustomers ? '' : ` for customer ${customerId}`}.`;
      }

      // Generate prompt for SageMaker
      const prompt = this.generatePrompt(customerId, transactions, query, isAllCustomers);

      // Call Bedrock
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

  private generatePrompt(
    customerId: string,
    transactions: any[],
    userQuery: string,
    isAllCustomers: boolean = false
  ): string {
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
      // Build customer summary for all-customers mode
      const customerMap: any = {};
      transactions.forEach((t: any) => {
        if (!customerMap[t.customer_id]) {
          customerMap[t.customer_id] = {
            customer_id: t.customer_id,
            total_amount: 0,
            transaction_count: 0,
            max_toll: 0,
            min_toll: Infinity,
            status_breakdown: {
              completed: 0,
              error: 0,
              incomplete: 0,
              pending: 0,
            },
            transactions: [],
          };
        }
        customerMap[t.customer_id].total_amount += t.toll_amount ? Math.max(t.toll_amount, 0) : 0;
        customerMap[t.customer_id].transaction_count += 1;
        
        // Track status
        const status = t.tollstatus ? t.tollstatus.toLowerCase() : 'unknown';
        if (status === 'completed') {
          customerMap[t.customer_id].status_breakdown.completed += 1;
        } else if (status === 'error') {
          customerMap[t.customer_id].status_breakdown.error += 1;
        } else if (status === 'incomplete') {
          customerMap[t.customer_id].status_breakdown.incomplete += 1;
        } else if (status === 'pending') {
          customerMap[t.customer_id].status_breakdown.pending += 1;
        }
        
        const amount = t.toll_amount ? Math.max(t.toll_amount, 0) : 0;
        customerMap[t.customer_id].max_toll = Math.max(
          customerMap[t.customer_id].max_toll,
          amount
        );
        customerMap[t.customer_id].min_toll = Math.min(
          customerMap[t.customer_id].min_toll,
          amount
        );
        customerMap[t.customer_id].transactions.push(t);
      });

      // Sort customers by total amount spent
      const sortedCustomers = Object.values(customerMap)
        .sort((a: any, b: any) => b.total_amount - a.total_amount);

      const customerSummary = sortedCustomers
        .map((c: any) => {
          const minToll = c.min_toll === Infinity ? 0 : c.min_toll;
          const statusStr = `completed: ${c.status_breakdown.completed}, error: ${c.status_breakdown.error}, incomplete: ${c.status_breakdown.incomplete}, pending: ${c.status_breakdown.pending}`;
          return `- ${c.customer_id}: $${c.total_amount.toFixed(2)} total (${c.transaction_count} transactions: ${statusStr}, max: $${c.max_toll.toFixed(2)}, min: $${minToll.toFixed(2)})`;
        })
        .join('\n');

      const dataContext = `
ANALYSIS MODE: ALL CUSTOMERS (Cross-Customer Analysis)

Total Customers: ${Object.keys(customerMap).length}
Total Transactions: ${totalTransactions}
Total Amount Across All Customers: $${totalAmount.toFixed(2)}
Overall Average Per Transaction: $${(totalAmount / totalTransactions).toFixed(2)}
Successful Connections: ${successfulTransactions}/${totalTransactions} (${((successfulTransactions / totalTransactions) * 100).toFixed(1)}%)
All Toll Locations: ${locations.join(', ')}

TRANSACTION STATUS SUMMARY:
${(() => {
  let errorCount = 0, incompleteCount = 0, pendingCount = 0, completedCount = 0;
  Object.values(customerMap).forEach((c: any) => {
    errorCount += c.status_breakdown.error;
    incompleteCount += c.status_breakdown.incomplete;
    pendingCount += c.status_breakdown.pending;
    completedCount += c.status_breakdown.completed;
  });
  return `- Completed: ${completedCount}
- Error: ${errorCount}
- Incomplete: ${incompleteCount}
- Pending: ${pendingCount}`;
})()}

CUSTOMER SUMMARY (Sorted by Total Spending):
${customerSummary}

User Query: ${userQuery}

Based on the customer summary and transaction data above, answer the user's query about cross-customer toll analysis. Provide specific customer IDs and amounts when relevant. When asked about error transactions, carefully count the error statuses for each customer.`;

      return dataContext;
    } else {
      // Original single-customer mode
      const transactionDetails = transactions
        .map((t: any) => {
          const date = new Date(t.tolltime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          const time = new Date(t.tolltime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          return `- ${date} at ${time}: ${t.toll_point_name} - $${(t.toll_amount || 0).toFixed(2)}`;
        })
        .join('\n');

      const dataContext = `
Customer ID: ${customerId}
Total Transactions: ${totalTransactions}
Total Amount: $${totalAmount.toFixed(2)}
Successful Connections: ${successfulTransactions}/${totalTransactions} (${((successfulTransactions / totalTransactions) * 100).toFixed(1)}%)
Toll Locations: ${locations.join(', ')}
Date Range: ${new Date(transactions[0].tolltime).toLocaleDateString()} to ${new Date(transactions[transactions.length - 1].tolltime).toLocaleDateString()}

DETAILED TRANSACTION HISTORY:
${transactionDetails}

User Query: ${userQuery}

Based on the detailed transaction history above, answer the customer's query about their tolling activity. If they ask about a specific date, locate that date in the transaction list and provide the exact amount. For aggregate questions, use the summary statistics provided.`;

      return dataContext;
    }
  }
}
