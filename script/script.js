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
		thys.type = type;		// set the bubble type
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
		score: 0,			// actual score
		min: 0,				// actual min
		sec: 0,				// actual sec
		level: 0			// actual level
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
		canvas.on('mousemove', canvasMouseMove);
		canvas.on('click', canvasClick);

		// init the bubbles array
		for(var i = 0; i < map.columns; i++) {
			map.bubbles[i] = [];
			for(var j = 0; j < map.rows; i++) {
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

		// Call the new game function
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
	function newgame() {
		// reset the stats
		gamer.lives = 3;
		gamer.score = 0;
		gamer.min = 0;
		gamer.sec = 0;
		gamer.level = 0;

	}

	// The main event loop function
	function loop() {
		window.alert("Not implemented yet!");
	}

	// Mouse movement in the canavs
	function canvasMouseMove() {
		window.alert("Not implemented yet!");
	}

	// Click in the canvas
	function canvasClick() {
		window.alert("Not implemented yet!");
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
});