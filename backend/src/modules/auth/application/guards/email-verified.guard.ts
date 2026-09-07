import { ForbiddenError } from '../../../../shared/errors/AppError';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';

/**
 * Bloqueia ações da comunidade (adicionar/editar/votar/sugerir) para contas suspensas.
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
    if (!user) {
        throw new ForbiddenError(`Autentica-te para poderes ${action}.`);
    }
    // Conta suspensa não pode agir, mesmo com JWT ainda válido.
    if (user.isActive === false) {
        throw new ForbiddenError('A tua conta está suspensa. Contacta geral@parqi.pt.');
    }
}
