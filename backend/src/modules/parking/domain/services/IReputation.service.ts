/**
 * Reputação de um contribuinte: quanto mais contribuições aprovadas e votos
 * positivos recebidos, maior o peso das suas ações na comunidade.
 */
export interface UserReputation {
    /** 0..10 */
    score: number;
    /** score >= trustedReputationThreshold */
    isTrusted: boolean;
    /** Peso do voto (1 para confiáveis, 0.5 para novos/desconhecidos). */
    voteWeight: number;
    /** Conta criada há menos de newAccountHours. */
    isNew: boolean;
}

export interface IReputationService {
    getForUser(userId: string): Promise<UserReputation>;
}
