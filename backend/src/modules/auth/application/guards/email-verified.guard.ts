import { ForbiddenError } from '../../../../shared/errors/AppError';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';

/**
 * Exige conta com email verificado para ações da comunidade
 * (adicionar/editar/votar/sugerir). Sem verificação não há spam de conteúdo.
 * Admins não são bloqueados (a moderação continua sempre disponível).
 */
export async function assertEmailVerified(
    userRepository: IUserRepository,
    userId: string,
    userRole: string | undefined,
    action = 'contribuir'
): Promise<void> {
    if (userRole === 'ADMIN') {
        return;
    }
    const user = await userRepository.findById(userId);
    if (!user || !user.emailVerified) {
        throw new ForbiddenError(`Verifica o teu email para poderes ${action}.`);
    }
}
