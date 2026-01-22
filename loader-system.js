/**
 * Sistema de Carga Moderno con Animación de Cerebro
 */

class LoadingSystem {
  constructor() {
    this.createOverlay();
  }

  createOverlay() {
    if (document.getElementById('loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-container">
        <div class="brain-loader">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Cerebro -->
            <g class="brain">
              <!-- Hemisferio izquierdo -->
              <path class="brain-left" d="M 30 50 Q 25 30, 35 20 Q 40 15, 45 18 Q 42 30, 38 50 Z" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle class="brain-neuron" cx="35" cy="25" r="2"/>
              <circle class="brain-neuron" cx="38" cy="35" r="2"/>
              <circle class="brain-neuron" cx="40" cy="45" r="2"/>
              
              <!-- Hemisferio derecho -->
              <path class="brain-right" d="M 70 50 Q 75 30, 65 20 Q 60 15, 55 18 Q 58 30, 62 50 Z" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle class="brain-neuron" cx="65" cy="25" r="2"/>
              <circle class="brain-neuron" cx="62" cy="35" r="2"/>
              <circle class="brain-neuron" cx="60" cy="45" r="2"/>
              
              <!-- Centro -->
              <circle class="brain-core" cx="50" cy="50" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle class="brain-pulse" cx="50" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="1"/>
            </g>
            
            <!-- Líneas de conexión (sinapsis) -->
            <g class="synapses">
              <line class="synapse" x1="35" y1="25" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
              <line class="synapse" x1="38" y1="35" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
              <line class="synapse" x1="40" y1="45" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
              <line class="synapse" x1="65" y1="25" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
              <line class="synapse" x1="62" y1="35" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
              <line class="synapse" x1="60" y1="45" x2="50" y2="50" stroke="currentColor" stroke-width="1"/>
            </g>
          </svg>
        </div>
        <p class="loading-text">Procesando<span class="loading-dots">.</span></p>
      </div>
    `;

    document.body.appendChild(overlay);
    this.animateLoadingDots();
  }

  animateLoadingDots() {
    const dots = document.querySelector('.loading-dots');
    if (!dots) return;

    let count = 1;
    setInterval(() => {
      dots.textContent = '.'.repeat((count % 3) + 1);
      count++;
    }, 500);
  }

  show(message = 'Procesando') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      this.createOverlay();
    }

    const overlay2 = document.getElementById('loading-overlay');
    overlay2.classList.add('active');

    const loadingText = overlay2.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  hide() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  setMessage(message) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = message;
    }
  }
}

// Instancia global
window.loadingSystem = new LoadingSystem();
