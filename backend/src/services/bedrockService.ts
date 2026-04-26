import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelStreamingCommand,
} from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';

dotenv.config();

interface LLMRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

interface LLMResponse {
  message: string;
  processing_time_ms: number;
}

/**
 * AWS Bedrock LLM Service
 * 
 * Supported models (use model IDs):
 * - meta.llama3-8b-instruct-v1:0 (fast, good quality) - RECOMMENDED
 * - mistral.mistral-7b-instruct-v0:2 (fast, multilingual)
 * - meta.llama3-70b-instruct-v1:0 (larger, more capable)
 * - anthropic.claude-haiku-20242022-12-06 (slower but very accurate)
 * 
 * Setup Instructions:
 * 1. Export AWS credentials:
 *    - AWS_REGION: us-east-1 (or your region)
 *    - AWS_ACCESS_KEY_ID: your-access-key
 *    - AWS_SECRET_ACCESS_KEY: your-secret-key
 * 2. Ensure Bedrock is enabled in your AWS account
 * 3. Request model access if needed
 */
export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const modelId = process.env.BEDROCK_MODEL || 'meta.llama3-8b-instruct-v1:0';

    this.client = new BedrockRuntimeClient({ region });
    this.modelId = modelId;

    console.log(`🤖 AWS Bedrock Service initialized`);
    console.log(`📍 Region: ${region}`);
    console.log(`📊 Model: ${this.modelId}`);
    console.log(`💡 Expected response time: <1 second`);
  }

  async invoke(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const prompt = request.prompt;
      const temperature = request.temperature || 0.7;
      const maxTokens = request.max_tokens || 2048;

      // Prepare payload for Llama 3.1 model
      // Format: <|begin_of_text|><|start_header_id|>user<|end_header_id|>{prompt}<|eot_id|>...
      const payload = {
        prompt: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        max_gen_len: maxTokens,
        temperature,
        top_p: 0.9,
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json',
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const message = responseBody.generation || '';

      if (!message) {
        throw new Error('Empty response from Bedrock');
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ Bedrock response received in ${processingTime}ms`);
      return {
        message: message.trim(),
        processing_time_ms: processingTime,
      };
    } catch (error: any) {
      console.error('❌ Bedrock invocation error:', error.message || error);
      throw error;
    }
  }

  async streamInvoke(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const prompt = request.prompt;
      const temperature = request.temperature || 0.7;
      const maxTokens = request.max_tokens || 2048;

      // Prepare payload for Llama 3.1 model
      const payload = {
        prompt: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        max_gen_len: maxTokens,
        temperature,
        top_p: 0.9,
      };

      const command = new InvokeModelStreamingCommand({
        modelId: this.modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json',
      });

      const response = await this.client.send(command);

      if (!response.stream) {
        throw new Error('No stream available from Bedrock');
      }

      let fullMessage = '';

      for await (const event of response.stream) {
        if (event.contentBlockDelta?.delta?.text) {
          const text = event.contentBlockDelta.delta.text;
          fullMessage += text;
          onChunk(text);
        }
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ Bedrock stream completed in ${processingTime}ms`);
      return {
        message: fullMessage.trim(),
        processing_time_ms: processingTime,
      };
    } catch (error: any) {
      console.error('❌ Bedrock stream error:', error.message || error);
      throw error;
    }
  }
}
