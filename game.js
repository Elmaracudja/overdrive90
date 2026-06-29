class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Moteur 12 FPS stable
        this.fps = 12;
        this.fpsInterval = 1000 / this.fps;
        this.lastTime = 0;
        
        // Cinématique joueur
        this.position = 0;      
        this.speed = 0;         
        this.maxSpeed = 260;    
        this.playerX = 0;       
        
        // Géo de la route
        this.roadWidth = 1300;      
        this.segmentLength = 200;   
        this.drawDistance = 45;     
        this.cameraHeight = 1000;   

        // Circuit et trafic
        this.segments = [];
        this.opponents = [];
        this.createRoute();
        this.spawnOpponents();

        this.keys = { up: false, down: false, left: false, right: false, space: false };
        this.setupInput();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    createRoute() {
        this.segments = [];
        for (let i = 0; i < 2000; i++) {
            let curve = 0;
            if (i > 80 && i < 220) curve = 2.2;    
            if (i > 300 && i < 450) curve = -2.0;   
            if (i > 600 && i < 850) curve = 3.8;    
            this.segments.push({ index: i, curve: curve });
        }
    }

    spawnOpponents() {
        this.opponents = [
            { pos: 12000, x: -0.4, speed: 100, color: "#f2b705", width: 48, height: 22 }, // Jaune Racing
            { pos: 25000, x: 0.5,  speed: 110, color: "#0ea5e9", width: 48, height: 22 }, // Bleu Alpin
            { pos: 42000, x: -0.3, speed: 130, color: "#f2b705", width: 48, height: 22 },
            { pos: 58000, x: 0.3,  speed: 95,  color: "#0ea5e9", width: 48, height: 22 },
            { pos: 80000, x: -0.5, speed: 125, color: "#0ea5e9", width: 48, height: 22 }
        ];
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
        if (this.keys.up) { this.speed += 150 * dt; } else { this.speed -= 95 * dt; }
        if (this.keys.down) this.speed -= 200 * dt;
        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.position += this.speed;

        if (this.speed > 0) {
            let turnSpeed = 1.4 * (this.speed / this.maxSpeed) * dt;
            if (this.keys.left)  this.playerX -= turnSpeed;
            if (this.keys.right) this.playerX += turnSpeed;
        }

        let baseSegmentIndex = Math.floor(this.position / this.segmentLength);
        let currentSegment = this.segments[baseSegmentIndex % this.segments.length];
        if (currentSegment.curve !== 0 && this.speed > 0) {
            this.playerX -= currentSegment.curve * 0.16 * (this.speed / this.maxSpeed) * dt;
        }
        this.playerX = Math.max(-2, Math.min(this.playerX, 2));

        if (this.playerX < -1.1 || this.playerX > 1.1) {
            if (this.speed > 40) this.speed -= 10;
        }

        let trackLength = this.segments.length * this.segmentLength;
        this.opponents.forEach(opp => {
            opp.pos += opp.speed * dt;
            if (opp.pos >= trackLength) opp.pos -= trackLength;

            if (Math.abs(opp.pos - this.position) < 180) {
                let relativeX = opp.x - this.playerX;
                if (Math.abs(relativeX) < 0.38) {
                    this.speed = opp.speed - 40; 
                    opp.pos += 350; 
                }
            }
        });

        if (this.position >= trackLength) this.position -= trackLength;
    }

    // Fonction de dessin d'un arrière-plan de montagnes rétro
    drawMountains() {
        let h = this.canvas.height / 2;
        // Ciel dégradé crépuscule d'arcade
        this.ctx.fillStyle = "#0f1026";
        this.ctx.fillRect(0, 0, this.canvas.width, h);
        
        // Chaîne de montagnes lointaines (Ombres violettes)
        this.ctx.fillStyle = "#221936";
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(40, h - 30); this.ctx.lineTo(90, h - 15);
        this.ctx.lineTo(160, h - 45); this.ctx.lineTo(220, h - 20);
        this.ctx.lineTo(280, h - 40); this.ctx.lineTo(320, h);
        this.ctx.fill();

        // Pics enneigés au premier plan (Blanc/Gris rétro)
        this.ctx.fillStyle = "#cbd5e1";
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(25, h - 15); this.ctx.lineTo(60, h - 8);
        this.ctx.lineTo(120, h - 35); this.ctx.lineTo(180, h - 12);
        this.ctx.lineTo(250, h - 28); this.ctx.lineTo(320, h);
        this.ctx.fill();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Dessin des montagnes pixel-art
        this.drawMountains();
        
        // 2. Rendu Route et Vibreurs
        let H = this.canvas.height / 2; 
        let W = this.canvas.width / 2; 
        let curveX = 0;
        let carsToDraw = [];

        for (let i = 0; i < this.drawDistance; i++) {
            let segmentIndex = Math.floor(this.position / this.segmentLength) + i;
            let segment = this.segments[segmentIndex % this.segments.length];
            
            let isDark = (segment.index % 2 === 0);
            let roadColor = isDark ? "#3b3d46" : "#43454f"; // Asphalte texturé plus sombre
            let snowColor = isDark ? "#ffffff" : "#f1f5f9"; 
            let borderColor = isDark ? "#ef4444" : "#ffffff"; // Rouge vif vs Blanc pur

            let scale1 = 1 - (i / this.drawDistance); 
            let scale2 = 1 - ((i + 1) / this.drawDistance);

            let yA = this.canvas.height / 2 + (H * scale1);
            let yB = this.canvas.height / 2 + (H * scale2);
            
            if (yA <= yB) continue; 

            let xA = W + (curveX - this.playerX * 85) * scale1; 
            let xB = W + (curveX + segment.curve - this.playerX * 85) * scale2;
            
            let wA = this.roadWidth * scale1;
            let wB = this.roadWidth * scale2;

            // Dessin Neige
            this.ctx.fillStyle = snowColor;
            this.ctx.fillRect(0, yB, this.canvas.width, yA - yB);

            // Dessin Vibreurs Latéraux
            let borderWidthA = wA * 0.12;
            let borderWidthB = wB * 0.12;
            this.ctx.fillStyle = borderColor;
            this.ctx.beginPath();
            this.ctx.moveTo(xB - wB / 2 - borderWidthB, yB);
            this.ctx.lineTo(xB + wB / 2 + borderWidthB, yB);
            this.ctx.lineTo(xA + wA / 2 + borderWidthA, yA);
            this.ctx.lineTo(xA - wA / 2 - borderWidthA, yA);
            this.ctx.closePath();
            this.ctx.fill();

            // Dessin Asphalte principale
            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(xB - wB / 2, yB);
            this.ctx.lineTo(xB + wB / 2, yB);
            this.ctx.lineTo(xA + wA / 2, yA);
            this.ctx.lineTo(xA - wA / 2, yA);
            this.ctx.closePath();
            this.ctx.fill();

            // AJOUT RETRO : Ligne pointillée centrale (uniquement sur les segments pairs)
            if (isDark) {
                let lineW_A = wA * 0.03;
                let lineW_B = wB * 0.03;
                this.ctx.fillStyle = "#ffffff";
                this.ctx.beginPath();
                this.ctx.moveTo(xB - lineW_B / 2, yB);
                this.ctx.lineTo(xB + lineW_B / 2, yB);
                this.ctx.lineTo(xA + lineW_A / 2, yA);
                this.ctx.lineTo(xA - lineW_A / 2, yA);
                this.ctx.closePath();
                this.ctx.fill();
            }
            
            // Stockage des voitures adverses repérées
            this.opponents.forEach(opp => {
                let oppSegmentIndex = Math.floor(opp.pos / this.segmentLength);
                if (oppSegmentIndex === segment.index) {
                    carsToDraw.push({
                        x: xA + (opp.x * wA / 2),
                        y: yA,
                        w: opp.width * scale1 * 1.6,
                        h: opp.height * scale1 * 1.6,
                        color: opp.color
                    });
                }
            });

            curveX += segment.curve; 
        }

        // 3. DESSIN DES ADVERSAIRES AMÉLIORÉS
        carsToDraw.reverse().forEach(car => {
            // Châssis adverse
            this.ctx.fillStyle = car.color;
            this.ctx.fillRect(car.x - car.w/2, car.y - car.h, car.w, car.h);
            // Pare-brise arrière sombre
            this.ctx.fillStyle = "#1e293b";
            this.ctx.fillRect(car.x - car.w/3, car.y - car.h + (car.h*0.1), (car.w*2)/3, car.h*0.3);
            // Feux arrière teintés
            this.ctx.fillStyle = "#991b1b";
            this.ctx.fillRect(car.x - car.w/2 + 2, car.y - car.h/2, car.w*0.15, car.h*0.15);
            this.ctx.fillRect(car.x + car.w/2 - (car.w*0.15) - 2, car.y - car.h/2, car.w*0.15, car.h*0.15);
        });

        // 4. DESSIN DE LA VOITURE JOUEUR STYLE AMIGA (Pixel-art géométrique détaillé)
        let carW = 60; let carH = 28;
        let carX = W - (carW / 2);
        let carY = this.canvas.height - carH - 12;

        // Aileron Sport Noir (Look 90s)
        this.ctx.fillStyle = "#1e293b";
        this.ctx.fillRect(carX + 4, carY, carW - 8, 4); 

        // Carrosserie Rouge Alpine
        this.ctx.fillStyle = "#dc2626"; 
        this.ctx.fillRect(carX, carY + 8, carW, carH - 8);
        // Prise d'air / Bas de caisse ombré
        this.ctx.fillStyle = "#991b1b";
        this.ctx.fillRect(carX, carY + carH - 4, carW, 4);

        // Habitacle et vitres avec reflets cyan
        this.ctx.fillStyle = "#0f172a";
