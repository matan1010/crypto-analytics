import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Both client-side and server-side keys
const clientKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const serverKey = process.env.OPENAI_API_KEY || clientKey;

// Log environment info (for debugging)
console.log("Environment check:");
console.log("- NEXT_PUBLIC key exists:", !!process.env.NEXT_PUBLIC_OPENAI_API_KEY);
console.log("- OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("- Using key:", serverKey ? "Yes (Redacted)" : "No key available");

// Check if API key exists
if (!serverKey) {
  console.warn("WARNING: Missing OpenAI API key. Chat functionality will not work.");
}

const openai = new OpenAI({
  apiKey: serverKey,
});

export async function POST(request: Request) {
  console.log("API route called");
  try {
    // Check for API key again to provide a better error message
    if (!serverKey) {
      console.error("API call failed: No OpenAI API key");
      return NextResponse.json(
        { error: 'OpenAI API key is not configured on the server' },
        { status: 500 }
      );
    }

    const { messages, marketData } = await request.json();
    console.log("Received request with messages:", messages.length);

    const systemMessage = {
      role: 'system',
      content: `You are a cryptocurrency market analyst assistant. You have access to the following real-time market data for ${marketData.symbol}:
      - Current Price: $${marketData.price}
      - 24h Price Change: ${marketData.priceChange24h}%
      - 24h Volume: $${marketData.volume24h}
      
      Provide analysis, insights, and answer questions based on this data. Be concise but informative.`,
    };

    console.log("Calling OpenAI API...");
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    });
    console.log("OpenAI API returned successfully");

    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // More detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat request', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 