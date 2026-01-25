/**
 * Build Script - Optimización de Assets
 * Minifica JavaScript y CSS para producción
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const BUILD_DIR = './dist';
const SRC_DIR = './';

// Archivos a minificar
const JS_FILES = [
    'auth.js',
    'menu-new.js',
    'formulario-new.js',
    'firebase-config.js',
    'helpers.js',
    'notification-system.js',
    'loader-system.js',
    'offline-storage.js',
    'offline-queue.js',
    'map-manager.js',
    'pwa-init.js',
    'logger.js',
    'error-tracker.js',
    'push-notifications.js',
    'i18n.js',
    'export-manager.js',
    'dashboard.js'
];

const CSS_FILES = [
    'neon-styles.css',
    'styles.css',
    'menu-new.css',
    'formulario.css',
    'dashboard.css'
];

const HTML_FILES = [
    'index.html',
    'menu.html',
    'formulario.html',
    'offline.html',
    'dashboard.html',
    'verificacion-mapa.html'
];

async function build() {
    console.log('🚀 Iniciando build de producción...\n');

    // Crear directorio dist
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    // Minificar JavaScript
    console.log('📦 Minificando JavaScript...');
    for (const file of JS_FILES) {
        const srcPath = path.join(SRC_DIR, file);
        const destPath = path.join(BUILD_DIR, file);

        if (fs.existsSync(srcPath)) {
            try {
                const code = fs.readFileSync(srcPath, 'utf8');
                const result = await minify(code, {
                    compress: {
                        dead_code: true,
                        drop_console: true,
                        drop_debugger: true
                    },
                    mangle: true,
                    format: {
                        comments: false
                    }
                });

                fs.writeFileSync(destPath, result.code);

                const originalSize = (fs.statSync(srcPath).size / 1024).toFixed(2);
                const minifiedSize = (fs.statSync(destPath).size / 1024).toFixed(2);
                const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

                console.log(`  ✓ ${file}: ${originalSize}KB → ${minifiedSize}KB (${savings}% reducción)`);
            } catch (error) {
                console.error(`  ✗ Error en ${file}:`, error.message);
            }
        }
    }

    // Minificar CSS
    console.log('\n🎨 Minificando CSS...');
    const cleanCSS = new CleanCSS({
        level: 2,
        compatibility: 'ie9'
    });

    for (const file of CSS_FILES) {
        const srcPath = path.join(SRC_DIR, file);
        const destPath = path.join(BUILD_DIR, file);

        if (fs.existsSync(srcPath)) {
            try {
                const css = fs.readFileSync(srcPath, 'utf8');
                const result = cleanCSS.minify(css);

                if (result.errors.length > 0) {
                    console.error(`  ✗ Errores en ${file}:`, result.errors);
                    continue;
                }

                fs.writeFileSync(destPath, result.styles);

                const originalSize = (fs.statSync(srcPath).size / 1024).toFixed(2);
                const minifiedSize = (fs.statSync(destPath).size / 1024).toFixed(2);
                const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

                console.log(`  ✓ ${file}: ${originalSize}KB → ${minifiedSize}KB (${savings}% reducción)`);
            } catch (error) {
                console.error(`  ✗ Error en ${file}:`, error.message);
            }
        }
    }

    // Copiar HTML (sin minificar para mantener legibilidad)
    console.log('\n📄 Copiando archivos HTML...');
    for (const file of HTML_FILES) {
        const srcPath = path.join(SRC_DIR, file);
        const destPath = path.join(BUILD_DIR, file);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✓ ${file}`);
        }
    }

    // Copiar manifest.json y service-worker.js
    console.log('\n⚙️  Copiando archivos de configuración...');
    const configFiles = ['manifest.json', 'service-worker.js'];
    for (const file of configFiles) {
        const srcPath = path.join(SRC_DIR, file);
        const destPath = path.join(BUILD_DIR, file);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✓ ${file}`);
        }
    }

    // Crear directorio de locales si existe
    const localesDir = path.join(SRC_DIR, 'locales');
    if (fs.existsSync(localesDir)) {
        const destLocalesDir = path.join(BUILD_DIR, 'locales');
        if (!fs.existsSync(destLocalesDir)) {
            fs.mkdirSync(destLocalesDir);
        }

        const localeFiles = fs.readdirSync(localesDir);
        for (const file of localeFiles) {
            fs.copyFileSync(
                path.join(localesDir, file),
                path.join(destLocalesDir, file)
            );
        }
        console.log(`  ✓ locales/ (${localeFiles.length} archivos)`);
    }

    console.log('\n✅ Build completado exitosamente!');
    console.log(`📁 Archivos generados en: ${BUILD_DIR}/`);
}

// Ejecutar build
build().catch(error => {
    console.error('❌ Error en build:', error);
    process.exit(1);
});
