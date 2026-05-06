import { createClient } from "@/utils/supabase/server";

export async function getProfileStats(userId: string) {
  const supabase = await createClient();

  // 1. Fetch all participants for this user
  const { data: participants } = await supabase
    .from("participants")
    .select("id, game_id")
    .eq("user_id", userId);

  // --- Games Created by User ---
  const { data: createdGamesData } = await supabase
    .from("games")
    .select("id, title, mode, created_at, participants(id)")
    .eq("organiser_id", userId)
    .order("created_at", { ascending: false });

  const createdGames = createdGamesData?.map(g => ({
    id: g.id,
    title: g.title,
    mode: g.mode,
    date: new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    participants: g.participants ? g.participants.length : 0
  })) || [];

  if (!participants || participants.length === 0) {
    return {
      stats: [
        { label: "Games Played", value: "0" },
        { label: "Win Rate", value: "0%" },
        { label: "Avg Accuracy", value: "0%" },
        { label: "Avg Response", value: "0s" },
      ],
      history: [],
      createdGames
    };
  }

  const participantIds = participants.map(p => p.id);
  const gameIds = [...new Set(participants.map(p => p.game_id))];

  // 2. Fetch all answers for ALL participants in these games to calculate leaderboards
  const { data: allAnswers } = await supabase
    .from("answers")
    .select("game_id, participant_id, is_correct, time_taken_ms, points_earned")
    .in("game_id", gameIds);

  // 3. Fetch game details
  const { data: games } = await supabase
    .from("games")
    .select("id, title, created_at, status, organiser_id")
    .in("id", gameIds);

  // Compute Leaderboards per game
  const leaderboards: Record<string, { participant_id: string, score: number }[]> = {};
  if (allAnswers) {
    const scoresByGameAndParticipant: Record<string, Record<string, number>> = {};
    allAnswers.forEach(a => {
      if (!scoresByGameAndParticipant[a.game_id]) scoresByGameAndParticipant[a.game_id] = {};
      if (!scoresByGameAndParticipant[a.game_id][a.participant_id]) scoresByGameAndParticipant[a.game_id][a.participant_id] = 0;
      scoresByGameAndParticipant[a.game_id][a.participant_id] += a.points_earned;
    });

    for (const [gameId, participantsDict] of Object.entries(scoresByGameAndParticipant)) {
      leaderboards[gameId] = Object.entries(participantsDict)
        .map(([pid, score]) => ({ participant_id: pid, score }))
        .sort((a, b) => b.score - a.score);
    }
  }

  // Filter answers for just this user
  const userAnswers = allAnswers?.filter(a => participantIds.includes(a.participant_id)) || [];

  // Compute Overall Stats
  const gamesPlayed = gameIds.length;
  let totalWins = 0;
  let totalCorrect = 0;
  let totalTimeMs = 0;
  const totalUserAnswers = userAnswers.length;

  userAnswers.forEach(a => {
    if (a.is_correct) totalCorrect++;
    totalTimeMs += a.time_taken_ms || 0;
  });

  const avgAccuracy = totalUserAnswers > 0 ? Math.round((totalCorrect / totalUserAnswers) * 100) : 0;
  const avgResponseS = totalUserAnswers > 0 ? (totalTimeMs / totalUserAnswers / 1000).toFixed(1) : "0";

  // Compute Play History & Win Rate
  const history = [];
  const gamesMap = new Map(games?.map(g => [g.id, g]) || []);

  for (const p of participants) {
    const game = gamesMap.get(p.game_id);
    if (!game) continue;

    // Find position
    const gameLeaderboard = leaderboards[p.game_id] || [];
    const positionIndex = gameLeaderboard.findIndex(l => l.participant_id === p.id);
    const rawPosition = positionIndex !== -1 ? positionIndex + 1 : "-";
    const position = rawPosition === 1 ? "1st" : rawPosition === 2 ? "2nd" : rawPosition === 3 ? "3rd" : rawPosition !== "-" ? `${rawPosition}th` : "-";

    if (rawPosition === 1) totalWins++;

    const gameAnswers = userAnswers.filter(a => a.participant_id === p.id);
    let score = 0;
    let correct = 0;
    gameAnswers.forEach(a => {
      score += a.points_earned;
      if (a.is_correct) correct++;
    });

    const accuracy = gameAnswers.length > 0 ? Math.round((correct / gameAnswers.length) * 100) : 0;
    const date = new Date(game.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    history.push({
      id: game.id,
      title: game.title,
      date,
      position,
      score,
      accuracy: `${accuracy}%`,
      organiser_id: game.organiser_id,
    });
  }

  const winRate = gamesPlayed > 0 ? Math.round((totalWins / gamesPlayed) * 100) : 0;

  const stats = [
    { label: "Games Played", value: gamesPlayed.toString() },
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Avg Accuracy", value: `${avgAccuracy}%` },
    { label: "Avg Response", value: `${avgResponseS}s` },
  ];

  // Sort history by date descending
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { stats, history, createdGames };
}
