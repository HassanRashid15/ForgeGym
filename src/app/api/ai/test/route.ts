import { NextResponse } from 'next/server';
import { getConfiguredProviders, simpleCompletion } from '@/lib/ai';

export async function GET() {
  try {
    console.log('🔍 Checking configured AI providers...\n');

    const providers = getConfiguredProviders();
    console.log('✅ Configured providers:', providers);

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'No AI providers are configured. Please check your .env file.' },
        { status: 400 }
      );
    }

    const results: Record<string, { success: boolean; content?: string; error?: string }> = {};

    for (const provider of providers) {
      try {
        console.log(`Testing ${provider}...`);
        const result = await simpleCompletion('Say "Hello" in one word.', { provider });
        console.log(`✅ ${provider}: ${result.content.substring(0, 50)}...`);
        results[provider] = {
          success: true,
          content: result.content,
        };
      } catch (error: any) {
        console.log(`❌ ${provider}: Failed - ${error.message}`);
        results[provider] = {
          success: false,
          error: error.message,
        };
      }
    }

    return NextResponse.json({
      providers,
      results,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
