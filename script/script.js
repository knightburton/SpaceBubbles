$(function() {
	// Canvas and context
	var canvas = document.getElementById("game");	// get the canvas
	var context = canvas.getContext("2d");			// init the context
	var canvas_next = document.getElementById("next");	// get the next canvas
	var context_next = canvas_next.getContext("2d");			// init the next context

	// Map
	var map = {
		x: 0,			// x position
		y: 0,			// y position
		width: 0,		// width
		height: 0,		// height
		columns: 9,		// number of columns
		rows: 12,		// number of rows
		downgrade: 3,	// numbers of free rows at the start
		bubble_w: 50,	// bubble image width
		bubble_h: 50,	// bubble image height
		bubble_r: 25,	// bubble radius from center
		bubble_s: 5,	// bubble split pixel
		bubbles: []		// 2D bubbles array
	};

	// Bubble class
	var Bubble = function(x, y, type, removed, same) {
		this.x = x;				// set the bubble x position
		this.y = y;				// set the bubble y position
		this.type = type;		// set the bubble type
		this.removed = removed;	// set the bubble removed option
		this.same = same;		// set the bubble same option
	}

	// Gamre
	var gamer = {
		x: 0,				// gamer x position
		x: 0,				// gamer y position
		angle: 0,			// gamer and mouse angle
		bubble: {			// actual bubble info
			x: 0,			// bubble x position
			y: 0,			// bubble y position
			angle: 0,		// bubble and mouse angle
			speed: 10,		// bubble move speed
			type: -1		// bubble type
		},
		next: {				// the next bubble info
			x: 0,			// next bubble x position
			y: 0,			// next bubble y position
			type: 0			// next bubble type
		},
		lives: 3,			// actual lives
		max_lives: 3,		// maximum lives
		score: 0,			// actual score,
		level: 0,			// actual level
		timer: {
			minute: 0,		// actual timer minute
			second: 0,		// actual timer second
			interval: null	// timer interval
		}
	};

	// The music object
	var music = {
		mute: false,
		dom: null
	};

	// The effects object
	var effects = {
		mute: false,
		shoot: null,
		explosion: null,
		hit: null
	};

	// Zones enum
	var zone = {
		list: [
			'game-zone',
			'welcome-zone',
			'pause-zone',
			'high-scores-zone',
			'about-zone'
		],
		game: 0,
		welcome: 1,
		pause: 2,
		highscores: 3,
		about: 4
	};

	// Bubbles images
	var bubbles_image = null;
	// Boolean for check tha bubbles image load.
	var loaded = false;
	// Boolean for mooving bubbles.
	var processing = false;

	var counter = 0;

	// Initialize
	function init() {
		// set the zone
		selectZone(zone.welcome);

		// Init the background music
		initBackgroundMusic();
		// Init the effects
		initEffects();

		// subscribe to mouse events
		canvas.addEventListener('mousemove', canvasMouseMove);
		canvas.addEventListener('click', canvasClick);

		// subscribe to menu clicks
		$('#new-game-button').on('click', function() {
			selectZone(zone.game);
			newGame();
		});
		$('#pause-button').on('click', function() {
			selectZone(zone.pause);
			//TODO: implement the pasue toggle swith function
		});
		$('#high-scores-button').on('click', function() {
			selectZone(zone.highscores);
		});
		$('#about-button').on('click', function() {
			selectZone(zone.about);
		});
		$('#music-button').on('click', toggleMusicMute);
		$('#effects-button').on('click', toggleEffectsMute);


		// init the bubbles array
		for(var i = 0; i < map.columns; i++) {
			map.bubbles[i] = [];
			for(var j = 0; j < map.rows; j++) {
				map.bubbles[i][j] = new Bubble(i,j, -1, false, false);
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

		// Init and Refresh the hearths
		initLivesImg();
		refreshLives(gamer.lives);

		// Init the bubbles_image
		loadBubbleImages();
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

	// Init and start the background music
	function initBackgroundMusic() {
		music.dom = document.createElement('AUDIO');
		music.dom.src = 'assets/sound/Most_awesome_8-bit_song_ever.mp3';
		music.dom.loop = true;
		music.dom.play();
		music.dom.volume = 0.7;
	}

	// Mute and unmute the background music
	function toggleMusicMute() {
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
	function toggleEffectsMute() {
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

	// Load the bubbles image
	function loadBubbleImages() {
		bubbles_image = new Image();
		bubbles_image.src = 'assets/img/bubbles.png';
		bubbles_image.onload = function() {
			loaded = true;
		};
	}

	// New game
	function newGame() {
		// reset the stats
		gamer.lives = 3;
		gamer.score = 0;
		gamer.level = 1;
		gamer.timer.minute = 0;
		gamer.timer.second = 0;
		gamer.timer.interval = null;

		// refresh the stats display
		refreshLives(gamer.lives);
		refreshScore(gamer.score);
		refreshLevel(gamer.level);
		calculateTime();

		// Create a new map
		createMap();

		// Init the next and set the gamer bubble
		nextBubble();
		nextBubble();

		loop();
	}

	// The main event loop function
	function loop() {
		// Animation fram for this function
		window.requestAnimationFrame(loop);

		if(loaded) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			renderBubbles();
			renderGamer();
			renderNext();
		}

		if(processing) {
			shoot();
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

	// Refresh the lives display
	function refreshLives(lives) {
		var i = gamer.max_lives;
		while (i > lives) {
			$('#' + i + '_live').css('display', 'none');
			i--;
		}
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
		if(gamer.timer.second > 59) {
			gamer.timer.minute++;
			gamer.timer.second = 0;
		}
		if(gamer.timer.second > 59 && gamer.timer.minute > 59) {
			clearInterval(gamer.timer.interval);
		}
		refreshTimeDisplay(gamer.timer.minute, gamer.timer.second);
		gamer.timer.second++;
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

	// Create a new random filled map
	function createMap() {
		for(var j = 0; j < map.rows - map.downgrade; j++) {
			var randomBubble = random(1,4);
			var counter = 0;
			for(var i = 0; i < map.columns; i++) {
				if(counter > 2) {
					var newRandomBubble = random(1,4);
					if(newRandomBubble == randomBubble) {
						newRandomBubble = (newRandomBubble + 1) % 4;
					}
					randomBubble = newRandomBubble;
					counter = 0;
				}
				counter++;
				map.bubbles[i][j].type = randomBubble;
			}
		}
	}

	// Init the next bubbles
	function nextBubble() {
		gamer.bubble.type = gamer.next.type;
		gamer.bubble.x = gamer.x;
		gamer.bubble.y = gamer.y;

		var nextBubbleType = random(0,4);

		gamer.next.type = nextBubbleType;
	}

	// Render the bubbles
	function renderBubbles() {
		for(var j = 0; j < map.rows; j++) {
			for(var i = 0; i < map.columns; i++) {
				var bubble = map.bubbles[i][j];

				// skip the removed bubbles
				if(!bubble.removed) {
					// get the current bubble position
					var position = getBubblePosition(i, j);
					map.bubbles[i][j].x = position.x;
					map.bubbles[i][j].y = position.y;
					var crop = getBubbleCrop(map.bubbles[i][j].type);
					context.drawImage(bubbles_image, crop, 0, map.bubble_w, map.bubble_h, position.x, position.y, map.bubble_w, map.bubble_h);
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
		context.drawImage(bubbles_image, crop, 0, map.bubble_w, map.bubble_h, gamer.bubble.x, gamer.bubble.y, map.bubble_w, map.bubble_h);
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

	// Returns the bubble position
	function getBubblePosition(column, row) {
		var x = map.x + column * map.bubble_w;
		
		if((row + 1) % 2) {
			x += map.bubble_w / 2;
		}

		var y = map.y + row * (map.bubble_h - map.bubble_s);
		return {x: x, y: y};
	}

	// Return the matrix current position
	function getMatrixPosition(x, y) {
		var my = Math.floor((y - map.y) / (map.bubble_h - map.bubble_s));

		var xoffset = 0;
		if((my + 1) % 2) {
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

	// Find the same bubbles
	function findSame(x, y) {
		var c = 0;
		map.bubbles[x][y].same = true;
		for(var i = 0; i < map.columns; i++) {
			for(var j = 0; j < map.rows; j++) {
				if(i == x - 1 && j == y - 1) {
					c += checkType(x, y, x - 1, y - 1);
				}
				if(i == x && j == y - 1) {
					c += checkType(x, y, x, y - 1);
				}
				if(i == x + 1 && j == y - 1) {
					c += checkType(x, y, x + 1, y - 1);
				}

				if(i == x - 1 && j == y) {
					c += checkType(x, y, x - 1, y);
				}
				if(i == x + 1 && j == y) {
					c += checkType(x, y, x + 1, y);
				}

				if(i == x - 1 && j == y + 1) {
					c += checkType(x, y, x - 1, y + 1);
				}
				if(i == x && j == y + 1) {
					c += checkType(x, y, x, y + 1);
				}
				if(i == x + 1 && j == y + 1) {
					c += checkType(x, y, x + 1, y + 1);
				}
			}
		}
		counter += c;
	}

	//Remove tha same found bubbles
	function removeSame() {
		for(var i = 0; i < map.columns; i++) {
			for(var j = 0; j < map.rows; j++) {
				if(map.bubbles[i][j].same) {
					map.bubbles[i][j].removed = true;
					map.bubbles[i][j].same = false;
					map.bubbles[i][j].type = -1;
				}
			}
		}

		// play explosion effect
		effects.explosion.play();
	}

	// Reset the same bubbles
	function resetSame() {
		for(var i = 0; i < map.columns; i++) {
			for(var j = 0; j < map.rows; j++) {
				if(map.bubbles[i][j].same) {
					map.bubbles[i][j].same = false;
				}
			}
		}
	}

	// Check two bubbles type
	function checkType(x1, y1, x2, y2) {
		if(!map.bubbles[x2][y2].same
		   && map.bubbles[x2][y2].type == map.bubbles[x1][y1].type
		   && isCollide(map.bubbles[x1][y1].x,
		   				map.bubbles[x1][y1].y,
		   				map.bubble_r + 2,
		   				map.bubbles[x2][y2].x,
		   				map.bubbles[x2][y2].y,
		   				map.bubble_r + 2)) {
			map.bubbles[x2][y2].same = true;
			findSame(x2,y2);
			return 1;
		}
		return 0;
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

	// Render the aiming line for the user
	function renderAimLine() {
		var c = {
			x: gamer.x + map.bubble_w / 2,
			y: gamer.y + map.bubble_h / 2
		};
		context.lineWidth = 3;
		context.strokeStyle = '#00ff00';
		context.beginPath();
		context.moveTo(c.x, c.y);
		context.lineTo(c.x + 2 * map.bubble_w * Math.cos(deg2Rad(gamer.angle)), c.y -  2 * map.bubble_h * Math.sin(deg2Rad(gamer.angle)));
		context.stroke();
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
					// ignore the removed or empty bubbles space
					if(b.type == -1 || b.removed) {
						continue;
					}

					var position = getBubblePosition(i,j);
					if(isCollide(gamer.bubble.x + map.bubble_w / 2,
								 gamer.bubble.y + map.bubble_h / 2,
								 map.bubble_r,
								 position.x + map.bubble_w / 2,
								 position.y + map.bubble_h / 2,
								 map.bubble_r)) {
						putChains();
						return;
					}
				}
			}
		}
	}

	// Fix the shot bubble
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

		map.bubbles[position.x][position.y].type = gamer.bubble.type;
		map.bubbles[position.x][position.y].removed = false;
		map.bubbles[position.x][position.y].same = false;
		// play the hit effect
		effects.hit.play();

		//TODO: check game over

		// find the same bubbles
		findSame(position.x, position.y, map.bubbles[position.x][position.y].type);

		// remove same
		if(counter + 1 >= 3) {
			// wait for the sound effevt
			setTimeout(removeSame, 400);
		} else {
			//reset the same options
			resetSame();
		}
		counter = 0;

		// get the next bubble
		nextBubble();
	}

	init();
});
