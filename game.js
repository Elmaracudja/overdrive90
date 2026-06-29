class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Moteur calé sur 12 FPS (Pure nostalgie)
        this.fps = 12;
        this.fpsInterval = 1000 / this.fps; // ~83.33ms par image
        this.lastTime = 0;
        
        // Position et cinématique du joueur sur la route
        this.position = 0;   // Distance totale parcourue
        this.speed = 0;      // Vitesse actuelle (en unités de distance)
        this.maxSpeed = 250; // Vitesse maximale de base au Palier 1
        
        // Configuration géométrique de la route (Moteur Pseudo-3D)
        this.roadWidth = 1400;     // Largeur de la route dans l'espace virtuel
        this.segmentLength = 200;  // Longueur de chaque bande de couleur au sol
        this.cameraHeight = 1000;  // Hauteur des yeux du pilote
        this.cameraDepth = 0.8;    // Distance focale pour l'effet de perspective
        this.drawDistance = 40;    // Nombre de segments calculés jusqu'à l'horizon

        // Enregistrement de l'état des touches du clavier
        this.keys = { up: false, down: false, left: false, right: false, space: false };
        this.setupInput();
        
        // Lancement du cycle de vie du jeu
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Capture des entrées clavier (Style Arcade)
    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowUp')    this.keys.up = true;
            if (e.code === 'ArrowDown')  this.keys.down = true;
            if (e.code === 'ArrowLeft')  this.keys.left = true;
            if (e.code === 'ArrowRight') this.keys.right = true;
            if (e.code === 'Space')      this.keys.space = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowUp')    this.keys.up = false;
            if (e.code === 'ArrowDown')  this.keys.down = false;
            if (e.code === 'ArrowLeft')  this.keys.left = false;
            if (e.code === 'ArrowRight') this.keys.right = false;
            if (e.code === 'Space')      this.keys.space = false;
        });
    }

    // Boucle principale régulée à 12 FPS
    gameLoop(time) {
        let elapsed = time - this.lastTime;

        if (elapsed > this.fpsInterval) {
            // Ajustement pour maintenir un timing régulier malgré les variations
            this.lastTime = time - (elapsed % this.fpsInterval);

            let dt = elapsed / 1000;
            this.update(dt);
            this.render();
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Gestion des calculs de physique
    update(dt) {
        // Accélération / Décélération selon les touches enfoncées
        if (this.keys.up) {
            this.speed += 140 * dt;
        } else {
            this.speed -= 90 * dt; // Friction naturelle de la neige
        }
        
        // Freinage actif
        if (this.keys.down) this.speed -= 180 * dt;

        // Sécurisation des limites de vitesse (0 à maxSpeed)
        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        
        // Progression de la voiture
        this.position += this.speed;
    }

    // Rendu graphique sur le Canvas
    render() {
        // Nettoyage complet du frame précédent
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Rendu du ciel crépusculaire (Moitié haute de l'écran)
        this.ctx.fillStyle = "#111424";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        
        // 2. Rendu Pseudo-3D mathématique de la route
        let baseSegmentIndex = Math.floor(this.position / this.segmentLength);
        
        // On dessine de l'horizon (fond) vers la voiture (premier plan) -> Algorithme du peintre
        for (let i = this.drawDistance - 1; i >= 0; i--) {
            let segmentIndex = baseSegmentIndex + i;
            
            // Alternance des couleurs (effet damier pour donner l'illusion visuelle de défilement)
            let isDark = (segmentIndex % 2 === 0);
            let roadColor = isDark ? "#42444d" : "#4c4e57"; // Teintes asphalte froid
            let snowColor = isDark ? "#ffffff" : "#f0f4f8"; // Teintes neige alpine
            
            // Calcul mathématique de la profondeur (Z)
            let z1 = i * this.segmentLength - (this.position % this.segmentLength);
            let z2 = (i + 1) * this.segmentLength - (this.position % this.segmentLength);
            
            if (z1 <= 0) continue;

            // Projection mathématique (3D vers perspective 2D)
            let p1_scale = this.cameraDepth / (z1 / this.cameraHeight);
            let p2_scale = this.cameraDepth / (z2 / this.cameraHeight);
            
            let p1_y = (this.canvas.height / 2) + (this.cameraHeight * p1_scale * (this.canvas.height / 2)) / this.cameraHeight;
            let p2_y = (this.canvas.height / 2) + (this.cameraHeight * p2_scale * (this.canvas.height / 2)) / this.cameraHeight;
            
            let p1_w = this.roadWidth * p1_scale;
            let p2_w = this.roadWidth * p2_scale;
            
            let p1_x = this.canvas.width / 2;
            let p2_x = this.canvas.width / 2;

            let yA = this.canvas.height - p1_y;
            let yB = this.canvas.height - p2_y;
            
            if (yA <= yB) continue;

            // Dessin de la bande de neige de fond
            this.ctx.fillStyle = snowColor;
            this.ctx.fillRect(0, yB, this.canvas.width, yA - yB);

            // Dessin du trapèze représentant le morceau de route projeté
            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(p2_x - p2_w / 2, yB);
            this.ctx.lineTo(p2_x + p2_w / 2, yB);
            this.ctx.lineTo(p1_x + p1_w / 2, yA);
            this.ctx.lineTo(p1_x - p1_w / 2, yA);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // 3. Affichage des données (HUD) style Arcade
        this.ctx.fillStyle = "#ff0055";
        this.ctx.font = "9px 'Courier New'";
        this.ctx.fillText(`VITESSE: ${Math.floor(this.speed)} KM/H`, 12, 18);
        this.ctx.fillStyle = "#00ffcc";
        this.ctx.fillText(`DISTANCE: ${Math.floor(this.position / 100)} M`, 12, 32);
    }
}

// Initialisation au chargement de la page HTML
window.onload = () => { new Game(); };
