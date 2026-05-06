"use server";

import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { PrivyClient } from '@privy-io/server-auth';
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

  // Structured reward config
  const enableRewards = formData.get('enable_rewards') === 'true';
  const rewardAmount = enableRewards ? parseFloat(formData.get('reward_amount') as string) : null;
  const rewardToken = enableRewards ? (formData.get('reward_token') as string) : null;
  const rewardSplitsRaw = formData.get('reward_splits') as string;
  const rewardDistribution = enableRewards && rewardSplitsRaw ? JSON.parse(rewardSplitsRaw) : null;

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

  // If rewards are enabled, generate a Privy Server Wallet to act as escrow
  let escrowWalletAddress: string | null = null;
  let escrowWalletId: string | null = null;

  if (enableRewards && rewardAmount && rewardAmount > 0) {
    if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      return { error: "Privy credentials not configured. Cannot create escrow wallet." };
    }
    try {
      const privy = new PrivyClient(
        process.env.PRIVY_APP_ID,
        process.env.PRIVY_APP_SECRET,
        {
          walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY || ''
          }
        }
      );
      const { address, id: walletId } = await privy.walletApi.create({ chainType: 'solana' });
      escrowWalletAddress = address;
      escrowWalletId = walletId;
    } catch (err: any) {
      console.error("Failed to create escrow wallet:", err);
      return { error: "Failed to generate game escrow wallet. Please try again." };
    }
  }

  // Create Game in Supabase
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gameStatus = enableRewards && escrowWalletAddress ? 'funding' : 'draft';

  const { data: game, error: gameError } = await supabase.from('games').insert({
    title,
    mode: gameMode,
    join_code: joinCode,
    organiser_id: user.id,
    status: gameStatus,
    reward: enableRewards ? `${rewardAmount} ${rewardToken}` : null,
    reward_amount: rewardAmount,
    reward_token: rewardToken,
    reward_distribution: rewardDistribution,
    escrow_wallet: escrowWalletAddress,
    escrow_wallet_id: escrowWalletId,
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

  // Redirect to funding page if escrow was created, otherwise go straight to control room
  const nextUrl = gameStatus === 'funding'
    ? `/dashboard/game/${game.id}/funding`
    : `/dashboard/game/${game.id}`;

  return { success: true, url: nextUrl };
}
