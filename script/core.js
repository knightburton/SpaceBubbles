$(function() {
    // Canvas and context init
    var canvas =                document.getElementById("game");
    var context =               canvas.getContext("2d");
    var canvas_next =           document.getElementById("next-planet");
    var context_next =          canvas_next.getContext("2d");

    var planet_size =            50;                // A single planet x,y sideze in pixel

    // Map information
    var map = {
        x:                      0,                  // x position
        y:                      0,                  // y position
        width:                  0,                  // width
        height:                 0,                  // height
        columns:                9,                  // number of columns
        rows:                   13,                 // number of rows
        downgrade:              4,                  // numbers of free rows at the begining
        planet_w:               planet_size,        // planet image width
        planet_h:               planet_size,        // planet image height
        planet_r:               25,                 // planet radius from center
        planet_s:               5,                  // planet split pixel
        planets:                [],                 // 2D planets array
        single_score:           3,                  // single planet score
        floating_score:         5,                  // floating planet score
        shoot_score:            15,                 // an unused shoot score
        number_of_max_lives:    3                   // the number of the maximum lives per game
    };

    // planet class
    var Planet = function(x, y, type, assigned, removed, checked, id) {
        this.x =                x;
        this.y =                y;
        this.type =             type;
        this.assigned =         assigned;
        this.removed =          removed;
        this.checked =          checked;
        this.id =               id;
    }

    // Gamer information
    var gamer = {
        x:                      0,                  // gamer x position
        x:                      0,                  // gamer y position
        angle:                  0,                  // gamer and mouse angle
        planet: {
            x:                  0,                  // planet x position
            y:                  0,                  // planet y position
            angle:              0,                  // planet and mouse angle
            speed:              10,                 // planet move speed
            type:               -1                  // planet type
        },
        next: {                                     // the next planet info
            x:                  0,                  // next planet x position
            y:                  0,                  // next planet y position
            type:               0                   // next planet type
        },
        lives:                  3,                  // actual lives
        score:                  0,                  // actual score,
        level:                  0,                  // actual level
        shoots:                 0,                  // available shoots per level
        available_planets:      0,                  // available planets number on the map
        missed_groups:          0,                  // counter for the missed default or floated group
        timer: {
            minute:             0,                  // actual timer minute
            second:             0,                  // actual timer second
            interval:           null                // timer interval object
        }
    };

    // Statistical table structure
    var stat_types = {
        lives:                  0,
        score:                  1,
        time:                   2,
        level:                  3,
        shoots:                 4
    };

    // The menu structure
    var menu_items = {
        game_control:           0,
        high_scores:            1,
        about:                  2,
        music:                  3,
        effects:                4,
        fullscreen:             5,
        reset:                  6
    };

    // The main music object
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

    // The planets image object
    var planets_image = {
        source:                 null,
        loaded:                 false,
    };

    // Zones enum
    var zone = {
        // list with the html tags id
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

    // The planets type enum
    var planet_types = {
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
    var processing =            false;              // Variable for the moving planet
    var animation_id =          null;               // Requested animation frame
    var group =                 [];                 // Array for the founded groups
    var working_array =         [];                 // Temporary array for the group finder function
    var id_counter =            0;                  // Counter for the planets id
    var bar =                   0;                  // planet animation - reduction
    var remove_animation =      false;              // planet animation - enable
    var hardmode =              false;              // hardmode indicator
    var insert_counter =        0;                  // inserted new row counter

    // Variables for animationFrame
    var fps,
        fps_interval,
        now,
        then,
        elapsed;

    // Taffy db
    var db = TAFFY();
    db.store("high_scores");

    // Initialize function
    function init() {
        // Set the init status.
        set_game_status(status.init);
        // set the welcome zone
        set_action_zone(zone.welcome);

        // Init the background music
        init_background_music();
        // Init the sound effects
        init_effects();

        // subscribe to mouse events
        canvas.addEventListener('mousemove', canvas_mouse_move);
        canvas.addEventListener('click', canvas_click);

        // implements the menu items clicks
        $('#game-control-button').on('click', function() {
            switch(current_status) {
                case status.init:
                case status.game_over: {
                    toggle_menu_action("both", false);
                    set_game_status(status.running);
                    set_action_zone(zone.game);
                    set_menu_item_text(menu_items.game_control, "Pause");
                    new_game();
                } break;
                case status.running: {
                    toggle_menu_action("both", true);
                    set_game_status(status.paused);
                    set_action_zone(zone.pause);
                    set_menu_item_text(menu_items.game_control, "Continue");
                    clearInterval(gamer.timer.interval);
                } break;
                case status.done:
                    next_level();
                case status.paused: {
                    toggle_menu_action("both", false);
                    set_game_status(status.running);
                    set_action_zone(zone.game);
                    set_menu_item_text(menu_items.game_control, "Pause");
                    gamer.timer.interval = setInterval(calculate_time, 1000);
                } break;
            }
        });

        // The menu item click functions
        $('#high-scores-button').on('click', function() {
            set_action_zone(zone.highscores);
            toggle_menu_action(menu_items.high_scores, false);
            toggle_menu_action(menu_items.about, true);
            $('#ul-content').empty();
            db().order("score desc").each(function (record, recordnumber) {
                var score_div = $('<div><span>' + record["score"] + '</span></div>');
                var level_div = $('<div><span>' + record["level"] + '</span></div>');
                var time_div = $('<div><span>' + record["time"] + '</span></div>');
                
                var li = $('<li></li>').append(score_div).append(level_div).append(time_div);

                $('#ul-content').append(li);
            });
        });

        $('#about-button').on('click', function() {
            set_action_zone(zone.about);
            toggle_menu_action(menu_items.high_scores, true);
            toggle_menu_action(menu_items.about, false);
        });

        $('#music-button').on('click', toggle_music);

        $('#effects-button').on('click', toggle_effects);

        $('#reset-button').on('click', function() {
            if(current_status != status.init) {
                reset();
                set_game_status(status.init);
                set_menu_item_text(menu_items.game_control, "New Game");
                $('.navigation-button').removeClass("disable-navigation-button");
                set_action_zone(zone.welcome);
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
            set_menu_item_text(menu_items.fullscreen, is_fullscreen);
        });

        // init the planets array
        for(var i = 0; i < map.columns; i++) {
            map.planets[i] = [];
            for(var j = 0; j < map.rows; j++) {
                id_counter++;
                map.planets[i][j] = new Planet(i,j, -1, false, false, id_counter);
            }
        }

        // Init tha map
        map.width = map.columns * map.planet_w + map.planet_w/2;
        map.height = canvas.height - map.planet_h - 10;

        // Init the gamer
        gamer.x = map.x + map.width/2 - map.planet_w/2;
        gamer.y = map.y + map.height;
        gamer.angle = 90;
        gamer.next.x = 10
        gamer.next.y = 10

        // Init and Refresh the live hearths
        init_hearth_images();
        set_stat(stat_types.lives, gamer.lives);

        // Init the image of planets
        load_planets_image();
    }

    // Init and start the background music
    function init_background_music() {
        music.dom = document.createElement('AUDIO');
        music.dom.src = 'assets/sound/Most_awesome_8-bit_song_ever.mp3';
        music.dom.loop = true;
        music.dom.play();
        music.dom.volume = 0.7;
    }

    // Init the effects
    function init_effects() {
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

    // Init the lives image
    function init_hearth_images() {
        var img = load_hearth_image();
        for(var i = 0; i < gamer.lives; i++) {
            $(img).clone().appendTo('#lives').addClass('lives').attr('id', (i + 1) + '_heart');
        }
    }

    // Load the hearth image
    function load_hearth_image() {
        var hearth = new Image();
        hearth.src = 'assets/img/hearth.png';
        return hearth;
    }

    // Load the image of planets
    function load_planets_image() {
        planets_image.source = new Image();
        planets_image.source.src = 'assets/img/planets.png';
        planets_image.source.onload = function() {
            planets_image.loaded = true;
        };
    }

    // create a new game
    function new_game() {
        // reset the planets
        reset_checked_planets();
        reset_planets_type();
        reset_removed_planets();

        // If we used animation, cancel that
        if(animation_id != null) {
            cancelAnimationFrame(animation_id);
        }

        // reset the stats
        set_stat(stat_types.lives, 3);
        set_stat(stat_types.score, 0);
        set_stat(stat_types.level, 1);
        set_stat(stat_types.shoots, 120);
        gamer.available_planets = 0;
        gamer.timer.minute = 0;
        gamer.timer.second = 0;
        set_stat(stat_types.time);
        gamer.timer.interval = setInterval(calculate_time, 1000);

        // Create a new map
        create_random_map();

        // Init the next and set the gamer planet
        load_next_planet();
        load_next_planet();

        // start the main loop with 60 fps
        start_loop(60);
    }

    // Set up the loop fps
    function start_loop(fps) {
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

            // draw the context
            if(planets_image.loaded) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                render_planets();
                render_gamer();
                render_next_planet();
                render_bottom_border();
            }

            if(processing) {
                fire();
            }
        }
    }

    // Mouse movement in the canavs
    function canvas_mouse_move(e) {
        var mouse_poisition = get_cursor_position(e);
        var mouse_angle = rad_to_deg(Math.atan2((gamer.y + map.planet_h / 2) - mouse_poisition.y, mouse_poisition.x - (gamer.x + map.planet_w / 2)));

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
    function canvas_click() {
        if(!processing  && !remove_animation) {
            // play the shoot effect
            effects.shoot.play();

            gamer.planet.x = gamer.x;
            gamer.planet.y = gamer.y;
            gamer.planet.angle = gamer.angle;
            processing = true;
        }
    }

    // Set the selected zone :D
    function set_action_zone(selected_zone) {
        for(var i = 0; i < zone.list.length; i++) {
            if(i != selected_zone) {
                $('#' + zone.list[i]).hide();
            } else {
                $('#' + zone.list[i]).show();
            }
        }
    }

    // change the statisctical display table items texts
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
                $('#score').text(value);
            } break;
            case stat_types.time: {
                var time = "";
                (gamer.timer.minute < 10) ? (time = "0" + gamer.timer.minute) : (time = gamer.timer.minute);
                (gamer.timer.second < 10) ? (time += ":0" + gamer.timer.second) : (time += ":" + gamer.timer.second);
                $('#time').text(time);
            } break;
            case stat_types.level: {
                gamer.level = value;
                $('#level').text(value);
            } break;
            case stat_types.shoots: {
                gamer.shoots = value;
                $('#shoots').text(value);
            } break;
        }
    }

    // change the menu items text
    function set_menu_item_text(item, value) {
        switch(item) {
            case menu_items.game_control: {
                $('#game-control-button').text(value);
            } break;
            case menu_items.music: {
                var text = (value) ? 'OFF' : 'ON';
                $('#music-button span').text(text);
            } break;
            case menu_items.effects: {
                var text = (value) ? 'OFF' : 'ON';
                $('#effects-button span').text(text);
            } break;
            case menu_items.fullscreen: {
                var text = (value) ? 'ON' : 'OFF';
                $('#fullscreen-button span').text(text);
            } break;
        }
    }

    // Set up the game status, and add some additional options
    function set_game_status(s) {
        current_status = s;
        // additional options
        switch(s) {
            case status.game_over: {
                set_action_zone(zone.game_over);
                toggle_menu_action("both", true);
                clearInterval(gamer.timer.interval);
                set_menu_item_text(menu_items.game_control, "Restart");
            } break;
            case status.done: {
                set_action_zone(zone.complete);
                toggle_menu_action("both", true);
                clearInterval(gamer.timer.interval);

                // Convert to unused moves into score
                set_stat(stat_types.score, gamer.score + gamer.shoots * map.shoot_score);
                global_score = gamer.score;
                set_stat(stat_types.shoots, 0);

                // change the Complete zone stats
                $("#congratulation-level-span").text(gamer.level);
                $("#congratulation-score-span").text(gamer.score);
                $("#congratulation-time-span").text(gamer.timer.minute + " min " + gamer.timer.second + " sec");

                set_menu_item_text(menu_items.game_control, "Next Level");
            } break;
            case status.fail: {
                set_stat(stat_types.lives, gamer.lives - 1);
                if(gamer.lives <= 0) {
                    global_score = gamer.score;
                    setTimeout(function() {
                        set_game_status(status.game_over);

                        // change the game over stats
                        $("#failed-level-span").text(gamer.level);
                        $("#failed-score-span").text(gamer.score);
                        $("#failed-time-span").text(gamer.timer.minute + " min " + gamer.timer.second + " sec");

                        if(global_score > 0) {
                            console.log("INSERT IS ON");
                            db.insert({score:gamer.score, level:gamer.level, time:gamer.timer.minute + ":" + gamer.timer.second});
                            if(db().count() > 24) {
                                db().order("score desc").last().remove();
                            }
                        }
                    }, 300);
                } else {
                    set_action_zone(zone.oops);

                    // Pretend a good positioned shot
                    set_stat(stat_types.shoots, gamer.shoots - 1);
                    load_next_planet();

                    // RESET THE LEVEL
                    reset_current_level();

                    // Get back to the game after one sec
                    setTimeout(function(){
                        set_action_zone(zone.game);
                        set_game_status(status.running);
                    }, 1000);
                }
            } break;
        }
    }

    // Enable or disable navigation buttons
    function toggle_menu_action(item, enabled) {
        var element = null;
        switch(item) {
            case menu_items.high_scores: {
                element = $("#high-scores-button");
            } break;
            case menu_items.about: {
                element = $("#about-button");
            } break;
            default: {
                element = $(".navigation-button");
            } break;
        }
        if(enabled) {
            element.removeClass("disable-navigation-button");
        } else {
            element.addClass("disable-navigation-button");
        }
    }

    // Mute and unmute the background music
    function toggle_music() {
        music.mute = !music.mute;
        music.dom.muted = music.mute;
        set_menu_item_text(menu_items.music, music.mute);
    }

    // Mute and unmute the effects
    function toggle_effects() {
        effects.mute = !effects.mute;
        effects.shoot.muted = effects.mute;
        effects.explosion.muted = effects.mute;
        effects.hit.muted = effects.mute;
        set_menu_item_text(menu_items.effects, music.mute);
    }

    // Reset, back to the welcome page
    function reset() {
        reset_checked_planets();
        reset_planets_type();
        reset_removed_planets();
        set_stat(stat_types.lives, 3);
        set_stat(stat_types.score, 0);
        set_stat(stat_types.level, 0);
        set_stat(stat_types.shoots, 0);
        gamer.timer.minute = 0;
        gamer.timer.second = 0;
        set_stat(stat_types.time);
        clearInterval(gamer.timer.interval);
        gamer.available_planets = 0;
        gamer.next.type = planet_types.none;
        gamer.missed_groups = 0;
        hardmode = false;
        insert_counter = 0;
    }

    // reset the current level with the actual score
    function reset_current_level() {
        reset_checked_planets();
        reset_planets_type();
        reset_removed_planets();
        set_stat(stat_types.shoots, 120 - ((gamer.level - 1) * 5));
        gamer.available_planets = 0;
        gamer.missed_groups = 0;
        set_stat(stat_types.score, global_score);
        insert_counter = 0;
        create_random_map();
        load_next_planet();
        load_next_planet();
    }

    // set up the next level ingredients and information
    function next_level() {
        reset_checked_planets();
        reset_planets_type();
        reset_removed_planets();
        set_stat(stat_types.level, gamer.level + 1);
        var temp_shoots = 120 - ((gamer.level - 1) * 5);
        if(temp_shoots < 80) {
            temp_shoots = 80;
        }
        set_stat(stat_types.shoots, temp_shoots);
        gamer.available_planets = 0;
        gamer.missed_groups = 0;
        set_stat(stat_types.score, global_score);
        insert_counter = 0;
        create_random_map();
        load_next_planet();
        load_next_planet();
    }

    // Create a new random filled map
    function create_random_map() {
        var easy = planet_types.none;
        for(var j = 0; j < map.rows - map.downgrade; j++) {
            for(var i = 0; i < map.columns; i++) {
                var planet = map.planets[i][j];
                if(gamer.level <= 2) {
                    if(i % 2 == 0) {
                        var tmp = random(1, 6);
                        while(easy == tmp) {
                            tmp = random(1, 6);
                        }
                        easy = tmp;
                    }
                    planet.type = easy;
                } else if(gamer.level <= 4) {
                    planet.type = random(1, 6);
                } else {
                    hardmode = true;
                    planet.type = random(1, 6);
                }
                gamer.available_planets++;
            }
        }
    }

    // Init the next planets
    function load_next_planet() {
        gamer.planet.type =     gamer.next.type;
        gamer.planet.assigned = false;
        gamer.planet.removed =  false;
        gamer.planet.checked =  false;
        gamer.planet.x =        gamer.x;
        gamer.planet.y =        gamer.y;

        var sun = random(1,100);
        if(sun <= 3) {
            gamer.next.type = planet_types.sun;
        } else if(gamer.available_planets <= 5) {
            var types = [];
            for(var j = 0; j < map.rows; j++) {
                for(var i = 0; i < map.columns; i++) {
                    var planet = map.planets[i][j];
                    if(planet.type >= planet_types.mercury
                       && planet.type <= planet_types.saturn
                       && !planet.removed
                       && !planet.assigned) {
                        types.push(planet.type);
                    }
                }
            }
            gamer.next.type = types[Math.floor(Math.random() * types.length)];
        } else {
            gamer.next.type = random(1,6);
        }
    }

    // Render the planets array
    function render_planets() {
        if(bar >= planet_size) {
            bar = 0;
            remove_animation = false;
        } else if(remove_animation) {
            bar++;
        }

        for(var j = 0; j < map.rows; j++) {
            for(var i = 0; i < map.columns; i++) {
                var planet = map.planets[i][j];

                // get the current planet position
                var position = get_planet_real_position(i, j);
                planet.x = position.x;
                planet.y = position.y;

                // get the cropped posiiton
                var crop = get_planet_crop(map.planets[i][j].type);

                if(planet.assigned) {
                    // planet removing animation
                    if(bar >= planet_size) {
                        planet.assigned = false;
                        planet.removed = true;
                    }
                    context.drawImage(planets_image.source, crop, 0, map.planet_w, map.planet_h, position.x + bar/2, position.y + bar/2, map.planet_w - bar, map.planet_h - bar);
                } else if(!planet.removed) {
                    context.drawImage(planets_image.source, crop, 0, map.planet_w, map.planet_h, position.x, position.y, map.planet_w, map.planet_h);
                } else {
                    continue;
                }
            }
        }
    }

    // Render the gamer's planet
    function render_gamer() {
        render_aim_helper_line();

        if(!processing) {
            gamer.planet.x = gamer.x;
            gamer.planet.y = gamer.y;
        }

        if(!remove_animation) {
            var crop = get_planet_crop(gamer.planet.type);
            context.drawImage(planets_image.source, crop, 0, map.planet_w, map.planet_h, gamer.planet.x, gamer.planet.y, map.planet_w, map.planet_h);
        }
    }

    // Render the next planet
    function render_next_planet() {
        var imgNext = new Image();
        imgNext.src = 'assets/img/planets.png';
        imgNext.onload = function() {
            var crop = get_planet_crop(gamer.next.type);
            context_next.clearRect(0, 0, 70, 70);
            context_next.drawImage(imgNext, crop, 0, map.planet_w, map.planet_h, gamer.next.x, gamer.next.y, map.planet_w, map.planet_h);
        }
    }

    // Render the aiming line
    function render_aim_helper_line() {
        var c = {
            x: gamer.x + map.planet_w / 2,
            y: gamer.y + map.planet_h / 2
        };

        context.setLineDash([]);
        context.lineWidth = 3;
        context.strokeStyle = '#00ff00';
        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(c.x + 2 * map.planet_w * Math.cos(deg_to_rad(gamer.angle)), c.y -  2 * map.planet_h * Math.sin(deg_to_rad(gamer.angle)));
        context.stroke();
    }

    // Render the bottom border line
    function render_bottom_border() {
        context.setLineDash([5, 15]);

        context.lineWidth = 1;
        context.strokeStyle = '#00ff00';
        context.beginPath();
        context.moveTo(0, (canvas.height - 155));
        context.lineTo(canvas.width, (canvas.height - 155));
        context.stroke();
    }

    // Returns the planet real position on the canvas
    function get_planet_real_position(column, row) {
        var x = map.x + column * map.planet_w;
        
        var indent = 1;

        if(insert_counter % 2) {
            indent = 0;
        }

        if((row + 1) % 2 == indent) {
            x += map.planet_w / 2;
        }

        var y = map.y + row * (map.planet_h - map.planet_s);
        return {x: x, y: y};
    }

    // Returns with the planet matrix position
    function get_planet_matrix_position(x, y) {
        var my = Math.floor((y - map.y) / (map.planet_h - map.planet_s));

        var indent = 1;

        if(insert_counter % 2) {
            indent = 0;
        }

        var xoffset = 0;
        if((my + 1) % 2 == indent) {
            xoffset = map.planet_w / 2;
        }

        var mx = Math.floor(((x - xoffset) - map.x) / map.planet_w);
        return {x: mx, y: my};
    }

    // Returns with the distance between two planets
    function is_collide(x1, y1, r1, x2, y2, r2) {
        var deltax = x1 - x2;
        var deltay = y1 - y2;
        var distance = Math.sqrt(deltax * deltax + deltay * deltay);
        if(distance <=  r1 + r2) {
            return true;
        }
        return false;
    }

    // Returns with the selected planet neighbours in an array
    function get_planet_neighbours(x, y) {
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
            var new_x = index[indent][i][0] + x;
            var new_y = index[indent][i][1] + y;
            if(new_x >= 0 && new_x < map.columns && new_y >= 0 && new_y < map.rows) {
                if(map.planets[new_x][new_y].type != -1 && !map.planets[new_x][new_y].removed) {
                    neighbours.push(map.planets[new_x][new_y]);
                }
            }
        }

        return neighbours;
    }

    // Return the crop x position
    function get_planet_crop(type) {
        return type * map.planet_w;
    }

    // Get the actuel position of the cursor
    function get_cursor_position(e) {
        var bound = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - bound.left) / (bound.right - bound.left) * canvas.width),
            y: Math.round((e.clientY - bound.top) / (bound.bottom - bound.top) * canvas.height)
        };
    }

    // reset the planets cehecked status to the default (false)
    function reset_checked_planets() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.planets[i][j].checked = false;
            }
        }
    }

    // reset the planets removed status to the default (false)
    function reset_removed_planets() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.planets[i][j].removed = false;
            }
        }
    }

    // reset the planets type to the default (none)
    function reset_planets_type() {
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                map.planets[i][j].type = planet_types.none;
            }
        }
    }
    
    // insert a new planet row to the top
    function insert_new_planet_row() {
        insert_counter++;
        for (var i = 0; i < map.columns; i++) {
            for (var j = 0; j < map.rows - 1; j++) {
               map.planets[i][map.rows -1 -j].type =        map.planets[i][map.rows -1 -j -1].type;
               map.planets[i][map.rows -1 -j].checked =     map.planets[i][map.rows -1 -j -1].checked;
               map.planets[i][map.rows -1 -j].assigned =    map.planets[i][map.rows -1 -j -1].assigned;
               map.planets[i][map.rows -1 -j].removed =     map.planets[i][map.rows -1 -j -1].removed;
            }
        }

        for (var i = 0; i < map.columns; i++) {
            map.planets[i][0].type = random(1, 6);
        }
    }

    // returns with the group of planets
    // tha group type is depends on tha match value (true = same, false = different planets allowed)
    function find_group(x, y, match) {
        var planet = map.planets[x][y];
        working_array = [planet];
        planet.checked = true;

        var temp_group = [];

        while(working_array.length > 0) {
            var current_planet = working_array.pop();

            // skip the empty places
            if(current_planet.type == -1) {
                continue;
            }

            // skip the removed or assigned places
            if(current_planet.removed || current_planet.assigned) {
                continue;
            }


            if(!match || (current_planet.type == planet.type)) {
                // addthe current planet to the temp_group
                temp_group.push(current_planet);

                // calculate the current planet matrix position
                var position = get_planet_matrix_position(current_planet.x, current_planet.y);

                // get the neighbours of the current planet
                var neighbours = get_planet_neighbours(position.x, position.y);

                for (var i = neighbours.length - 1; i >= 0; i--) {
                    if(!neighbours[i].checked) {
                        // add the neighbour to the working array
                        working_array.push(neighbours[i]);
                        neighbours[i].checked = true;
                    }
                }
            }
        }

        // return the temp_group of planets
        return temp_group;
    }

    // return with an array which is contains one or more floating planet groups
    function find_floating_group() {
        var inner_groups = [];

        // check every planet in the map
        for (var j = 0; j < map.rows; j++) {
            for (var i = 0; i < map.columns; i++) {
                var planet = map.planets[i][j];
                if(planet.type != -1 && !planet.checked) {
                    var iGroup = find_group(i, j, false);

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
                        inner_groups.push(iGroup);
                    }
                }
            }
        }
        
        return inner_groups;
    }

    // assign the global group items to remove
    function remove_group() {
        // Enable the remove animation
        remove_animation = true;

        // refresh the score
        set_stat(stat_types.score, gamer.score + map.single_score * group.length);

        // refresh tha available planets
        gamer.available_planets -= group.length;

        // set every planet as assigned to remove
        for (var i = group.length - 1; i >= 0; i--) {
            group[i].assigned = true;
        }

        reset_checked_planets();

        // play explosion sound effect
        effects.explosion.play();
    }

    // assign the global group floating arrays to remove
    function remove_floating_group() {
        // Enable the remove animation
        remove_animation = true;

        // refresh the score
        set_stat(stat_types.score, gamer.score + map.floating_score * group.length);

        for (var i = group.length - 1; i >= 0; i--) {
            // refresh the available planets
            gamer.available_planets -= group[i].length;
            // set every planet in the inner array as assigned
            for (var j = group[i].length - 1; j >= 0; j--) {
                group[i][j].assigned = true;
            }
        }

        reset_checked_planets();

        // play explosion sound effect
        effects.explosion.play();
    }

    // fire a planet
    function fire() {
        if(processing) {
            gamer.planet.x += gamer.planet.speed * Math.cos(deg_to_rad(gamer.planet.angle));
            gamer.planet.y += gamer.planet.speed * -1 * Math.sin(deg_to_rad(gamer.planet.angle));

            if(gamer.planet.x <= map.x) {
                // play the hit effect
                effects.hit.play();

                // left side
                gamer.planet.angle = 180 - gamer.planet.angle;
                gamer.planet.x = map.x;
            } else if(gamer.planet.x + map.planet_w >= map.x + map.width) {
                // play the hit effect
                effects.hit.play();

                // right side
                gamer.planet.angle = 180 - gamer.planet.angle;
                gamer.planet.x = map.x + map.width - map.planet_w;
            }

            // top
            if(gamer.planet.y <= map.y) {
                // play the hit effect
                effects.hit.play();

                gamer.planet.y = map.y;
                put_chains();
            }

            // detect other planets
            for(var i = 0; i < map.columns; i++) {
                for(var j = 0; j < map.rows; j++) {
                    var b = map.planets[i][j];
                    // ignore the removed or empty or assigned for remove planets space
                    if(b.type == -1 || b.removed || b.assigned) {
                        continue;
                    }

                    var position = get_planet_real_position(i,j);
                    if(is_collide(gamer.planet.x + map.planet_w / 2,
                                 gamer.planet.y + map.planet_h / 2,
                                 map.planet_r - 3,
                                 position.x + map.planet_w / 2,
                                 position.y + map.planet_h / 2,
                                 map.planet_r - 3)) {
                        put_chains();
                    }
                }
            }
        }
    }

    // Fix a planet position
    function put_chains() {
        processing = false;
        // get the planet's current center position
        var cx = gamer.planet.x + map.planet_w / 2;
        var cy = gamer.planet.y + map.planet_h / 2;
        var position = get_planet_matrix_position(cx, cy);
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

        // Add the new planet to teh available planets
        gamer.available_planets++;

        var realPosition = get_planet_real_position(position.x, position.y);
        map.planets[position.x][position.y].x =         realPosition.x;
        map.planets[position.x][position.y].y =         realPosition.y;
        map.planets[position.x][position.y].type =      gamer.planet.type;
        map.planets[position.x][position.y].assigned =  false;
        map.planets[position.x][position.y].removed =   false;
        map.planets[position.x][position.y].checked =   false;

        // play the hit effect
        effects.hit.play();

        paladin(map.planets[position.x][position.y]);

        set_stat(stat_types.shoots, gamer.shoots - 1);
        if(gamer.shoots <= 0) {
            set_game_status(status.fail);
        }

        // get the next planet
        load_next_planet();
    }

    // Collects the groups and the floating groups and remove them.
    // Sets the score and the next planet.
    function paladin(planet) {
        position = get_planet_matrix_position(planet.x, planet.y);

        // special effect (sun)
        if(planet.type == planet_types.sun) {
            // always remove the sun planet
            planet.assigned = true;
            planet.checked = true;
            gamer.available_planets--;

            group = get_planet_neighbours(position.x, position.y);
        } else {
            // try to find the same type of planets
            group = find_group(position.x, position.y, true);
        }

        // check the working_array length for remove or the sun is coming
        if(group.length >= 3 || planet.type == planet_types.sun) {
            // set 0 to the missedGroup
            gamer.missed_groups = 0;
            // remove the group from the map
            remove_group();
            // search and remove the floating groups
            group = find_floating_group();
            if(group.length > 0) {
                remove_floating_group();
            } else {
                reset_checked_planets();
            }
        } else {
            // level 5 or higher
            if(hardmode) {
                gamer.missed_groups++;
                if(gamer.missed_groups >= 5) {
                    gamer.missed_groups = 0;
                    insert_new_planet_row();
                }
            }
            reset_checked_planets();
        }

        // check for illegal planets
        setTimeout(function(){
            bottom_border_check();
        }, 300);

        // check for available planets
        // if there is no planet on the map, the gamer won this round
        if(gamer.available_planets <= 0) {
            set_game_status(status.done);
        }
    }

    // check the 
    function bottom_border_check() {
        for (var i = 0; i < map.columns; i++) {
            if(map.planets[i][map.rows - 1].type != planet_types.none) {
                set_game_status(status.fail);
                break;
            }
        }
    }

    // Get a random int between low and high arguments
    function random(low, high) {
        return Math.floor(low + Math.random() * (high - low + 1));
    }

    // Convert radians to degrees
    function rad_to_deg(angle) {
        return angle * (180 / Math.PI);
    }
    
    // Convert degrees to radians
    function deg_to_rad(angle) {
        return angle * (Math.PI / 180);
    }

    // "timer" helper
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

    init();
});
