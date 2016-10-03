$(function() {
    // Canvas and context
    var canvas =                document.getElementById("game");
    var context =               canvas.getContext("2d");
    var canvas_next =           document.getElementById("next");
    var context_next =          canvas_next.getContext("2d");

    var bubble_size =            50;                 // A single bubble x,y sideze in pixel

    // Map information
    var map = {
        x:                      0,                  // x position
        y:                      0,                  // y position
        width:                  0,                  // width
        height:                 0,                  // height
        columns:                9,                  // number of columns
        rows:                   13,                 // number of rows
        downgrade:              4,                  // numbers of free rows at the start
        bubble_w:               bubble_size,         // bubble image width
        bubble_h:               bubble_size,         // bubble image height
        bubble_r:               25,                 // bubble radius from center
        bubble_s:               5,                  // bubble split pixel
        bubbles:                [],                 // 2D bubbles array
        single_score:           3,                  // a single bubble`s score
        floating_score:         5,                  // a single floating bubble`s score
        shoot_score:            15,                 // a single unused move score
        number_of_max_lives:    3      
    };

    // Bubble class
    var Bubble = function(x, y, type, assigned, removed, checked, id) {
        this.x =                x;                  // set the x position
        this.y =                y;                  // set the y position
        this.type =             type;               // set the type
        this.assigned =         assigned;           // set the assigned option
        this.removed =          removed;            // set the removed option
        this.checked =          checked;            // set the checked option
        this.id =               id;                 // set the bubble id
    }

    // Gamer information
    var gamer = {
        x:                      0,                  // gamer x position
        x:                      0,                  // gamer y position
        angle:                  0,                  // gamer and mouse angle
        bubble: {
            x:                  0,                  // bubble x position
            y:                  0,                  // bubble y position
            angle:              0,                  // bubble and mouse angle
            speed:              10,                 // bubble move speed
            type:               -1                  // bubble type
        },
        next: {                                     // the next bubble info
            x:                  0,                  // next bubble x position
            y:                  0,                  // next bubble y position
            type:               0                   // next bubble type
        },
        lives:                  3,                  // actual lives
        score:                  0,                  // actual score,
        level:                  0,                  // actual level
        shoots:                 0,                  // available shoots per level
        available_bubbles:      0,                  // available bubbles number on the map
        missed_groups:          0,                  // counter for the missed default or floated group
        timer: {
            minute:             0,                  // actual timer minute
            second:             0,                  // actual timer second
            interval:           null                // timer interval
        }
    };

    // Statistical struct
    var stat_types = {
        lives:                  0,
        score:                  1,
        time:                   2,
        level:                  3,
        shoots:                 4
    };

    // The music object
    var music = {
        mute:                   false,
        dom:                    null
    };

    // The sound effects object
    var effects = {
        mute:                   false,
        shoot:                  null,
        explosion:              null,
        hit:                    null
    };

    // Fullscreen indicator
    var is_fullscreen =         false;

    // The bubbles image object
    var common_image = {
        source:                 null,
        loaded:                 false,
    };

    // Zones enum
    var zone = {
        list:                   [
                                'game-zone',
                                'welcome-zone',
                                'pause-zone',
                                'game-over-zone',
                                'complete-zone',
                                'high-scores-zone',
                                'about-zone',
                                'oops-zone'
                                ],
        game:                   0,
        welcome:                1,
        pause:                  2,
        game_over:              3,
        complete:               4,
        highscores:             5,
        about:                  6,
        oops:                   7
    };

    // The bubbles [globes] type enum
    var bubble_types = {
        none:                   -1,
        sun:                    0,
        mercury:                1,
        venus:                  2,
        earth:                  3,
        mars:                   4,
        jupiter:                5,
        saturn:                 6
    };

    // The game status codes enum
    var status = {
        init:                   0,
        running:                1,
        paused:                 2,
        game_over:              3,
        completed:              4,
        fail:                   5
    };

    var global_score =          0;                  // global score

    var current_status =        null;               // The actual status of the game
    var processing =            false;              // Variable for the moving bubble
    var animation_id =          null;               // Requested animation frame
    var group =                 [];                 // Array for the founded groups
    var working_array =         [];                 // Temporary array for the group finder function
    var id_counter =            0;                  // Counter for the bubbles id
    var bar =                   0;                  // Bubble animation - reduction
    var remove_animation =      false;              // Bubble animation - enable
    var hardmode =              false;              // hardmode indicator
    var insert_counter =        0;                  // inserted new row counter

    // Variables for animationFrame
    var fps,
        fps_interval,
        now,
        then,
        elapsed;

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
            switch(current_status) {
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
                case status.done:
                    nextLevel();
                case status.paused: {
                    toggleNavigation();
                    setStatus(status.running);
                    selectZone(zone.game);
                    swithGameControlButtonText("Pause");
                    // Start the timer
                    gamer.timer.interval = setInterval(calculate_time, 1000);
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
            if(current_status != status.init) {
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

            is_fullscreen = !is_fullscreen;
            refreshFullscreenMenuItem(is_fullscreen);
        });

        // init the bubbles array
        for(var i = 0; i < map.columns; i++) {
            map.bubbles[i] = [];
            for(var j = 0; j < map.rows; j++) {
                id_counter++;
                map.bubbles[i][j] = new Bubble(i,j, -1, false, false, id_counter);
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
        set_stat(stat_types.lives, gamer.lives);

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
        common_image.source = new Image();
        common_image.source.src = 'assets/img/bubbles.png';
        common_image.source.onload = function() {
            common_image.loaded = true;
        };
    }

    // New game
    function newGame() {
        // reset the bubbles
        resetChecked();
        resetType();
        resetRemoved();

        // If we used animation, cancel that
        if(animation_id != null) {
            cancelAnimationFrame(animation_id);
        }

        // reset the stats
        set_stat(stat_types.lives, 3);
        set_stat(stat_types.score, 0);
        set_stat(stat_types.level, 1);
        set_stat(stat_types.shoots, 120);
        gamer.available_bubbles = 0;
        gamer.timer.minute = 0;
        gamer.timer.second = 0;
        set_stat(stat_types.time);
        // Init a new timer
        gamer.timer.interval = setInterval(calculate_time, 1000);

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
        fps_interval = 1000 / fps;
        then = Date.now();
        loop();
    }

    // The main event loop function
    function loop() {
        // Animation fram for this function
        animation_id = requestAnimationFrame(loop);

        // dates for the fps calculation
        now = Date.now();
        elapsed = now - then;

        // if enough time has elapsed, draw the next frame
        if(elapsed > fps_interval) {
            // Get ready for next frame by setting then=now, but also, adjust for fps_interval
            then = now - (elapsed % fps_interval);

            // drawing context
            if(common_image.loaded) {
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
            $(img).clone().appendTo('#lives-img').addClass('lives').attr('id', (i + 1) + '_heart');
        }
    }

    // Switch the game control button text to the actual status text
    function swithGameControlButtonText(text) {
        $('#game-control-button').text(text);
    }

    function set_stat(item, value = null) {
        switch(item) {
            case stat_types.lives: {
                gamer.lives = value;
                for (var i = 3; i >= 0; i--) {
                    if (i > value) {
                        $('#' + i + '_heart').css('display', 'none');
                    } else {
                        $('#' + i + '_heart').css('display', 'block');
                    } 
                }
            } break;
            case stat_types.score: {
                gamer.score = value;
                $('#game-score').text(value);
            } break;
            case stat_types.time: {
                var time = "";
                (gamer.timer.minute < 10) ? (time = "0" + gamer.timer.minute) : (time = gamer.timer.minute);
                (gamer.timer.second < 10) ? (time += ":0" + gamer.timer.second) : (time += ":" + gamer.timer.second);
                $('#game-time').text(time);
            } break;
            case stat_types.level: {
                gamer.level = value;
                $('#game-level').text(value);
            } break;
            case stat_types.shoots: {
                gamer.shoots = value;
                if(gamer.shoots < 80) {
                    gamer.shoots = 80;
                }
                $('#number-of-next').text(value);
            } break;
        }
    }

    function calculate_time() {
        gamer.timer.second++;
        if(gamer.timer.second > 59) {
            gamer.timer.minute++;
            gamer.timer.second = 0;
        }
        if(gamer.timer.second > 59 && gamer.timer.minute > 59) {
            clearInterval(gamer.timer.interval);
        }
        set_stat(stat_types.time);
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
        set_stat(stat_types.lives, 3);
        set_stat(stat_types.score, 0);
        set_stat(stat_types.level, 0);
        set_stat(stat_types.shoots, 0);
        gamer.timer.minute = 0;
        gamer.timer.second = 0;
        set_stat(stat_types.time);
        clearInterval(gamer.timer.interval);
        gamer.available_bubbles = 0;
        gamer.next.type = bubble_types.none;
        gamer.missed_groups = 0;
        hardmode = false;
        insert_counter = 0;
    }

    function resetLevel() {
        resetChecked();
        resetType();
        resetRemoved();
        set_stat(stat_types.shoots, 120 - ((gamer.level - 1) * 5));
        gamer.available_bubbles = 0;
        gamer.missed_groups = 0;
        set_stat(stat_types.score, global_score);
        insert_counter = 0;
        createMap();
        nextBubble();
        nextBubble();
    }

    function nextLevel() {
        resetChecked();
        resetType();
        resetRemoved();
        set_stat(stat_types.level, gamer.level + 1);
        set_stat(stat_types.shoots, 120 - ((gamer.level - 1) * 5));
        gamer.available_bubbles = 0;
        gamer.missed_groups = 0;
        set_stat(stat_types.score, global_score);
        insert_counter = 0;
        createMap();
        nextBubble();
        nextBubble();
    }

    // Create a new random filled map
    function createMap() {
        var easy = bubble_types.none;
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
                gamer.available_bubbles++;
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
            gamer.next.type = bubble_types.sun;
        } else if(gamer.available_bubbles <= 5) {
            var types = [];
            for(var j = 0; j < map.rows; j++) {
                for(var i = 0; i < map.columns; i++) {
                    var bubble = map.bubbles[i][j];
                    if(bubble.type >= bubble_types.mercury
                       && bubble.type <= bubble_types.saturn
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
        if(bar >= bubble_size) {
            bar = 0;
            remove_animation = false;
        } else if(remove_animation) {
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
                    if(bar >= bubble_size) {
                        bubble.assigned = false;
                        bubble.removed = true;
                    }
                    context.drawImage(common_image.source, crop, 0, map.bubble_w, map.bubble_h, position.x + bar/2, position.y + bar/2, map.bubble_w - bar, map.bubble_h - bar);
                } else if(!bubble.removed) {
                    context.drawImage(common_image.source, crop, 0, map.bubble_w, map.bubble_h, position.x, position.y, map.bubble_w, map.bubble_h);
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
        context.drawImage(common_image.source, crop, 0, map.bubble_w, map.bubble_h, gamer.bubble.x, gamer.bubble.y, map.bubble_w, map.bubble_h);
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

        if(insert_counter % 2) {
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

        if(insert_counter % 2) {
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

        if(insert_counter % 2) {
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
        insert_counter++;
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
        working_array = [bubble];
        bubble.checked = true;

        var tGroup = [];

        while(working_array.length > 0) {
            var currentBubble = working_array.pop();

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
                        working_array.push(neighbours[i]);
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
        remove_animation = true;

        // refresh the score
        set_stat(stat_types.score, gamer.score + map.single_score * group.length);

        // refresh tha available bubbles
        gamer.available_bubbles -= group.length;

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
        remove_animation = true;

        // refresh the score
        set_stat(stat_types.score, gamer.score + map.floating_score * group.length);

        for (var i = group.length - 1; i >= 0; i--) {
            // refresh the available bubbles
            gamer.available_bubbles -= group[i].length;
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
        gamer.available_bubbles++;

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

        set_stat(stat_types.shoots, gamer.shoots - 1);
        if(gamer.shoots <= 0) {
            setStatus(status.fail);
        }

        // get the next bubble
        nextBubble();
    }

    // Collects the groups, floating groups and removes them.
    // Sets the score and the next bubble.
    function paladin(bubble) {
        position = getMatrixPosition(bubble.x, bubble.y);

        // special effect
        if(bubble.type == bubble_types.sun) {
            // always remove the sun bubble
            bubble.assigned = true;
            bubble.checked = true;
            gamer.available_bubbles--;

            group = getNeighbours(position.x, position.y);
        } else {
            // try to find the same type of bubbles
            group = findGroup(position.x, position.y, true);
        }

        // check the working_array length for remove or the sun is coming
        if(group.length >= 3 || bubble.type == bubble_types.sun) {
            // set 0 to the missedGroup
            gamer.missed_groups = 0;
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
                gamer.missed_groups++;
                if(gamer.missed_groups >= 5) {
                    gamer.missed_groups = 0;
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
        if(gamer.available_bubbles <= 0) {
            setStatus(status.done);
        }
    }

    function borderCheck() {
        for (var i = 0; i < map.columns; i++) {
            if(map.bubbles[i][map.rows - 1].type != bubble_types.none) {
                setStatus(status.fail);
                break;
            }
        }
    }

    // Set the game status
    function setStatus(s) {
        current_status = s;
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
                set_stat(stat_types.score, gamer.score + gamer.shoots * map.shoot_score);
                global_score = gamer.score;
                refreshShoots(0);

                // change the Complete zone stats
                $("#congratulation-level-span").text(gamer.level);
                $("#congratulation-score-span").text(gamer.score);
                $("#congratulation-time-span").text(gamer.timer.minute + " min " + gamer.timer.second + " sec");

                swithGameControlButtonText("Next level");
            } break;
            case status.fail: {
                set_stat(stat_types.lives, gamer.lives - 1);
                if(gamer.lives <= 0) {
                    setTimeout(function() {
                        setStatus(status.game_over);
                    }, 300);
                } else {
                    selectZone(zone.oops);

                    // Pretend a good positioned shot
                    set_stat(stat_types.shoots, gamer.shoots - 1);
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
