import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DEBUG_LOG_FILE = path.join('/tmp', 'bedrock-debug.log');

function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} - ${message}\n`;
  console.error(logLine);
  try {
    fs.appendFileSync(DEBUG_LOG_FILE, logLine);
  } catch (e) {
    // Silently fail if we can't write to file
  }
}

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

    debugLog(`🤖 AWS Bedrock Service initialized`);
    debugLog(`📍 Region: ${region}`);
    debugLog(`📊 Model: ${this.modelId}`);
    debugLog(`💡 Expected response time: <1 second`);
  }

  async invoke(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = 3;

    const attemptInvoke = async (): Promise<LLMResponse> => {
      try {
        const prompt = request.prompt;
        const temperature = request.temperature || 0.7;
        const maxTokens = request.max_tokens || 2048;

        debugLog(`📤 Calling Bedrock with model: ${this.modelId} (attempt ${retries + 1}/${maxRetries + 1})`);
        debugLog(`📝 Prompt length: ${prompt.length} chars`);

        // Prepare payload for Llama 3.1 model
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

        debugLog(`🔄 Sending request to Bedrock...`);
        const response = await this.client.send(command);
        debugLog(`✅ Got response from Bedrock`);

        const responseText = new TextDecoder().decode(response.body);
        debugLog(`📨 Raw response: ${responseText.substring(0, 200)}`);

        const responseBody = JSON.parse(responseText);
        debugLog(`📦 Parsed response body: ${JSON.stringify(responseBody).substring(0, 300)}`);
        
        const message = responseBody.generation || responseBody.output?.text || '';
        debugLog(`💬 Extracted message length: ${message.length}`);

        if (!message) {
          debugLog(`❌ Empty message in response: ${JSON.stringify(responseBody)}`);
          throw new Error('Empty response from Bedrock');
        }

        const processingTime = Date.now() - startTime;

        debugLog(`✅ Bedrock response received in ${processingTime}ms`);
        debugLog(`📄 Message length: ${message.length} chars`);
        return {
          message: message.trim(),
          processing_time_ms: processingTime,
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        const errorMsg = error.message || JSON.stringify(error);
        
        // Check if this is a throttling/quota error (429 or token limit)
        const isThrottled = error.$metadata?.httpStatusCode === 429 || 
                           errorMsg.includes('Too many tokens') ||
                           errorMsg.includes('Rate exceeded') ||
                           errorMsg.includes('quota');
        
        if (isThrottled && retries < maxRetries) {
          const waitTime = Math.pow(2, retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          debugLog(`⏳ Rate limited/quota exceeded. Retrying in ${waitTime}ms (attempt ${retries + 1}/${maxRetries})...`);
          debugLog(`📝 Error: ${errorMsg}`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return attemptInvoke(); // Recursive retry
        }

        // Handle specific quota/token limit errors
        if (errorMsg.includes('Too many tokens') || errorMsg.includes('quota')) {
          debugLog(`❌ Token/Quota limit reached. User should wait and retry.`);
          throw new Error(
            'Too many requests to AI service. Please wait a few minutes and try again. ' +
            'If this persists, admin should check AWS Bedrock quotas.'
          );
        }

        debugLog(`❌ Bedrock error after ${processingTime}ms: ${errorMsg}`);
        debugLog(`🔍 Full error: ${JSON.stringify(error)}`);
        throw error;
      }
    };

    return attemptInvoke();
  }

  async streamInvoke(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = 3;

    const attemptInvoke = async (): Promise<LLMResponse> => {
      try {
        const prompt = request.prompt;
        const temperature = request.temperature || 0.7;
        const maxTokens = request.max_tokens || 2048;

        debugLog(`📤 Stream: Calling Bedrock with model: ${this.modelId} (attempt ${retries + 1}/${maxRetries + 1})`);
        debugLog(`📝 Stream: Prompt length: ${prompt.length} chars`);

        // For streaming with Bedrock, we'll use regular invoke and split response
        // since streaming requires a different API approach
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

        debugLog(`🔄 Stream: Sending request to Bedrock...`);
        const response = await this.client.send(command);
        debugLog(`✅ Stream: Got response from Bedrock`);

        const responseText = new TextDecoder().decode(response.body);
        debugLog(`📨 Stream: Raw response: ${responseText.substring(0, 200)}`);
        
        const responseBody = JSON.parse(responseText);
        debugLog(`📦 Stream: Parsed response body keys: ${Object.keys(responseBody).join(', ')}`);

        const fullMessage = responseBody.generation || '';
        debugLog(`💬 Stream: Extracted message length: ${fullMessage.length}`);

        if (!fullMessage) {
          debugLog(`❌ Stream: Empty message in response: ${JSON.stringify(responseBody)}`);
          throw new Error('Empty response from Bedrock');
        }

        // Simulate streaming by splitting response into chunks
        const words = fullMessage.split(' ');
        debugLog(`📤 Stream: Splitting into ${words.length} chunks`);
        for (const word of words) {
          onChunk(word + ' ');
        }

        const processingTime = Date.now() - startTime;

        debugLog(`✅ Stream: Bedrock stream completed in ${processingTime}ms`);
        return {
          message: fullMessage.trim(),
          processing_time_ms: processingTime,
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        const errorMsg = error.message || JSON.stringify(error);
        
        // Check if this is a throttling/quota error
        const isThrottled = error.$metadata?.httpStatusCode === 429 || 
                           errorMsg.includes('Too many tokens') ||
                           errorMsg.includes('Rate exceeded') ||
                           errorMsg.includes('quota');
        
        if (isThrottled && retries < maxRetries) {
          const waitTime = Math.pow(2, retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          debugLog(`⏳ Stream: Rate limited/quota exceeded. Retrying in ${waitTime}ms (attempt ${retries + 1}/${maxRetries})...`);
          debugLog(`📝 Stream error: ${errorMsg}`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return attemptInvoke(); // Recursive retry
        }

        // Handle specific quota/token limit errors
        if (errorMsg.includes('Too many tokens') || errorMsg.includes('quota')) {
          debugLog(`❌ Token/Quota limit reached in stream.`);
          throw new Error(
            'Too many requests to AI service. Please wait a few minutes and try again.'
          );
        }

        debugLog(`❌ Stream error after ${processingTime}ms: ${errorMsg}`);
        debugLog(`🔍 Stream: Full error: ${JSON.stringify(error)}`);
        throw error;
      }
    };

    return attemptInvoke();
  }
}
