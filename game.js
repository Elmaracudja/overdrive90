class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Moteur calé sur 12 FPS
        this.fps = 12;
        this.fpsInterval = 1000 / this.fps;
        this.lastTime = 0;
        
        // Position et cinématique de la voiture
        this.position = 0;      // Distance totale parcourue
        this.speed = 0;         // Vitesse actuelle (en unités)
        this.maxSpeed = 250;    // Vitesse maximale Palier 1
        this.playerX = 0;       // Position latérale de la voiture (-1 = bord gauche, 1 = bord droit)
        
        // Configuration géométrique de la route
        this.roadWidth = 1200;      
        this.segmentLength = 200;   
        this.drawDistance = 40;     
        this.cameraHeight = 1000;   

        // Génération du circuit
        this.segments = [];
        this.createRoute();

        // Contrôles clavier
        this.keys = { up: false, down: false, left: false, right: false, space: false };
        this.setupInput();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    createRoute() {
        this.segments = [];
        for (let i = 0; i < 2000; i++) {
            let curve = 0;
            if (i > 100 && i < 250) curve = 2.0;    // Virage à droite
            if (i > 350 && i < 500) curve = -2.0;   // Virage à gauche
            if (i > 600 && i < 800) curve = 3.5;    // Épingle serrée à droite
            
            this.segments.push({
                index: i,
                curve: curve
            });
        }
    }

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

    gameLoop(time) {
        let elapsed = time - this.lastTime;
        if (elapsed > this.fpsInterval) {
            this.lastTime = time - (elapsed % this.fpsInterval);
            let dt = elapsed / 1000;
            this.update(dt);
            this.render();
        }
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(dt) {
        // 1. Gestion de la vitesse linéaire
        if (this.keys.up) {
            this.speed += 140 * dt;
        } else {
            this.speed -= 90 * dt; // Friction de la neige
        }
        if (this.keys.down) this.speed -= 180 * dt; // Frein

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.position += this.speed;

        // 2. Gestion de la direction latérale (uniquement si la voiture roule)
        if (this.speed > 0) {
            // Facteur multiplicateur pour tourner de manière proportionnelle à la vitesse
            let turnSpeed = 1.2 * (this.speed / this.maxSpeed) * dt;
            
            if (this.keys.left)  this.playerX -= turnSpeed;
            if (this.keys.right) this.playerX += turnSpeed;
        }

        // 3. Force centrifuge : le virage pousse la voiture vers l'extérieur !
        let baseSegmentIndex = Math.floor(this.position / this.segmentLength);
        let currentSegment = this.segments[baseSegmentIndex % this.segments.length];
        
        // Si on roule dans un virage, la force centrifuge dérive la trajectoire
        if (currentSegment.curve !== 0 && this.speed > 0) {
            this.playerX -= currentSegment.curve * 0.15 * (this.speed / this.maxSpeed) * dt;
        }

        // Limitation des bords de l'écran pour pas s'envoler (glissière imaginaire)
        this.playerX = Math.max(-2, Math.min(this.playerX, 2));

        // Boucle du circuit
        let trackLength = this.segments.length * this.segmentLength;
        if (this.position >= trackLength) this.position -= trackLength;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Rendu du ciel
        this.ctx.fillStyle = "#111424";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        
        // 2. Rendu de la route avec décalage de la caméra joueur (playerX)
        let H = this.canvas.height / 2; 
        let W = this.canvas.width / 2; 
        let curveX = 0;
        
        for (let i = 0; i < this.drawDistance; i++) {
            let segmentIndex = Math.floor(this.position / this.segmentLength) + i;
            let segment = this.segments[segmentIndex % this.segments.length];
            
            let isDark = (segment.index % 2 === 0);
            let roadColor = isDark ? "#42444d" : "#4c4e57"; 
            let snowColor = isDark ? "#ffffff" : "#f0f4f8"; 
            let borderColor = isDark ? "#ff0055" : "#ffffff"; 

            let scale1 = 1 - (i / this.drawDistance); 
            let scale2 = 1 - ((i + 1) / this.drawDistance);

            let yA = this.canvas.height / 2 + (H * scale1);
            let yB = this.canvas.height / 2 + (H * scale2);
            
            if (yA <= yB) continue; 

            // Application du décalage de la caméra (playerX) proportionnellement à la distance
            let xA = W + (curveX - this.playerX * 80) * scale1; 
            let xB = W + (curveX + segment.curve - this.playerX * 80) * scale2;
            
            let wA = this.roadWidth * scale1;
            let wB = this.roadWidth * scale2;

            // Neige
            this.ctx.fillStyle = snowColor;
            this.ctx.fillRect(0, yB, this.canvas.width, yA - yB);

            // Vibreurs
            let borderWidthA = wA * 0.1;
            let borderWidthB = wB * 0.1;
            this.ctx.fillStyle = borderColor;
            this.ctx.beginPath();
            this.ctx.moveTo(xB - wB / 2 - borderWidthB, yB);
            this.ctx.lineTo(xB + wB / 2 + borderWidthB, yB);
            this.ctx.lineTo(xA + wA / 2 + borderWidthA, yA);
            this.ctx.lineTo(xA - wA / 2 - borderWidthA, yA);
            this.ctx.closePath();
            this.ctx.fill();

            // Route
            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(xB - wB / 2, yB);
            this.ctx.lineTo(xB + wB / 2, yB);
            this.ctx.lineTo(xA + wA / 2, yA);
            this.ctx.lineTo(xA - wA / 2, yA);
            this.ctx.closePath();
            this.ctx.fill();
            
            curveX += segment.curve; 
        }

        // 3. DESSIN DE LA VOITURE DU JOUEUR (Modèle Rétro Vectoriel temporaire)
        let carW = 55;
        let carH = 26;
        let carX = W - (carW / 2); // Centré par défaut sur l'écran
        let carY = this.canvas.height - carH - 15; // Placé en bas de l'écran

        // Châssis principal (Coupe Sport Rouge)
        this.ctx.fillStyle = "#d91414"; 
        this.ctx.fillRect(carX, carY + 8, carW, carH - 8);
        
        // Cockpit / Vitres
        this.ctx.fillStyle = "#a3c2c2"; 
        this.ctx.fillRect(carX + 12, carY, carW - 24, 8);

        // Phares Arrière (Mode course poursuite de nuit)
        this.ctx.fillStyle = "#ff3333";
        this.ctx.fillRect(carX + 2, carY + 10, 8, 4); // Phare gauche
        this.ctx.fillRect(carX + carW - 10, carY + 10, 8, 4); // Phare droit

        // Pneus (Visibles sous la carrosserie)
        this.ctx.fillStyle = "#111";
        this.ctx.fillRect(carX + 4, carY + carH - 2, 10, 3);
        this.ctx.fillRect(carX + carW - 14, carY + carH - 2, 10, 3);

        // 4. HUD Écran
        this.ctx.fillStyle = "#ff0055";
        this.ctx.font = "9px 'Courier New'";
        this.ctx.fillText(`VITESSE: ${Math.floor(this.speed)} KM/H`, 12, 18);
        this.ctx.fillStyle = "#00ffcc";
        this.ctx.fillText(`DISTANCE: ${Math.floor(this.position / 100)} M`, 12, 32);
        
        // Alerte si on sort de la route (Neige profonde)
        if (this.playerX < -1.1 || this.playerX > 1.1) {
            this.ctx.fillStyle = "#ffcc00";
            this.ctx.fillText("⚠️ GLISSEMENT HORS-PISTE !", 12, 46);
            // On réduit drastiquement la vitesse si on roule dans la poudreuse
            if (this.speed > 60) this.speed -= 5;
        }
    }
}

window.onload = () => { new Game(); };
