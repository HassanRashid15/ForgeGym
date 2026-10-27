import { NextResponse } from 'next/server';
import { getConfiguredProviders } from '@/lib/ai';

export async function GET() {
  try {
    const providers = getConfiguredProviders();

    return NextResponse.json({
      providers,
      count: providers.length,
    });
  } catch (error: any) {
    console.error('Config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
