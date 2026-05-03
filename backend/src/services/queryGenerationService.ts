import { BedrockService } from './bedrockService';

/**
 * Query Generation Service
 * 
 * Uses LLM to dynamically generate MongoDB queries based on natural language questions
 * This eliminates the need for hardcoded patterns
 */
export class QueryGenerationService {
  private bedrockService: BedrockService;

  constructor() {
    this.bedrockService = new BedrockService();
  }

  /**
   * Generate MongoDB aggregation query from natural language question
   */
  async generateQuery(question: string, schema: string): Promise<string> {
    const prompt = `You are a MongoDB expert. Given a database schema and a question, 
generate ONLY a MongoDB aggregation pipeline query.

SCHEMA:
${schema}

QUESTION: "${question}"

RULES:
1. Return ONLY valid MongoDB aggregation syntax
2. No explanations, no markdown, no code blocks
3. Start with [ and end with ]
4. Use $match, $group, $sort, $limit, $project as needed
5. For "most"/"highest" use -1 sort
6. For "least"/"lowest" use 1 sort
7. Always include $limit: 10 unless asking for totals

Example format:
[{$group: {_id: '$customer_id', total: {$sum: '$toll_amount'}}}, {$sort: {total: -1}}, {$limit: 1}]

Generate the query:`;

    try {
      const result = await this.bedrockService.invoke({
        prompt,
        max_tokens: 500,
        temperature: 0.1, // Low temperature for precise output
      });

      const query = result.message.trim();
      return this.validateAndSanitizeQuery(query);
    } catch (error: any) {
      console.error('Query generation error:', error.message);
      throw new Error(`Failed to generate query: ${error.message}`);
    }
  }

  /**
   * Validate generated query before execution
   * Prevents injection attacks and ensures valid MongoDB syntax
   */
  private validateAndSanitizeQuery(query: string): string {
    // Remove markdown code blocks if present
    let cleaned = query.replace(/```json\n?|\n?```/g, '').trim();
    cleaned = query.replace(/```\n?|\n?```/g, '').trim();

    // Verify it looks like a valid aggregation pipeline
    if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) {
      throw new Error('Invalid aggregation pipeline format');
    }

    // Basic validation: check for dangerous operations
    const dangerousOps = ['$function', '$eval', 'exec', 'system'];
    for (const op of dangerousOps) {
      if (cleaned.toLowerCase().includes(op)) {
        throw new Error(`Dangerous operation detected: ${op}`);
      }
    }

    // Try to parse as JSON to ensure valid syntax
    try {
      const pipeline = JSON.parse(cleaned);
      if (!Array.isArray(pipeline)) {
        throw new Error('Pipeline must be an array');
      }
      return JSON.stringify(pipeline);
    } catch (e) {
      throw new Error(`Invalid JSON in query: ${e}`);
    }
  }

  /**
   * Generate natural language explanation of query results
   */
  async explainResults(question: string, results: any[]): Promise<string> {
    const prompt = `Question: "${question}"

Results: ${JSON.stringify(results, null, 2)}

Provide a concise, natural language answer (1-2 sentences) based on the results. 
If empty results, explain that no data was found.`;

    try {
      const result = await this.bedrockService.invoke({
        prompt,
        max_tokens: 300,
        temperature: 0.7,
      });

      return result.message.trim();
    } catch (error: any) {
      console.error('Result explanation error:', error.message);
      throw new Error(`Failed to explain results: ${error.message}`);
    }
  }

  /**
   * Get MongoDB schema description for LLM
   */
  getSchemaDescription(): string {
    return `
Database: tollingdb
Collection: transactions

Schema:
{
  _id: ObjectId,
  customer_id: string (e.g., "CUST001"),
  toll_amount: number (e.g., 5.50),
  toll_point_name: string (e.g., "Golden Gate Bridge"),
  tolltime: Date (ISO format),
  tollstatus: string (Completed, Pending, Failed, Error),
  connection_status: boolean,
  state: string (California, Massachusetts, etc.)
}

Example Document:
{
  customer_id: "CUST001",
  toll_amount: 6.00,
  toll_point_name: "Toll Point B - Route 128",
  tolltime: 2024-04-16T06:45:00Z,
  tollstatus: "Completed",
  connection_status: true,
  state: "Massachusetts"
}

Common Queries:
- Total spending by customer: Use $group with $sum
- Count transactions: Use $count or $sum: 1
- Group by location: Use _id: '$toll_point_name'
- Filter by status: Use $match with tollstatus
- Filter by date range: Use $match with $gte/$lte on tolltime
- Top N results: Use $sort and $limit
`;
  }
}
