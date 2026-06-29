class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Moteur calé sur 12 FPS
        this.fps = 12;
        this.fpsInterval = 1000 / this.fps;
        this.lastTime = 0;
        
        // Position et cinématique
        this.position = 0;   
        this.speed = 0;      
        this.maxSpeed = 250; 
        
        // Configuration géométrique ULTRA-STABLE
        this.roadWidth = 1200;      // Largeur virtuelle de la route
        this.segmentLength = 200;   // Longueur d'une bande de couleur
        this.drawDistance = 40;     // Nombre de bandes dessinées
        this.cameraHeight = 1000;   // Hauteur virtuelle

        // Génération de la piste (Demoscene Circuit)
        this.segments = [];
        this.createRoute();

        // Contrôles clavier
        this.keys = { up: false, down: false, left: false, right: false, space: false };
        this.setupInput();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Création d'un circuit test avec des courbes
    createRoute() {
        this.segments = [];
        for (let i = 0; i < 2000; i++) {
            let curve = 0;
            if (i > 150 && i < 300) curve = 2.0;    // Virage à droite serré
            if (i > 400 && i < 600) curve = -1.5;   // Courbe à gauche longue
            if (i > 800 && i < 1100) curve = 3.0;   // Virage très serré droite (épingle)
            
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
        if (this.keys.up) {
            this.speed += 140 * dt;
        } else {
            this.speed -= 90 * dt; 
        }
        if (this.keys.down) this.speed -= 180 * dt;

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.position += this.speed;

        let trackLength = this.segments.length * this.segmentLength;
        if (this.position >= trackLength) this.position -= trackLength;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Rendu du CIEL
        this.ctx.fillStyle = "#111424";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        
        // 2. RENDU DE LA ROUTE (Nouvel algorithme ULTRA-STABLE)
        let H = this.canvas.height / 2; // Hauteur de l'horizon
        let W = this.canvas.width / 2; // Centre horizontal
        
        // Accumulateur pour la courbure cumulée (Virages)
        let curveX = 0;
        
        // On dessine de l'AVANT (bas de l'écran) vers le FOND (horizon)
        for (let i = 0; i < this.drawDistance; i++) {
            let segmentIndex = Math.floor(this.position / this.segmentLength) + i;
            let segment = this.segments[segmentIndex % this.segments.length];
            
            let isDark = (segment.index % 2 === 0);
            let roadColor = isDark ? "#42444d" : "#4c4e57"; // Asphalte froid
            let snowColor = isDark ? "#ffffff" : "#f0f4f8"; // Neige alpine
            let borderColor = isDark ? "#ff0055" : "#ffffff"; // Vibreurs style Arcade

            // Calcul de la perspective fixe et stable
            // Nous utilisons une échelle linéaire simple pour garantir le rendu
            let scale1 = 1 - (i / this.drawDistance); 
            let scale2 = 1 - ((i + 1) / this.drawDistance);

            if (scale1 < 0) scale1 = 0;
            if (scale2 < 0) scale2 = 0;

            // Déterminer les coordonnées Y de la bande horizontale
            let yA = this.canvas.height / 2 + (H * scale1);
            let yB = this.canvas.height / 2 + (H * scale2);
            
            if (yA <= yB) continue; // Sécurité si division par zéro

            // Déterminer le décalage horizontal cumulé (Virages)
            let xA = W + (curveX * scale1 * W * 0.1); // On décaler le centre selon la courbe
            let xB = W + (curveX * scale2 * W * 0.1);
            
            // Calculer la largeur projetée (perspective)
            let wA = this.roadWidth * scale1;
            let wB = this.roadWidth * scale2;

            // Dessin du SOL ENNEIGÉ (Fond de la bande)
            this.ctx.fillStyle = snowColor;
            this.ctx.fillRect(0, yB, this.canvas.width, yA - yB);

            // Dessin des VIBREURS LATÉRAUX (Borders)
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

            // Dessin de l'ASPHALTE (Route)
            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(xB - wB / 2, yB);
            this.ctx.lineTo(xB + wB / 2, yB);
            this.ctx.lineTo(xA + wA / 2, yA);
            this.ctx.lineTo(xA - wA / 2, yA);
            this.ctx.closePath();
            this.ctx.fill();
            
            // On accumule la courbure pour le segment suivant
            curveX += segment.curve; 
        }

        // 3. HUD Écran
        this.ctx.fillStyle = "#ff0055";
        this.ctx.font = "9px 'Courier New'";
        this.ctx.fillText(`VITESSE: ${Math.floor(this.speed)} KM/H`, 12, 18);
        this.ctx.fillStyle = "#00ffcc";
        this.ctx.fillText(`DISTANCE: ${Math.floor(this.position / 100)} M`, 12, 32);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText("STAGE 1 (CURVE OK)", 12, 46);
    }
}

window.onload = () => { new Game(); };
