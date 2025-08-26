import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function POST(request: Request) {
  try {
    const { slideNumber, title, content } = await request.json();

    const prompt = `
      You are helping to create a natural, engaging presentation script for text-to-speech conversion.
      The presentation should flow smoothly and sound conversational when read aloud by TTS.
      
      Current Slide Information:
      Slide Number: ${slideNumber}
      Title: ${title}
      Content: ${content}
      
      CRITICAL INSTRUCTIONS for TTS-Ready Script:
      1. Generate ONLY speakable text - no stage directions, no formatting markers
      2. DO NOT include any bracketed instructions like {pause}, {slow down}, [emphasis], etc.
      3. DO NOT include any asterisks, dashes, or special formatting
      4. Write in complete, natural sentences that flow smoothly when read aloud
      5. Use proper punctuation (periods, commas) to create natural pauses
      6. The script should be 10-15 seconds (20-25 words) when spoken at normal pace
      7. Make it conversational and engaging, like a human presenter speaking naturally
      8. If this is slide 1, include a brief natural introduction
      9. If this appears to be a conclusion slide, provide a natural summary
      10. Expand on bullet points naturally without just reading them word-for-word
      
      Return ONLY the clean, speakable script text with no additional formatting or instructions.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = cleanScriptForTTS(response.text());

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    );
  }
}

function cleanScriptForTTS(script: string): string {
  let cleanScript = script
    .replace(/\{[^}]*\}/g, '') // Remove bracketed instructions
    .replace(/\[[^\]]*\]/g, '') // Remove square bracketed text
    .replace(/\([^)]*pause[^)]*\)/gi, '') // Remove pause instructions
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/#+/g, '') // Remove hash marks
    .replace(/_+/g, '') // Remove underscores
    .replace(/(pause|slow down|emphasize|dramatic pause)/gi, '') // Remove stage directions
    .replace(/\s+/g, ' ') // Clean up whitespace
    .trim();

  // Ensure proper sentence structure
  if (cleanScript && !cleanScript.match(/[.!?]$/)) {
    cleanScript += '.';
  }

  return cleanScript;
} 