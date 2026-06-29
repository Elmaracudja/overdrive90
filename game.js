class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Moteur calé sur 12 FPS
        this.fps = 12;
        this.fpsInterval = 1000 / this.fps;
        this.lastTime = 0;
        
        // Position et cinématique du joueur
        this.position = 0;   
        this.speed = 0;      
        this.maxSpeed = 250; 
        
        // Configuration géométrique de la route
        this.roadWidth = 1400;     
        this.segmentLength = 200;  
        this.cameraHeight = 1000;  
        this.cameraDepth = 0.8;    
        this.drawDistance = 40;    

        // Génération de la carte du circuit (Tableau de segments)
        this.segments = [];
        this.createRoute();

        this.keys = { up: false, down: false, left: false, right: false, space: false };
        this.setupInput();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Génération d'une piste avec des lignes droites et des virages
    createRoute() {
        // On génère 1000 segments de route pour tester
        for (let i = 0; i < 1000; i++) {
            let curve = 0;
            // On ajoute des virages artificiels selon la zone du circuit
            if (i > 100 && i < 200) curve = 1.5;   // Virage léger à droite
            if (i > 250 && i < 350) curve = -2.5;  // Virage serré à gauche
            if (i > 400 && i < 600) curve = 3;     // Longue courbe S à droite
            
            this.segments.push({
                index: i,
                curve: curve,
                // Coordonnées de base dans le monde virtuel
                p1: { world: { x: 0, y: 0, z: i * this.segmentLength } },
                p2: { world: { x: 0, y: 0, z: (i + 1) * this.segmentLength } }
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

        // Boucler sur la piste si on arrive à la fin
        let trackLength = this.segments.length * this.segmentLength;
        if (this.position >= trackLength) this.position -= trackLength;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Rendu du ciel
        this.ctx.fillStyle = "#111424";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        
        // 2. Rendu de la route corrigé
        let baseSegmentIndex = Math.floor(this.position / this.segmentLength);
        let basePercent = (this.position % this.segmentLength) / this.segmentLength;
        
        let dx = 0;
        let camUserX = 0; // Position latérale future de la voiture
        
        // Accumulateur pour la courbure de la route
        let currentCurve = 0;

        // Rendu de l'arrière vers l'avant
        for (let i = this.drawDistance - 1; i >= 0; i--) {
            let segment = this.segments[(baseSegmentIndex + i) % this.segments.length];
            
            let isDark = (segment.index % 2 === 0);
            let roadColor = isDark ? "#42444d" : "#4c4e57";
            let snowColor = isDark ? "#ffffff" : "#f0f4f8";
            let borderColor = isDark ? "#ff0055" : "#ffffff"; // Vibreurs rouge/blanc style arcade

            // Calcul de la perspective de manière stable
            let z = (i * this.segmentLength) - (this.position % this.segmentLength);
            if (z <= 0) z = 1; // Anti-division par zéro

            let scale = this.cameraDepth / (z / this.cameraHeight);
            
            // Calcul des projections écran
            let screenX = (this.canvas.width / 2) + (currentCurve * scale * (this.canvas.width / 2));
            let screenY = (this.canvas.height / 2) + (this.cameraHeight * scale * (this.canvas.height / 2)) / this.cameraHeight;
            let screenW = this.roadWidth * scale;

            // Variables pour le segment précédent (plus loin sur l'écran)
            let nextZ = ((i + 1) * this.segmentLength) - (this.position % this.segmentLength);
            let nextScale = this.cameraDepth / (nextZ / this.cameraHeight);
            currentCurve += segment.curve; // On applique la courbure au fur et à mesure
            let nextScreenX = (this.canvas.width / 2) + (currentCurve * nextScale * (this.canvas.width / 2));
            let nextScreenY = (this.canvas.height / 2) + (this.cameraHeight * nextScale * (this.canvas.height / 2)) / this.cameraHeight;
            let nextScreenW = this.roadWidth * nextScale;

            // Ajustement des Y pour correspondre à notre plancher bas
            let yA = screenY;
            let yB = nextScreenY;
            
            if (yA <= yB) continue;

            // Dessin du sol enneigé
            this.ctx.fillStyle = snowColor;
            this.ctx.fillRect(0, yB, this.canvas.width, yA - yB);

            // Dessin des vibreurs extérieurs
            let borderWidth = screenW * 0.1;
            this.ctx.fillStyle = borderColor;
            this.ctx.beginPath();
            this.ctx.moveTo(nextScreenX - nextScreenW/2 - borderWidth, yB);
            this.ctx.lineTo(nextScreenX + nextScreenW/2 + borderWidth, yB);
            this.ctx.lineTo(screenX + screenW/2 + borderWidth, yA);
            this.ctx.lineTo(screenX - screenW/2 - borderWidth, yA);
            this.ctx.closePath();
            this.ctx.fill();

            // Dessin de la route
            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(nextScreenX - nextScreenW / 2, yB);
            this.ctx.lineTo(nextScreenX + nextScreenW / 2, yB);
            this.ctx.lineTo(screenX + screenW / 2, yA);
            this.ctx.lineTo(screenX - screenW / 2, yA);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // 3. HUD Écran
        this.ctx.fillStyle = "#ff0055";
        this.ctx.font = "9px 'Courier New'";
        this.ctx.fillText(`VITESSE: ${Math.floor(this.speed)} KM/H`, 12, 18);
        this.ctx.fillStyle = "#00ffcc";
        this.ctx.fillText(`DISTANCE: ${Math.floor(this.position / 100)} M`, 12, 32);
    }
}

window.onload = () => { new Game(); };
