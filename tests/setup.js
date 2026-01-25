/**
 * Setup para Jest
 * Configuración global de tests
 */

// Importar matchers de testing-library
import '@testing-library/jest-dom';

// Mock de Firebase
global.firebase = {
    auth: jest.fn(() => ({
        currentUser: null,
        onAuthStateChanged: jest.fn(),
        signInWithEmailAndPassword: jest.fn(),
        signOut: jest.fn(),
        setPersistence: jest.fn(() => Promise.resolve())
    })),
    firestore: jest.fn(() => ({
        collection: jest.fn(),
        doc: jest.fn(),
        enablePersistence: jest.fn(() => Promise.resolve())
    })),
    storage: jest.fn(() => ({
        ref: jest.fn()
    })),
    initializeApp: jest.fn()
};

// Mock de Google Maps
global.google = {
    maps: {
        Map: jest.fn(),
        Marker: jest.fn(),
        Circle: jest.fn(),
        Polyline: jest.fn(),
        LatLngBounds: jest.fn(() => ({
            extend: jest.fn()
        })),
        SymbolPath: {
            CIRCLE: 0
        },
        Animation: {
            DROP: 1
        }
    }
};

// Mock de navigator.geolocation
global.navigator.geolocation = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn()
};

// Mock de localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock de IndexedDB
global.indexedDB = {
    open: jest.fn()
};

// Suprimir console.log en tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
