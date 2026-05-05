"use server";

import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createGame(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!process.env.GEMINI_API_KEY) return { error: "Missing GEMINI_API_KEY." };

  const title = formData.get('title') as string;
  const gameMode = formData.get('game_mode') as string;
  const generationMode = formData.get('generation_mode') as string;
  const questionCount = parseInt(formData.get('question_count') as string) || 10;
  const timePerQuestion = parseInt(formData.get('time_per_question') as string) || 30;
  const difficultyLevel = formData.get('difficulty_level') as string || 'mixed';
  const inputMode = formData.get('input_mode') as string;
  const reward = (formData.get('reward') as string) || null;

  // Build the Gemini prompt based on generation mode
  const modeInstruction = generationMode === 'guided'
    ? `Use the provided content as a thematic guide, but feel free to draw on broader general knowledge to craft challenging and diverse questions. Not all questions need to come directly from the text.`
    : `Generate all questions strictly and directly from the provided content. Every question must be answerable from the text alone.`;

  const difficultyInstruction = difficultyLevel === 'mixed'
    ? 'Use a mix of difficulties — approximately 40% Easy, 40% Intermediate, and 20% Hard.'
    : difficultyLevel === 'easy'
    ? 'All questions should be Easy — straightforward and accessible.'
    : difficultyLevel === 'hard'
    ? 'All questions should be Hard — challenging and nuanced.'
    : 'All questions should be Intermediate difficulty.';

  const promptText = `You are an expert quiz creator for a high-stakes, fast-paced live quiz platform.
Generate exactly ${questionCount} multiple choice questions.
${modeInstruction}
${difficultyInstruction}
Make the correct answers unambiguous. Each question needs exactly 4 options labeled A, B, C, D.`;

  // Build content parts based on input mode
  let geminiContents: any;
  const file = formData.get('document') as File | null;

  if (inputMode === 'file' && file && file.size > 0) {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      geminiContents = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: promptText }
        ]
      }];
    } else {
      // Plain text file
      const text = await file.text();
      geminiContents = [{ role: 'user', parts: [{ text: `${promptText}\n\nContent:\n${text}` }] }];
    }
  } else {
    const topic = formData.get('topic') as string;
    geminiContents = [{ role: 'user', parts: [{ text: `${promptText}\n\nTopic/Notes:\n${topic}` }] }];
  }

  // Generate questions via AI
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let questions = [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: geminiContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    text: { type: Type.STRING }
                  }
                }
              },
              correct_answer: { type: Type.STRING },
              difficulty: { type: Type.STRING }
            }
          }
        }
      }
    });
    questions = JSON.parse(response.text || "[]");
  } catch (err: any) {
    console.error("AI Generation Error:", err);
    return { error: "Failed to generate questions with AI. Please try again." };
  }

  if (!questions || questions.length === 0) return { error: "AI returned no questions." };

  // Create Game in Supabase
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: game, error: gameError } = await supabase.from('games').insert({
    title,
    mode: gameMode,
    join_code: joinCode,
    organiser_id: user.id,
    status: 'draft',
    reward: reward || null,
    question_count: questionCount,
    generation_mode: generationMode,
    time_per_question: timePerQuestion,
    difficulty_level: difficultyLevel,
  }).select().single();

  if (gameError) {
    console.error("Game Insert Error:", gameError);
    return { error: "Database error while creating game." };
  }

  // Insert Questions
  const formattedQuestions = questions.map((q: any, idx: number) => ({
    game_id: game.id,
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty || "Medium",
    order_index: idx
  }));

  const { error: qError } = await supabase.from('questions').insert(formattedQuestions);
  if (qError) return { error: "Database error while saving questions." };

  return { success: true, url: `/dashboard/game/${game.id}` };
}
