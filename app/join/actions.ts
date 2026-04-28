"use server";

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function joinGame(formData: FormData) {
  const joinCode = formData.get('joinCode') as string;
  const displayName = formData.get('displayName') as string;

  if (!joinCode || !displayName) throw new Error("Room code and display name are required.");

  const supabase = await createClient();
  const codeUpper = joinCode.toUpperCase().trim();

  // 1. Find the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('join_code', codeUpper)
    .single();

  if (gameError || !game) throw new Error("Room not found. Check the code and try again.");
  if (game.status === 'finished') throw new Error("This game has already finished.");

  // 2. Check auth state
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();

  // 3. Check if already in this game — prevents duplicates
  let participantId: string | null = null;

  if (user) {
    // Logged-in: find by user_id + game_id
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('game_id', game.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) participantId = existing.id;
  } else {
    // Guest: check existing cookie and verify it still exists in DB
    const existingCookie = cookieStore.get(`participant_${game.id}`)?.value;
    if (existingCookie) {
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('id', existingCookie)
        .maybeSingle();
      if (existing) participantId = existing.id;
    }
  }

  // 4. Only create a new participant if not already in the game
  if (!participantId) {
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .insert({
        game_id: game.id,
        user_id: user?.id || null,
        display_name: displayName.trim()
      })
      .select('id')
      .single();

    if (partError) {
      console.error("Participant Insert Error:", partError);
      if (partError.code === '42P01') throw new Error("The 'participants' table does not exist. Did you run the SQL script?");
      if (partError.code === '23505') throw new Error("You are already registered in this game.");
      throw new Error("Failed to join the room.");
    }

    participantId = participant.id;
  }

  // 5. Set/refresh cookie (ensures the player screen always has a valid ID)
  cookieStore.set(`participant_${game.id}`, participantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  });

  // 6. Redirect to waiting room
  redirect(`/play/${game.id}`);
}
