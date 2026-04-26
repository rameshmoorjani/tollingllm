import dotenv from 'dotenv';

dotenv.config();

interface SageMakerRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

interface SageMakerResponse {
  message: string;
  processing_time_ms: number;
}

/**
 * LLM Service - Uses Ollama (free, open-source)
 * 
 * Setup Instructions:
 * 1. Download Ollama from https://ollama.ai
 * 2. Run: ollama pull mistral (or llama2)
 * 3. Ollama starts automatically on http://localhost:11434
 * 
 * Supported models:
 * - mistral: Fast, good quality (recommended)
 * - llama2: Larger, more capable
 * - neural-chat: Good for conversations
 */
export class SageMakerService {
  private ollamaHost: string;
  private modelId: string;

  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.modelId = process.env.OLLAMA_MODEL || 'mistral';
    
    console.log(`🤖 LLM Service initialized`);
    console.log(`📍 Ollama Host: ${this.ollamaHost}`);
    console.log(`📊 Model: ${this.modelId}`);
    console.log(`💡 Ensure Ollama is running: ollama serve`);
    console.log(`   Then pull model: ollama pull ${this.modelId}`);
  }

  async invoke(request: SageMakerRequest): Promise<SageMakerResponse> {
    const startTime = Date.now();

    try {
      // Create abort controller with 10 minute timeout (600 seconds) - CPU inference is slow
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600000);

      try {
        const response = await fetch(`${this.ollamaHost}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.modelId,
            prompt: request.prompt,
            stream: false,
            temperature: request.temperature || 0.7,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 404 || errorText.includes('not found')) {
            throw new Error(
              `Model "${this.modelId}" not found on Ollama. ` +
              `Download it with: ollama pull ${this.modelId}`
            );
          }
          if (response.status === 502 || response.status === 503) {
            throw new Error(
              `Ollama is not running. Start it with: ollama serve`
            );
          }
          throw new Error(`Ollama API error: ${response.status} - ${errorText.slice(0, 200)}`);
        }

        const result = (await response.json()) as { response?: string };
        
        if (!result.response) {
          throw new Error('Empty response from Ollama');
        }

        const processingTime = Date.now() - startTime;

        console.log(`✅ LLM response received in ${processingTime}ms`);
        return {
          message: result.response.trim(),
          processing_time_ms: processingTime,
        };
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error('LLM request timeout (10 minutes). Phi model is very slow on CPU - consider using Groq Cloud for faster responses.');
        }
        throw error;
      }
    } catch (error: any) {
      console.error('❌ LLM invocation error:', error.message || error);
      throw error;
    }
  }

  async streamInvoke(
    request: SageMakerRequest,
    onChunk: (chunk: string) => void
  ): Promise<SageMakerResponse> {
    const startTime = Date.now();

    try {
      // Create abort controller with 10 minute timeout (600 seconds) for CPU inference
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600000);

      try {
        const response = await fetch(`${this.ollamaHost}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.modelId,
            prompt: request.prompt,
            stream: true,
            temperature: request.temperature || 0.7,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream available');
        }

        let fullMessage = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line) as { response?: string };
              if (json.response) {
                onChunk(json.response);
                fullMessage += json.response;
              }
            } catch {
              // Ignore parse errors from partial JSON
            }
          }
        }

        const processingTime = Date.now() - startTime;
        return {
          message: fullMessage.trim(),
          processing_time_ms: processingTime,
        };
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error('LLM request timeout (10 minutes). Phi model is very slow on CPU - consider using Groq Cloud for faster responses.');
        }
        throw error;
      }
    } catch (error: any) {
      console.error('❌ LLM stream invocation error:', error.message || error);
      throw error;
    }
  }
}
