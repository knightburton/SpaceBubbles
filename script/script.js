$(function() {
	// Canvas and context
	var canvas = document.getElementById("game");	// get the canvas
	var context = canvas.getContext("2d");			// init the context

	// Map
	var map = {
		x: 0,			// x position
		y: 0,			// y position
		width: 0,		// width
		height: 0,		// height
		columns: 10,	// number of columns
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
		type: 0,			// gamer type
		bubble: {			// actual bubble info
			x: 0,			// bubble x position
			y: 0,			// bubble y position
			angle: 0,		// bubble and mouse angle
			speed: 1000,	// bubble move speed
			type: 0			// bubble type
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

	// Bubble images
	var b_images = [];
	// Hearth image
	var h_image = null;
	// Ufo image
	var u_image = null;

	// Initialize
	function init() {
		// subscribe to mouse events
		canvas.addEventListener('mousemove', canvasMouseMove);
		canvas.addEventListener('click', canvasClick);


		// init the bubbles array
		for(var i = 0; i < map.columns; i++) {
			map.bubbles[i] = [];
			for(var j = 0; j < map.rows; j++) {
				map.bubbles[i][j] = new Bubble(i,j, random(1,4));
			}
		}

		// Init tha map
		map.width = map.columns * map.bubble_w + map.bubble_w/2;
		map.height = (map.rows - 1) * map.bubble_h + map.bubble_h/2;

		// Init the gamer
		gamer.x = map.x + map.width/2 - map.bubble_w/2;
		gamer.y = map.y + map.height;
		gamer.angle = 90;
		gamer.type = 0;
		gamer.next.x = gamer.x + 4 * map.bubble_w;
		gamer.next.y = gamer.y;

		// Init and Refresh the hearths for the nice look
		initLivesImg();
		refreshLives(gamer.lives);

		newGame();

		// Call the main loop function
		loop();
	}

	// Load the bubble images
	function loadBubbleImages() {
		var images = [];
		for(var i = 0; i < 5 ; i++) {
			var image = new Image();
			image.src = 'assets/img/' + i + '.png';
			images[i] = image;
		}
		return images;
	}

	// Load the hearth image
	function loadHeartImage() {
		var hearth = new Image();
		hearth.src = 'assets/img/hearth.png';
		return hearth;
	}

	// Load the UFO image
	function loadUFOImage() {
		var hearth = new Image();
		hearth.src = 'assets/img/ufo.png';
		return hearth;
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
		refreshlevel(gamer.level);
		calculateTime();
	}

	// The main event loop function
	function loop() {
		console.log("loop: Not implemented yet!");
	}

	// Mouse movement in the canavs
	function canvasMouseMove() {
		console.log("canvasMouseMove: Not implemented yet!");
	}

	// Click in the canvas
	function canvasClick() {
		console.log("canvasClick: Not implemented yet!");
	}

	// Get a random int between low and high
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
	function refreshlevel(level) {
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

	init();
});