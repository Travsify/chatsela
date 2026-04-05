import { generateBotConfig } from './src/app/dashboard/bot/actions';

async function runTests() {
  const urls = [
    'https://globalline.io',
    'https://stripe.com',
    'https://zara.com'
  ];

  for (const url of urls) {
    console.log(`\n>>> Testing: ${url}`);
    const res = await generateBotConfig(url);
    console.log(`Industry: ${res.industry}`);
    console.log(`Menu: ${res.menuOptions?.join(', ')}`);
  }
}

runTests().catch(console.error);
