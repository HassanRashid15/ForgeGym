import { getConfiguredProviders, simpleCompletion } from './src/lib/ai.ts';

console.log('🔍 Checking configured AI providers...\n');

const providers = getConfiguredProviders();
console.log('✅ Configured providers:', providers);

if (providers.length === 0) {
  console.log('❌ No AI providers are configured. Please check your .env file.');
  process.exit(1);
}

console.log('\n🧪 Testing each provider...\n');

for (const provider of providers) {
  try {
    console.log(`Testing ${provider}...`);
    const result = await simpleCompletion('Say "Hello" in one word.', { provider });
    console.log(`✅ ${provider}: ${result.content.substring(0, 50)}...`);
  } catch (error) {
    console.log(`❌ ${provider}: Failed - ${error.message}`);
  }
}

console.log('\n✨ Test complete!');
