"use server";

import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createGame(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = formData.get('title') as string;
  const mode = formData.get('mode') as string;
  const topic = formData.get('topic') as string;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  // 1. Generate Questions via AI
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let questions = [];
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert quiz creator for a high-stakes, fast-paced live quiz platform. 
      Generate a set of 5 challenging multiple choice questions based on the following topic/notes. 
      Topic: ${topic}
      Make the correct answers unambiguous.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              options: {
                type: Type.ARRAY,
                description: "Exactly 4 options: A, B, C, D",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "A, B, C, or D" },
                    text: { type: Type.STRING, description: "The answer text" }
                  }
                }
              },
              correct_answer: { type: Type.STRING, description: "The label of the correct option (A, B, C, or D)" },
              difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" }
            }
          }
        }
      }
    });

    questions = JSON.parse(response.text || "[]");
  } catch (err: any) {
    console.error("AI Generation Error:", err);
    throw new Error("Failed to generate questions with AI.");
  }

  if (!questions || questions.length === 0) {
    throw new Error("AI returned no questions.");
  }

  // 2. Create Game in Supabase
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: game, error: gameError } = await supabase.from('games').insert({
    title,
    mode,
    join_code: joinCode,
    organiser_id: user.id,
    status: 'draft'
  }).select().single();

  if (gameError) {
    console.error("Game Insert Error:", gameError);
    if (gameError.code === '42P01') {
      throw new Error("The 'games' table does not exist. Did you run the SQL script?");
    }
    throw new Error("Database error while creating game.");
  }

  // 3. Insert Questions
  const formattedQuestions = questions.map((q: any, idx: number) => ({
    game_id: game.id,
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty || "Medium",
    order_index: idx
  }));

  const { error: qError } = await supabase.from('questions').insert(formattedQuestions);
  
  if (qError) {
    console.error("Questions Insert Error:", qError);
    throw new Error("Database error while saving questions.");
  }

  // 4. Redirect to control room
  redirect(`/dashboard/game/${game.id}`);
}
