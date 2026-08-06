// Limites aproximados de Portugal Continental + ilhas (latitude/longitude)
export const PORTUGAL_BOUNDS = {
    minLat: 32.0,
    maxLat: 42.5,
    minLon: -31.5,
    maxLon: -6.0,
} as const;

// Raio (metros) abaixo do qual uma contribuição é considerada duplicada
export const DUPLICATE_RADIUS_METERS = 30;

// Limites anti-spam e regras de reputação
export const CONTRIBUTION_LIMITS = {
    // Máximo de contribuições (novos parques) por utilizador por dia
    maxContributionsPerDay: 10,
    // Máximo de votos por utilizador por dia
    maxVotesPerDay: 30,
    // Contas com menos de X horas não podem votar com peso total
    newAccountHours: 24,
    // Primeiras X contribuições de uma conta entram em fila de revisão manual (admin)
    firstContributionsRequireReview: 3,
    // Reputação mínima para edição direta de parques alheios / peso total do voto
    trustedReputationThreshold: 5,
    // Peso do voto de utilizadores novos/desconhecidos
    newUserVoteWeight: 0.5,
    // Raio (metros) de validação contra a rede viária (Overpass)
    roadValidationRadiusMeters: 25,
    // Distância mínima ao eixo da estrada para não parecer "berma" (em metros)
    minDistanceToRoadCenterline: 2.5,
} as const;
