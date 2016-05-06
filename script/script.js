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
		columns: 9,	// number of columns
		rows: 10,		// number of rows
		bubble_w: 50,	// bubble image width
		bubble_h: 50,	// bubble image height
		r: 25,			// bubble radius from center
		bubbles: []		// 2D bubbles array
	};

	// Bubble class
	var Bubble = function(x, y, type) {
		this.x = x;				// set the bubble x position
		this.y = y;				// set the bubble y position
		this.type = type;		// set the bubble type
		this.removed = false;	// set the bubble removed option
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
			speed: 1000,	// bubble move speed
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

	// The background music object
	var music = null;
	var music_mute = false;

	// Bubbles images
	var bubbles_image = null;
	// Boolean for check tha bubbles image load.
	var loaded = false;

	// Initialize
	function init() {
		// Init the background music
		initBackgroundMusic();

		// subscribe to mouse events
		canvas.addEventListener('mousemove', canvasMouseMove);
		canvas.addEventListener('click', canvasClick);

		// subscribe to menu clicks
		$('#new-game-button').on('click', newGame);
		$('#mute-button').on('click', toggleMusicMute);


		// init the bubbles array
		for(var i = 0; i < map.columns; i++) {
			map.bubbles[i] = [];
			for(var j = 0; j < map.rows; j++) {
				map.bubbles[i][j] = new Bubble(i,j, -1);
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

		// new game
		newGame();

		// Call the main loop function
		loop();
	}

	// Init and start the background music
	function initBackgroundMusic() {
		music = document.createElement('AUDIO');
		music.src = 'assets/sound/Most_awesome_8-bit_song_ever.mp3';
		music.loop = true;
		music.play();
		music.volume = 0.7;
	}

	// Mute and unmute the background music
	function toggleMusicMute() {
		if(music_mute) {
			music_mute = false;
			music.muted = false;
			refreshMuteMenuItem(false);
		} else {
			music_mute = true;
			music.muted = true;
			refreshMuteMenuItem(true);
		}
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
		console.log("canvasClick: Not implemented yet!");
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

	// Refresh the mute menu item
	function refreshMuteMenuItem(muted) {
		if(muted) {
			$('#mute-button').text('Music OFF');
		} else {
			$('#mute-button').text('Music ON');
		}
	}

	// Create a new random filled map
	function createMap() {
		for(var j = 0; j < map.rows; j++) {
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

				// get the current bubble position
				var position = getBubblePosition(i, j);
				map.bubbles[i][j].x = position.x;
				map.bubbles[i][j].y = position.y;
				var crop = getBubbleCrop(map.bubbles[i][j].type);
				context.drawImage(bubbles_image, crop, 0, map.bubble_w, map.bubble_h, position.x, position.y, map.bubble_w, map.bubble_h);
			}
		}
	}

	// Render the gamer's bubble
	function renderGamer() {
		renderAimLine();

		gamer.bubble.x = gamer.x;
		gamer.bubble.y = gamer.y;
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

	// Return the bubble position
	function getBubblePosition(column, row) {
		var x = map.x + column * map.bubble_w;
		
		if((row + 1) % 2) {
			x += map.bubble_w / 2;
		}

		var y = map.y + row * (map.bubble_h - 5);
		return {x: x, y: y};
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

	init();
});
