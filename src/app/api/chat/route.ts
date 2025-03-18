import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
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