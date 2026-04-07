import { handleAIResponse } from '../src/utils/ai/engine';

async function testMathZero() {
  const SENDER = '2348000000000'; 
  const BOT_ID = '90069502-861f-4f65-8dbf-ae77995133b3'; 

  console.log("🚀 [Test] Starting Math-Zero Verification...");

  // Test 1: Currency Conversion
  console.log("\n--- TEST 1: Currency Conversion (Should trigger convert_currency) ---");
  const resp1 = await handleAIResponse(SENDER, "How much is $150 in Naira using today's rate?", BOT_ID);
  console.log("Response 1:", resp1);

  // Test 2: Product Price Lookup
  console.log("\n--- TEST 2: Product Price Lookup (Should trigger lookup_verified_product_price) ---");
  const resp2 = await handleAIResponse(SENDER, "How much does the iPhone 15 cost?", BOT_ID);
  console.log("Response 2:", resp2);
}

testMathZero();
