/**
 * Tests Unitarios para Helpers
 */

// Importar la clase Helpers (asumiendo que está disponible)
// En un entorno real, necesitarías configurar el import correctamente

describe('Helpers', () => {
    describe('calculateDistance', () => {
        test('calcula distancia correcta entre dos puntos', () => {
            // Lima centro a Miraflores (aprox 10km)
            const lat1 = -12.0464;
            const lng1 = -77.0428;
            const lat2 = -12.1196;
            const lng2 = -77.0365;

            const distance = Helpers.calculateDistance(lat1, lng1, lat2, lng2);

            // Debería ser aproximadamente 8000-9000 metros
            expect(distance).toBeGreaterThan(7000);
            expect(distance).toBeLessThan(10000);
        });

        test('retorna 0 para el mismo punto', () => {
            const lat = -12.0464;
            const lng = -77.0428;

            const distance = Helpers.calculateDistance(lat, lng, lat, lng);

            expect(distance).toBe(0);
        });
    });

    describe('validateEmail', () => {
        test('valida email correcto', () => {
            expect(Helpers.validateEmail('test@example.com')).toBe(true);
            expect(Helpers.validateEmail('user.name@domain.co.uk')).toBe(true);
        });

        test('rechaza email inválido', () => {
            expect(Helpers.validateEmail('invalid')).toBe(false);
            expect(Helpers.validateEmail('test@')).toBe(false);
            expect(Helpers.validateEmail('@domain.com')).toBe(false);
            expect(Helpers.validateEmail('')).toBe(false);
        });
    });

    describe('validateRequired', () => {
        test('valida valores presentes', () => {
            expect(Helpers.validateRequired('texto')).toBe(true);
            expect(Helpers.validateRequired(123)).toBe(true);
            expect(Helpers.validateRequired(0)).toBe(true);
        });

        test('rechaza valores vacíos', () => {
            expect(Helpers.validateRequired('')).toBe(false);
            expect(Helpers.validateRequired('   ')).toBe(false);
            expect(Helpers.validateRequired(null)).toBe(false);
            expect(Helpers.validateRequired(undefined)).toBe(false);
        });
    });

    describe('formatDate', () => {
        test('formatea fecha correctamente', () => {
            const date = new Date('2026-01-25');
            const formatted = Helpers.formatDate(date);

            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
        });
    });

    describe('setStorage y getStorage', () => {
        beforeEach(() => {
            localStorage.clear();
            jest.clearAllMocks();
        });

        test('guarda y recupera datos correctamente', () => {
            const testData = { name: 'Test', value: 123 };

            Helpers.setStorage('testKey', testData);
            expect(localStorage.setItem).toHaveBeenCalled();

            // Mock del retorno
            localStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const retrieved = Helpers.getStorage('testKey');
            expect(retrieved).toEqual(testData);
        });

        test('retorna valor por defecto si no existe', () => {
            localStorage.getItem.mockReturnValue(null);

            const result = Helpers.getStorage('nonexistent', 'default');
            expect(result).toBe('default');
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        test('ejecuta función después del delay', () => {
            const mockFn = jest.fn();
            const debouncedFn = Helpers.debounce(mockFn, 300);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('cancela ejecuciones previas', () => {
            const mockFn = jest.fn();
            const debouncedFn = Helpers.debounce(mockFn, 300);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('isOnline', () => {
        test('retorna estado de conexión', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            expect(Helpers.isOnline()).toBe(true);

            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            expect(Helpers.isOnline()).toBe(false);
        });
    });

    describe('generateId', () => {
        test('genera IDs únicos', () => {
            const id1 = Helpers.generateId();
            const id2 = Helpers.generateId();

            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
            expect(id1.length).toBeGreaterThan(10);
        });
    });
});
