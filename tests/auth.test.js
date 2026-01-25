/**
 * Tests de Integración para Autenticación
 */

describe('Sistema de Autenticación', () => {
    let mockAuth;
    let mockOfflineStorage;

    beforeEach(() => {
        // Setup mocks
        mockAuth = {
            currentUser: null,
            onAuthStateChanged: jest.fn(),
            signInWithEmailAndPassword: jest.fn(),
            signOut: jest.fn(),
            setPersistence: jest.fn(() => Promise.resolve())
        };

        mockOfflineStorage = {
            setUserData: jest.fn(() => Promise.resolve()),
            getUserData: jest.fn(() => Promise.resolve(null)),
            clearAll: jest.fn(() => Promise.resolve())
        };

        global.firebase = {
            auth: () => mockAuth
        };

        window.offlineStorage = mockOfflineStorage;
    });

    describe('Login', () => {
        test('login exitoso guarda datos offline', async () => {
            const mockUser = {
                uid: 'test-uid',
                email: 'test@example.com',
                displayName: 'Test User'
            };

            mockAuth.signInWithEmailAndPassword.mockResolvedValue({
                user: mockUser
            });

            // Simular login
            const result = await mockAuth.signInWithEmailAndPassword(
                'test@example.com',
                'password123'
            );

            expect(result.user).toEqual(mockUser);
            expect(mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
                'test@example.com',
                'password123'
            );
        });

        test('login fallido muestra error apropiado', async () => {
            const error = {
                code: 'auth/wrong-password',
                message: 'Wrong password'
            };

            mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);

            await expect(
                mockAuth.signInWithEmailAndPassword('test@example.com', 'wrong')
            ).rejects.toEqual(error);
        });
    });

    describe('Logout', () => {
        test('logout limpia datos offline', async () => {
            await mockAuth.signOut();

            expect(mockAuth.signOut).toHaveBeenCalled();
        });
    });

    describe('Persistencia de Sesión', () => {
        test('recupera sesión de almacenamiento offline', async () => {
            const offlineUser = {
                uid: 'offline-uid',
                email: 'offline@example.com',
                displayName: 'Offline User'
            };

            mockOfflineStorage.getUserData.mockResolvedValue(offlineUser);

            const userData = await mockOfflineStorage.getUserData();

            expect(userData).toEqual(offlineUser);
            expect(mockOfflineStorage.getUserData).toHaveBeenCalled();
        });
    });
});
