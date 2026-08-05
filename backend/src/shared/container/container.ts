import { setupSharedContainer } from './modules/shared.container';
import { setupUserContainer } from './modules/user.container';
import { setupAuthContainer } from './modules/auth.container';
import { setupParkingContainer } from './modules/parking.container';

/**
 * Composition root. Each module registers its own bindings in a dedicated
 * setup function under ./modules. Add new modules here as the app grows.
 */
export function setupContainer() {
    setupSharedContainer();
    setupUserContainer();
    setupAuthContainer();
    setupParkingContainer();
}
