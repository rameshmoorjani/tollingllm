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
    const prompt = `Generate MongoDB aggregation pipeline for: "${question}"
Schema: ${schema}
Rules: Return ONLY valid JSON array, start with [ end with ], no explanations
Example: [{$group: {_id: '$toll_point_name', total: {$sum: '$toll_amount'}}}, {$sort: {total: -1}}, {$limit: 1}]`;

    try {
      const result = await this.bedrockService.invoke({
        prompt,
        max_tokens: 300,
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
Results: ${JSON.stringify(results)}
Answer in 1-2 sentences:`;

    try {
      const result = await this.bedrockService.invoke({
        prompt,
        max_tokens: 200,
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
    return `Collection: transactions
Fields: customer_id(string), toll_amount(number), toll_point_name(string), tolltime(Date), tollstatus(string), connection_status(bool), state(string)
Examples: {customer_id:"CUST001", toll_amount:6.0, toll_point_name:"Toll Point B", tolltime:2024-04-16T06:45:00Z, tollstatus:"Completed"}`;
  }
}
