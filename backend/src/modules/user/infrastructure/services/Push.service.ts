import { inject, injectable } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';

/**
 * Notificações push via Expo Push API. Um token por conta (último dispositivo
 * registado ganha). Falhas nunca se propagam: uma notificação perdida não
 * pode partir uma moderação ou um voto.
 */
@injectable()
export class PushService {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async registerToken(userId: string, token: string): Promise<void> {
        await this.userRepository.update(userId, { pushToken: token });
    }

    async notify(
        userId: string | null,
        title: string,
        body: string,
        data?: Record<string, unknown>
    ): Promise<void> {
        if (!userId || process.env.NODE_ENV === 'test') {
            return;
        }
        try {
            const user = await this.userRepository.findById(userId);
            if (!user?.pushToken) {
                return;
            }
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.pushToken,
                    title,
                    body,
                    data,
                    sound: 'default',
                }),
            });
        } catch (error) {
            console.error('[push] falha ao enviar notificação:', error);
        }
    }
}
