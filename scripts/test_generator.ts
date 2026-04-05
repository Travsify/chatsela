import { generateBotConfig } from './src/app/dashboard/bot/actions';

async function test(url: string) {
  console.log(`Testing URL: ${url}`);
  const result = await generateBotConfig(url);
  console.log('--- RESULT ---');
  console.log(JSON.stringify(result, null, 2));
}

test('https://globalline.io').catch(console.error);
