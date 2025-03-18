import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Use NEXT_PUBLIC_OPENAI_API_KEY instead of OPENAI_API_KEY
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

// Check if API key exists
if (!apiKey) {
  console.warn("WARNING: Missing OpenAI API key. Chat functionality will not work.");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function POST(request: Request) {
  try {
    // Check for API key again to provide a better error message
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { messages, marketData } = await request.json();

    const systemMessage = {
      role: 'system',
      content: `You are a cryptocurrency market analyst assistant. You have access to the following real-time market data for ${marketData.symbol}:
      - Current Price: $${marketData.price}
      - 24h Price Change: ${marketData.priceChange24h}%
      - 24h Volume: $${marketData.volume24h}
      
      Provide analysis, insights, and answer questions based on this data. Be concise but informative.`,
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 