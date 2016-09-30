$(function() {
    // Canvas and context
    var canvas = document.getElementById("game");           // get the canvas
    var context = canvas.getContext("2d");                  // init the context
    var canvas_next = document.getElementById("next");      // get the next canvas
    var context_next = canvas_next.getContext("2d");        // init the next context

    // A single bubble x,y size in pixel
    var bubbleSize = 50;

    // Map information
    var map = {
        x: 0,                       // x position
        y: 0,                       // y position
        width: 0,                   // width
        height: 0,                  // height
        columns: 9,                 // number of columns
        rows: 13,                   // number of rows
        downgrade: 4,               // numbers of free rows at the start
        bubble_w: bubbleSize,       // bubble image width
        bubble_h: bubbleSize,       // bubble image height
        bubble_r: 25,               // bubble radius from center
        bubble_s: 5,                // bubble split pixel
        bubbles: [],                // 2D bubbles array
        single_score: 3,            // a single bubble`s score
        floating_score: 5,          // a single floating bubble`s score
        shoot_score: 15,            // a single unused move score
    };

    // Bubble class
    var Bubble = function(x, y, type, assigned, removed, checked, id) {
        this.x = x;                 // set the x position
        this.y = y;                 // set the y position
        this.type = type;           // set the type
        this.assigned = assigned;   // set the assigned option
        this.removed = removed;     // set the removed option
        this.checked = checked;     // set the checked option
        this.id = id;               // set the bubble id
    }

    // Gamer information
    var gamer = {
        x: 0,                       // gamer x position
        x: 0,                       // gamer y position
        angle: 0,                   // gamer and mouse angle
        bubble: {                   // actual bubble info
            x: 0,                   // bubble x position
            y: 0,                   // bubble y position
            angle: 0,               // bubble and mouse angle
            speed: 10,              // bubble move speed
            type: -1                // bubble type
        },
        next: {                     // the next bubble info
            x: 0,                   // next bubble x position
            y: 0,                   // next bubble y position
            type: 0                 // next bubble type
        },
        lives: 3,                   // actual lives
        score: 0,                   // actual score,
        level: 0,                   // actual level
        shoots: 0,                  // available shoots per level
        availableBubbles: 0,        // available bubbles number on the map
        missedGroups: 0,            // counter for the missed default or floated group
        timer: {
            minute: 0,              // actual timer minute
            second: 0,              // actual timer second
            interval: null          // timer interval
        }
    };

    // The music object
    var music = {
        mute: false,
        dom: null
    };

    // The sound effects object
    var effects = {
        mute: false,
        shoot: null,
        explosion: null,
        hit: null
    };

    // Fullscreen indicator
    var isFullscreen = false;

    // The bubbles image object
    var commonImage = {
        source: null,
        loaded: false,
    };

    // Zones enum
    var zone = {
        list: [
            'game-zone',
            'welcome-zone',
            'pause-zone',
            'game-over-zone',
            'complete-zone',
            'high-scores-zone',
            'about-zone',
            'oops-zone'
        ],
        game: 0,
        welcome: 1,
        pause: 2,
        game_over: 3,
        complete: 4,
        highscores: 5,
        about: 6,
        oops: 7
    };

    // The bubbles [globes] type enum
    var bubbleTypes = {
        none: -1,
        sun: 0,
        mercury: 1,
        venus: 2,
        earth: 3,
        mars: 4,
        jupiter: 5,
        saturn: 6
    };

    // The game status codes enum
    var status = {
        init: 0,
        running: 1,
        paused: 2,
        game_over: 3,
        completed: 4,
        fail: 5
    };

    // global score
    var globalScore = 0;

    // The actual status of the game
    var currentStatus = null;
    // Variable for the moving bubble
    var processing = false;
    // Requested animation frame
    var animationID = null;
    // Array for the founded groups
    var group = [];
    // Temporary array for the group finder function
    var workingArray = [];
    // Counter for the bubbles id
    var idCounter = 0;
    // Bubble animation - reduction
    var bar = 0;
    // Bubble animation - enable
    var removeAnimation = false;
    // hardmode indicator
    var hardmode = false;
    // inserted new row counter
    var insertCounter = 0;

    // Variables for animationFrame fps controlling
    var fps, fpsInterval, now, then, elapsed;

    // Initialize function
    function init() {
        // Set the init status.
        setStatus(status.init);

        // set the welcome zone
        selectZone(zone.welcome);

        // Init the background music
        initBackgroundMusic();
        // Init the sound effects
        initEffects();

        // subscribe to mouse events
        canvas.addEventListener('mousemove', canvasMouseMove);
        canvas.addEventListener('click', canvasClick);

        // implements the menu items clicks
        $('#game-control-button').on('click', function() {
            switch(currentStatus) {
                case status.init:
                case status.game_over: {
                    toggleNavigation();
                    setStatus(status.running);
                    selectZone(zone.game);
                    swithGameControlButtonText("Pause");
                    newGame();
                } break;
                case status.running: {
                    toggleNavigation();
                    setStatus(status.paused);
                    selectZone(zone.pause);
                    swithGameControlButtonText("Continue");
                    // Stop the timer
                    clearInterval(gamer.timer.interval);
                } break;
                case status.paused: {
                    toggleNavigation();
                    setStatus(status.running);
                    selectZone(zone.game);
                    swithGameControlButtonText("Pause");
                    // Start the timer
                    gamer.timer.interval = setInterval(calculateTime, 1000);
                } break;
            }
        });

        $('#high-scores-button').on('click', function() {
            selectZone(zone.highscores);
        });

        $('#about-button').on('click', function() {
            selectZone(zone.about);
        });

        $('#music-button').on('click', toggleMusic);

        $('#effects-button').on('click', toggleEffects);

        $('#reset-button').on('click', function() {
            if(currentStatus != status.init) {
                reset();
                setStatus(status.init);
                swithGameControlButtonText("New Game");
                $('.navigation-button').removeClass("disable-navigation-button");
                selectZone(zone.welcome);
            }
        });

        $('#fullscreen-button').on('click', function() {
            var elem = document.documentElement;
            if ((document.fullScreenElement !== undefined && document.fullScreenElement === null)
                || (document.msFullscreenElement !== undefined && document.msFullscreenElement === null)
                || (document.mozFullScreen !== undefined && !document.mozFullScreen)
                || (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen))
            {
                if (elem.requestFullScreen) {
                    elem.requestFullScreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullScreen) {
                    elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                }
            } else {
                if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }

            isFullscreen = !isFullscreen;
            refreshFullscreenMenuItem(isFullscreen);
        });

        // init the bubbles array
        for(var i = 0; i < map.columns; i++) {
            map.bubbles[i] = [];
            for(var j = 0; j < map.rows; j++) {
                idCounter++;
                map.bubbles[i][j] = new Bubble(i,j, -1, false, false, idCounter);
            }
        }

        // Init tha map
        map.width = map.columns * map.bubble_w + map.bubble_w/2;
        map.height = canvas.height - map.bubble_h - 10;

        // Init the gamer
        gamer.x = map.x + map.width/2 - map.bubble_w/2;
        gamer.y = map.y + map.height;
        gamer.angle = 90;
        gamer.next.x = 10
        gamer.next.y = 10

        // Init and Refresh the live hearths
        initLivesImg();
        refreshLives(gamer.lives);

        // Init the image of bubbles
        loadCommonImages();
    }

    // Set the selected zone
    function selectZone(selected_zone) {
        for(var i = 0; i < zone.list.length; i++) {
            if(i != selected_zone) {
                $('#' + zone.list[i]).hide();
            } else {
                $('#' + zone.list[i]).show();
            }
        }
    }

    // Enable or disable navigation buttons
    function toggleNavigation() {
        $(".navigation-button").toggleClass("disable-navigation-button");
    }

    // Init and start the background music
    function initBackgroundMusic() {
        music.dom = document.createElement('AUDIO');
        music.dom.src = 'assets/sound/Most_awesome_8-bit_song_ever.mp3';
        music.dom.loop = true;
        music.dom.play();
        music.dom.volume = 0.7;
    }

    // Mute and unmute the background music
    function toggleMusic() {
        music.mute = !music.mute;
        music.dom.muted = music.mute;
        refreshMusicMenuItem(music.mute);
    }

    // Init the effects
    function initEffects() {
        effects.shoot = document.createElement('AUDIO');
        effects.explosion = document.createElement('AUDIO');
        effects.hit = document.createElement('AUDIO');
        
        effects.shoot.src = 'assets/sound/Shoot.wav';
        effects.explosion.src = 'assets/sound/Explosion.wav';
        effects.hit.src = 'assets/sound/Hit.wav';

        effects.shoot.volume = 1.0;
        effects.explosion.volume = 1.0;
        effects.hit.volume = 1.0;
    }

    // Mute and unmute the effects
    function toggleEffects() {
        effects.mute = !effects.mute;
        effects.shoot.muted = effects.mute;
        effects.explosion.muted = effects.mute;
        effects.hit.muted = effects.mute;
        refreshEffectsMenuItem(effects.mute);
    }

    // Load the hearth image
    function loadHeartImage() {
        var hearth = new Image();
        hearth.src = 'assets/img/hearth.png';
        return hearth;
    }

    // Load the image of bubbles
    function loadCommonImages() {
        commonImage.source = new Image();
        commonImage.source.src = 'assets/img/bubbles.png';
        commonImage.source.onload = function() {
            commonImage.loaded = true;
        };
    }

    // New game
    function newGame() {
        // reset the bubbles
        resetChecked();
        resetType();
        resetRemoved();

        // If we used animation, cancel that
        if(animationID != null) {
            cancelAnimationFrame(animationID);
        }

        // reset the stats
        gamer.lives = 3;
        gamer.score = 0;
        gamer.level = 1;
        gamer.shoots = 120;
        gamer.availableBubbles = 0;
        gamer.timer.minute = 0;
        gamer.timer.second = 0;

        refreshTimeDisplay(gamer.timer.minute, gamer.timer.second);
        // Init a new timer
        gamer.timer.interval = setInterval(calculateTime, 1000);

        // refresh the stats display
        refreshLives(gamer.lives);
        refreshScore(gamer.score);
        refreshLevel(gamer.level);
        refreshShoots(gamer.shoots);
        // Create a new map
        createMap();

        // Init the next and set the gamer bubble
        nextBubble();
        nextBubble();

        // start the main loop with 60 fps
        startLoop(60);
    }

    // Set up the loop fps
    function startLoop(fps) {
        fpsInterval = 1000 / fps;
        then = Date.now();
        loop();
    }

    // The main event loop function
    function loop() {
        // Animation fram for this function
        animationID = requestAnimationFrame(loop);

        // dates for the fps calculation
        now = Date.now();
        elapsed = now - then;

        // if enough time has elapsed, draw the next frame
        if(elapsed > fpsInterval) {
            // Get ready for next frame by setting then=now, but also, adjust for fpsInterval
            then = now - (elapsed % fpsInterval);

            // drawing context
            if(commonImage.loaded) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                renderBubbles();
                renderGamer();
                renderNext();
                renderBorderLine();
            }

            if(processing) {
                shoot();
            }
        }
    }

    // Mouse movement in the canavs
    function canvasMouseMove(e) {
        var mouse_poisition = getCursorPosition(e);
        var mouse_angle = rad2Deg(Math.atan2((gamer.y + map.bubble_h / 2) - mouse_poisition.y, mouse_poisition.x - (gamer.x + map.bubble_w / 2)));

        // convert to 360
        if(mouse_angle < 0) {
            mouse_angle = 180 + (180 + mouse_angle);
        }

        if(mouse_angle > 90 && mouse_angle < 270) {
            // left side position
            if (mouse_angle > 170) {
                mouse_angle = 170;
            }
        } else {
            // right side position
            if(mouse_angle < 10 || mouse_angle >= 270) {
                mouse_angle = 10;
            }
        }

        gamer.angle = mouse_angle;
    }

    // Click in the canvas
    function canvasClick() {
        if(!processing) {
            // play the shoot effect
            effects.shoot.play();

            gamer.bubble.x = gamer.x;
            gamer.bubble.y = gamer.y;
            gamer.bubble.angle = gamer.angle;
            processing = true;
        }
    }

    // Get a random int between low and high arguments
    function random(low, high) {
        return Math.floor(low + Math.random() * (high - low + 1));
    }

    // Convert radians to degrees
    function rad2Deg(angle) {
        return angle * (180 / Math.PI);
    }
    
    // Convert degrees to radians
    function deg2Rad(angle) {
        return angle * (Math.PI / 180);
    }

    // Init the lives image
    function initLivesImg() {
        var img = loadHeartImage();
        for(var i = 0; i < gamer.lives; i++) {
            $(img).clone().appendTo('#lives-img').addClass('lives').attr('id', (i + 1) + '_live');
        }
    }

    // Switch the game control button text to the actual status text
    function swithGameControlButtonText(text) {
        $('#game-control-button').text(text);
    }

    // Refresh the lives display
    function refreshLives(lives) {
        for (var i = 3; i >= 0; i--) {
            if (i > lives) {
                $('#' + i + '_live').css('display', 'none');
            } else {
                $('#' + i + '_live').css('display', 'block');
            } 
        }
    }

    // Refresh the shoots display
    function refreshShoots(shoots) {
        $('#number-of-next').text(shoots);
    }

    // Refresh the Score display
    function refreshScore(score) {
        $('#game-score').text(score);
    }

    // Refresh the level display
    function refreshLevel(level) {
        $('#game-level').text(level);
    }

    // Refresh the time display
    function refreshTimeDisplay(minute, second) {
        var time = "";
        (minute < 10) ? (time = "0" + minute) : (time = minute);
        (second < 10) ? (time += ":0" + second) : (time += ":" + second);
        $('#game-time').text(time);
    }

    // Calculate the current time
    function calculateTime() {
        gamer.timer.second++;
        if(gamer.timer.second > 59) {
            gamer.timer.minute++;
            gamer.timer.second = 0;
        }
        if(gamer.timer.second > 59 && gamer.timer.minute > 59) {
            clearInterval(gamer.timer.interval);
        }
        refreshTimeDisplay(gamer.timer.minute, gamer.timer.second);
    }

    // Refresh the music menu item
    function refreshMusicMenuItem(muted) {
        if(muted) {
            $('#music-button').text('Music OFF');
        } else {
            $('#music-button').text('Music ON');
        }
    }

    // Refresh the effect menu item
    function refreshEffectsMenuItem(muted) {
        if(muted) {
            $('#effects-button').text('Effects OFF');
        } else {
            $('#effects-button').text('Effects ON');
        }
    }

    // Refresh the fullscren menu item
    function refreshFullscreenMenuItem(enabled) {
        if(enabled) {
            $('#fullscreen-button').text('Fullscreen ON');
        } else {
            $('#fullscreen-button').text('Fullscreen OFF');
        }
    }

    // Reset, back to the welcome page
    function reset() {
        resetChecked();
        resetType();
        resetRemoved();
        gamer.lives = 3;
        gamer.level = 0;
        gamer.score = 0;
        gamer.timer.minute = 0;
        gamer.timer.second = 0;
        gamer.shoots = 0;
        gamer.availableBubbles = 0;
        gamer.next.type = bubbleTypes.none;
        gamer.missedGroups = 0;
        refreshLives(gamer.lives);
        refreshLevel(gamer.level);
        refreshScore(gamer.score);
        refreshTimeDisplay(gamer.timer.minute, gamer.timer.minute);
        clearInterval(gamer.timer.interval);
        refreshShoots(gamer.shoots);
        hardmode = false;
        insertCounter = 0;
    }

    function resetLevel() {
        resetChecked();
        resetType();
        resetRemoved();
        gamer.shoots = 120 - (gamer.level * 5);
        if(gamer.shoots < 80) {
            gamer.shoots = 80;
        }
        refreshShoots(gamer.shoots);
        gamer.availableBubbles = 0;
        gamer.missedGroups = 0;
        gamer.score = globalScore;
        refreshScore(gamer.score);
        insertCounter = 0;
        createMap();
        nextBubble();
        nextBubble();
    }

    // Create a new random filled map
    function createMap() {
        var easy = bubbleTypes.none;
        for(var j = 0; j < map.rows - map.downgrade; j++) {
            for(var i = 0; i < map.columns; i++) {
                var bubble = map.bubbles[i][j];
                if(gamer.level <= 2) {
                    if(i % 2 == 0) {
                        var tmp = random(1, 6);
                        while(easy == tmp) {
                            tmp = random(1, 6);
                        }
                        easy = tmp;
                    }
                    bubble.type = easy;
                } else if(gamer.level <= 4) {
                    bubble.type = random(1, 6);
                } else {
                    hardmode = true;
                    bubble.type = random(1, 6);
                }
                gamer.availableBubbles++;
            }
        }
    }

    // Init the next bubbles
    function nextBubble() {
        gamer.bubble.type = gamer.next.type;
        gamer.bubble.assigned = false;
        gamer.bubble.removed = false;
        gamer.bubble.checked = false;
        gamer.bubble.x = gamer.x;
        gamer.bubble.y = gamer.y;

        var sun = random(1,100);
        if(sun <= 3) {
            gamer.next.type = bubbleTypes.sun;
        } else if(gamer.availableBubbles <= 5) {
            var types = [];
            for(var j = 0; j < map.rows; j++) {
                for(var i = 0; i < map.columns; i++) {
                    var bubble = map.bubbles[i][j];
                    if(bubble.type >= bubbleTypes.mercury
                       && bubble.type <= bubbleTypes.saturn
                       && !bubble.removed
                       && !bubble.assigned) {
                        types.push(bubble.type);
                    }
                }
            }
            gamer.next.type = types[Math.floor(Math.random() * types.length)];
        } else {
            gamer.next.type = random(1,6);
        }
    }

    // Render the bubbles
    function renderBubbles() {
        if(bar >= bubbleSize) {
            bar = 0;
            removeAnimation = false;
        } else if(removeAnimation) {
            bar++;
        }

        for(var j = 0; j < map.rows; j++) {
            for(var i = 0; i < map.columns; i++) {
                var bubble = map.bubbles[i][j];

                // get the current bubble position
                var position = getBubblePosition(i, j);
                bubble.x = position.x;
                bubble.y = position.y;
                // get the cropped posiiton
                var crop = getBubbleCrop(map.bubbles[i][j].type);

                if(bubble.assigned) {
                    // bubble animation
                    if(bar >= bubbleSize) {
                        bubble.assigned = false;
                        bubble.removed = true;
                    }
                    context.drawImage(commonImage.source, crop, 0, map.bubble_w, map.bubble_h, position.x + bar/2, position.y + bar/2, map.bubble_w - bar, map.bubble_h - bar);
                } else if(!bubble.removed) {
                    context.drawImage(commonImage.source, crop, 0, map.bubble_w, map.bubble_h, position.x, position.y, map.bubble_w, map.bubble_h);
                } else {
                    continue;
                }
            }
        }
    }

    // Render the gamer's bubble
    function renderGamer() {
        renderAimLine();

        if(!processing) {
            gamer.bubble.x = gamer.x;
            gamer.bubble.y = gamer.y;
        }
        var crop = getBubbleCrop(gamer.bubble.type);
        context.drawImage(commonImage.source, crop, 0, map.bubble_w, map.bubble_h, gamer.bubble.x, gamer.bubble.y, map.bubble_w, map.bubble_h);
    }

    // Render the next bubble
    function renderNext() {
        var imgNext = new Image();
        imgNext.src = 'assets/img/bubbles.png';
        imgNext.onload = function() {
            var crop = getBubbleCrop(gamer.next.type);
            context_next.clearRect(0, 0, 70, 70);
            context_next.drawImage(imgNext, crop, 0, map.bubble_w, map.bubble_h, gamer.next.x, gamer.next.y, map.bubble_w, map.bubble_h);
        }
    }

    // Render the aiming line for the user
    function renderAimLine() {
        var c = {
            x: gamer.x + map.bubble_w / 2,
            y: gamer.y + map.bubble_h / 2
        };

        context.setLineDash([]);
        context.lineWidth = 3;
        context.strokeStyle = '#00ff00';
        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(c.x + 2 * map.bubble_w * Math.cos(deg2Rad(gamer.angle)), c.y -  2 * map.bubble_h * Math.sin(deg2Rad(gamer.angle)));
        context.stroke();
    }

    // Render the border line
    function renderBorderLine() {
        context.setLineDash([5, 15]);

        context.lineWidth = 1;
        context.strokeStyle = '#00ff00';
        context.beginPath();
        context.moveTo(0, (canvas.height - 155));
        context.lineTo(canvas.width, (canvas.height - 155));
        context.stroke();
    }

    // Returns the bubble position
    function getBubblePosition(column, row) {
        var x = map.x + column * map.bubble_w;
        
        var indent = 1;

        if(insertCounter % 2) {
            indent = 0;
        }

        if((row + 1) % 2 == indent) {
            x += map.bubble_w / 2;
        }

        var y = map.y + row * (map.bubble_h - map.bubble_s);
        return {x: x, y: y};
    }

    // Return the matrix current position
    function getMatrixPosition(x, y) {
        var my = Math.floor((y - map.y) / (map.bubble_h - map.bubble_s));

        var indent = 1;

        if(insertCounter % 2) {
            indent = 0;
        }

        var xoffset = 0;
        if((my + 1) % 2 == indent) {
            xoffset = map.bubble_w / 2;
        }

        var mx = Math.floor(((x - xoffset) - map.x) / map.bubble_w);
        return {x: mx, y: my};
    }

    // Returns the distance between two bubbles
    function isCollide(x1, y1, r1, x2, y2, r2) {
        var deltax = x1 - x2;
        var deltay = y1 - y2;
        var distance = Math.sqrt(deltax * deltax + deltay * deltay);
        if(distance <=  r1 + r2) {
            return true;
        }
        return false;
    }

    // Returns the selected bubble neighbours in an array
    function getNeighbours(x, y) {
        var neighbours = [];

        var indent = (y + 1) % 2;

        if(insertCounter % 2) {
            indent = (indent == 0) ? 1 : 0;
        }

        var index = [
            [[ 1,0], [0, 1], [-1, 1], [-1,0], [-1,-1], [0,-1]],
            [[-1,0], [0,-1], [ 1,-1], [ 1,0], [ 1, 1], [0, 1]],
        ];
        for (var i = index[indent].length - 1; i >= 0; i--) {
            var newX = index[indent][i][0] + x;
            var newY = index[indent][i][1] + y;
            if(newX >= 0 && newX < map.columns && newY >= 0 && newY < map.rows) {
                if(map.bubbles[newX][newY].type != -1 && !map.bubbles[newX][newY].removed) {
                    neighbours.push(map.bubbles[newX][newY]);
                }
            }
        }

        return neighbours;
    }

    // Return the crop x position
    function getBubbleCrop(type) {
        return type * map.bubble_w;
    }

    // Get the actuel position of the cursor
    function getCursorPosition(e) {
        var bound = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - bound.left) / (bound.right - bound.left) * canvas.width),
            y: Math.round((e.clientY - bound.top) / (bound.bottom - bound.top) * canvas.height)
        };
    }

    function resetChecked() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.bubbles[i][j].checked = false;
            }
        }
    }

    function resetRemoved() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.bubbles[i][j].removed = false;
            }
        }
    }

    function resetType() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.bubbles[i][j].type = -1;
            }
        }
    }
    
    function insertNewRow() {
        insertCounter++;
        for (var i = 0; i < map.columns; i++) {
            for (var j = 0; j < map.rows - 1; j++) {
               map.bubbles[i][map.rows -1 -j].type = map.bubbles[i][map.rows -1 -j -1].type;
               map.bubbles[i][map.rows -1 -j].checked = map.bubbles[i][map.rows -1 -j -1].checked;
               map.bubbles[i][map.rows -1 -j].assigned = map.bubbles[i][map.rows -1 -j -1].assigned;
               map.bubbles[i][map.rows -1 -j].removed = map.bubbles[i][map.rows -1 -j -1].removed;
            }
        }

        for (var i = 0; i < map.columns; i++) {
            map.bubbles[i][0].type = random(1, 6);
        }
    }

    function findGroup(x, y, match) {
        var bubble = map.bubbles[x][y];
        workingArray = [bubble];
        bubble.checked = true;

        var tGroup = [];

        while(workingArray.length > 0) {
            var currentBubble = workingArray.pop();

            // skip the empty places
            if(currentBubble.type == -1) {
                continue;
            }

            // skip the removed or assigned places
            if(currentBubble.removed || currentBubble.assigned) {
                continue;
            }


            if(!match || (currentBubble.type == bubble.type)) {
                // addthe current bubble to the tGroup
                tGroup.push(currentBubble);

                // calculate the current bubble matrix position
                var position = getMatrixPosition(currentBubble.x, currentBubble.y);
                // get the neighbours of the current bubble
                var neighbours = getNeighbours(position.x, position.y);

                for (var i = neighbours.length - 1; i >= 0; i--) {
                    if(!neighbours[i].checked) {
                        // add the neighbour to the working array
                        workingArray.push(neighbours[i]);
                        neighbours[i].checked = true;
                    }
                }
            }
        }

        // return the tGroup of bubbles
        return tGroup;
    }

    function findFloatingGroup() {
        //resetChecked();

        var iGroups = [];

        // check every bubble in the map
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                var bubble = map.bubbles[i][j];
                if(bubble.type != -1 && !bubble.checked) {
                    var iGroup = findGroup(i, j, false);

                    // skip the empty iGroup
                    if(iGroup.length <= 0) {
                        continue;
                    }

                    // floating check
                    var floating = true;
                    for (var k = iGroup.length - 1; k >= 0; k--) {
                        if(iGroup[k].y == 0) {
                            // connect to the top
                            floating = false;
                            break;
                        }
                    }

                    if(floating) {
                        iGroups.push(iGroup);
                    }
                }
            }
        }
        
        return iGroups;
    }

    function removeGroup() {
        // Enable the remove animation
        removeAnimation = true;

        // refresh the score
        gamer.score += map.single_score * group.length;
        refreshScore(gamer.score);

        // refresh tha available bubbles
        gamer.availableBubbles -= group.length;

        // set every bubble as assigned to remove
        for (var i = group.length - 1; i >= 0; i--) {
            group[i].assigned = true;
        }

        resetChecked();

        // play explosion sound effect
        effects.explosion.play();
    }

    function removeFloatingGroup() {
        // Enable the remove animation
        removeAnimation = true;

        // refresh the score
        gamer.score += map.floating_score * group.length;
        refreshScore(gamer.score);

        for (var i = group.length - 1; i >= 0; i--) {
            // refresh the available bubbles
            gamer.availableBubbles -= group[i].length;
            // set every bubble in the inner array as assigned
            for (var j = group[i].length - 1; j >= 0; j--) {
                group[i][j].assigned = true;
            }
        }

        resetChecked();

        // play explosion sound effect
        effects.explosion.play();
    }

    // Shoot the bubble
    function shoot() {
        if(processing) {
            gamer.bubble.x += gamer.bubble.speed * Math.cos(deg2Rad(gamer.bubble.angle));
            gamer.bubble.y += gamer.bubble.speed * -1 * Math.sin(deg2Rad(gamer.bubble.angle));

            if(gamer.bubble.x <= map.x) {
                // play the hit effect
                effects.hit.play();

                // left side
                gamer.bubble.angle = 180 - gamer.bubble.angle;
                gamer.bubble.x = map.x;
            } else if(gamer.bubble.x + map.bubble_w >= map.x + map.width) {
                // play the hit effect
                effects.hit.play();

                // right side
                gamer.bubble.angle = 180 - gamer.bubble.angle;
                gamer.bubble.x = map.x + map.width - map.bubble_w;
            }

            // top
            if(gamer.bubble.y <= map.y) {
                // play the hit effect
                effects.hit.play();

                gamer.bubble.y = map.y;
                putChains();
            }

            // detect other bubbles
            for(var i = 0; i < map.columns; i++) {
                for(var j = 0; j < map.rows; j++) {
                    var b = map.bubbles[i][j];
                    // ignore the removed or empty or assigned for remove bubbles space
                    if(b.type == -1 || b.removed || b.assigned) {
                        continue;
                    }

                    var position = getBubblePosition(i,j);
                    if(isCollide(gamer.bubble.x + map.bubble_w / 2,
                                 gamer.bubble.y + map.bubble_h / 2,
                                 map.bubble_r - 3,
                                 position.x + map.bubble_w / 2,
                                 position.y + map.bubble_h / 2,
                                 map.bubble_r - 3)) {
                        putChains();
                    }
                }
            }
        }
    }

    // Fix the bubble position
    function putChains() {
        processing = false;
        // get the bubble's current center position
        var cx = gamer.bubble.x + map.bubble_w / 2;
        var cy = gamer.bubble.y + map.bubble_h / 2;
        var position = getMatrixPosition(cx, cy);
        if(position.x < 0) {
            position.x = 0;
        }

        if(position.x >= map.columns) {
            position.x = map.columns - 1; // couse of array
        }

        if(position.y < 0) {
            position.y = 0;
        }

        if(position.y >= map.rows) {
            position.y = map.rows;
        }

        // Add the new bubble to teh available bubbles
        gamer.availableBubbles++;

        var realPosition = getBubblePosition(position.x, position.y);
        map.bubbles[position.x][position.y].x = realPosition.x;
        map.bubbles[position.x][position.y].y = realPosition.y;
        map.bubbles[position.x][position.y].type = gamer.bubble.type;
        map.bubbles[position.x][position.y].assigned = false;
        map.bubbles[position.x][position.y].removed = false;
        map.bubbles[position.x][position.y].checked = false;

        // play the hit effect
        effects.hit.play();

        paladin(map.bubbles[position.x][position.y]);

        gamer.shoots--;
        refreshShoots(gamer.shoots);
        if(gamer.shoots <= 0) {
            setStatus(status.game_over);
        }

        // get the next bubble
        nextBubble();
    }

    // Collects the groups, floating groups and removes them.
    // Sets the score and the next bubble.
    function paladin(bubble) {
        position = getMatrixPosition(bubble.x, bubble.y);

        // special effect
        if(bubble.type == bubbleTypes.sun) {
            // always remove the sun bubble
            bubble.assigned = true;
            bubble.checked = true;
            gamer.availableBubbles--;

            group = getNeighbours(position.x, position.y);
        } else {
            // try to find the same type of bubbles
            group = findGroup(position.x, position.y, true);
        }

        // check the workingArray length for remove or the sun is coming
        if(group.length >= 3 || bubble.type == bubbleTypes.sun) {
            // set 0 to the missedGroup
            gamer.missedGroups = 0;
            // remove the group from the map
            removeGroup();
            // search and remove the floating groups
            group = findFloatingGroup();
            if(group.length > 0) {
                removeFloatingGroup();
            } else {
                resetChecked();
            }
        } else {
            if(hardmode) {
                gamer.missedGroups++;
                if(gamer.missedGroups >= 5) {
                    gamer.missedGroups = 0;
                    insertNewRow();
                }
            }
            resetChecked();
        }

        // check for illegal bubbles
        setTimeout(function(){
            borderCheck();
        }, 300);

        // check the available bubbles
        // if there is no bubble on the map, the gamer won this round
        if(gamer.availableBubbles <= 0) {
            setStatus(status.done);
        }
    }

    function borderCheck() {
        for (var i = 0; i < map.columns; i++) {
            if(map.bubbles[i][map.rows - 1].type != bubbleTypes.none) {
                setStatus(status.fail);
                break;
            }
        }
    }

    // Set the game status
    function setStatus(s) {
        currentStatus = s;
        switch(s) {
            case status.game_over: {
                selectZone(zone.game_over);
                clearInterval(gamer.timer.interval);
                swithGameControlButtonText("Restart");
            } break;
            case status.done: {
                selectZone(zone.complete);
                clearInterval(gamer.timer.interval);

                // Convert to unused moves into score
                gamer.score += gamer.shoots * map.shoot_score;
                refreshScore(gamer.score);
                globalScore = gamer.score;
                refreshShoots(0);

                // change the Complete zone stats
                $("#congratulation-level-span").text(gamer.level);
                $("#congratulation-score-span").text(gamer.score);
                $("#congratulation-time-span").text(gamer.timer.minute + " min " + gamer.timer.second + " sec");

                //TODO: implement the new level action
            } break;
            case status.fail: {
                gamer.lives--;
                refreshLives(gamer.lives);
                if(gamer.lives <= 0) {
                    setStatus(status.game_over);
                } else {
                    selectZone(zone.oops);

                    // Pretend a good positioned shot
                    gamer.shoots--;
                    refreshShoots(gamer.shoots);
                    nextBubble();

                    // RESET THE LEVEL
                    resetLevel();

                    // Get back to the game after one sec
                    setTimeout(function(){
                        selectZone(zone.game);
                        setStatus(status.running);
                    }, 1000);
                }
            } break;
        }
    }

    init();
});
