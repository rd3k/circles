window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var game = {};

/**
 * game.Colour
 **/
game.Colour = {};
game.Colour[game.Colour['0'] = 'White']   = 0;
game.Colour[game.Colour['1'] = 'Black']   = 1;
game.Colour[game.Colour['2'] = 'Red']     = 2;
game.Colour[game.Colour['3'] = 'Green']   = 3;
game.Colour[game.Colour['4'] = 'Blue']    = 4;
game.Colour[game.Colour['5'] = 'Yellow']  = 5;
game.Colour[game.Colour['6'] = 'Grey']    = 6;
game.Colour[game.Colour['7'] = 'Magenta'] = 7;
game.Colour[game.Colour['8'] = 'Maroon']  = 8;

game.GameType = {};
game.GameType[game.GameType['0'] = 'Time']    = 0;
game.GameType[game.GameType['1'] = 'Moves']   = 1;
game.GameType[game.GameType['2'] = 'Forever'] = 2;

game.PlayMode = {};
game.PlayMode[game.PlayMode['0'] = 'Dots']   = 0;
game.PlayMode[game.PlayMode['1'] = 'Jewels'] = 1;

game.MoveStage = {};
game.MoveStage[game.MoveStage['0'] = 'AfterTrace']    = 0;
game.MoveStage[game.MoveStage['1'] = 'AfterHitWhite'] = 1;
game.MoveStage[game.MoveStage['2'] = 'AfterPoints']   = 2;
game.MoveStage[game.MoveStage['3'] = 'AfterSwap']     = 3;

game.move = {
	loop: false,
	hitCircles: [],
	colour: null,
	trace: [],
	lastX: null,
	lastY: null,
	trackingShape: false,
	canSwap: function () {
		return game.stats.score >= game.config.POINTSFORSWAP;
	},
	getHitShape: function () {
		var i, l = game.move.hitCircles.length, hc, prev = new game.Point(), xDist = 0, yDist = 0, xChain = [], yChain = [];
		if (l > 0) {
			prev = game.move.hitCircles[0].location.clone();
			for (i = 1; i < l; i++) {
				hc = game.move.hitCircles[i];
				xDist += (hc.location.x - prev.x) * i * 5;
				yDist += (hc.location.y - prev.y) * i * 7;
				xChain.push(xDist);
				yChain.push(yDist);
				prev.x = hc.location.x;
				prev.y = hc.location.y;
			}
		}
		return {
			x: xDist,
			y: yDist,
			xChain: xChain,
			yChain: yChain
		}
	}
}

game.running = false;

game.mode = game.PlayMode.Dots;
game.type = game.GameType.Forever;

game.state = {
	time: Infinity,
	moves: Infinity,
	startTime: 0,
	elapsedTime: 0
};

game.dom = {
	score: document.querySelector('#score'),
	draws: document.querySelector('#draws'),
	swaps: document.querySelector('#swaps'),
	totalAch: document.querySelector('#totalachievements'),
	gotAch: document.querySelector('#gotachievements'),
	playCanvas: document.querySelector('#game'),
	playContext: null,
	animationToggle: document.querySelector('#animation'),
	soundToggle: document.querySelector('#sound'),
	dotSizer: document.querySelector('#dotsizer'),
	dotSizeDot: document.querySelector('#dotsizedot'),
	play60secs: document.querySelector('#play60secs'),
	play30moves: document.querySelector('#play30moves'), 
	updateDotSizer: function () {
		game.dom.dotSizeDot.style.width = (game.config.DOTSIZE * 2) + 'px';
		game.dom.dotSizeDot.style.height = (game.config.DOTSIZE * 2) + 'px';
		game.dom.dotSizeDot.style.marginTop = (14 - (game.config.DOTSIZE)) + (game.config.DOTSIZE / 2) + 'px';
	},
	addEvents: function () {
		game.dom.dotSizer.addEventListener('change', function (e) {
			game.config.DOTSIZE = parseInt(e.target.value);
			game.dom.updateDotSizer();
		});
		game.dom.animationToggle.addEventListener('change', function (e) {
			game.config.ANIMATE = e.target.checked;
		});
		game.dom.soundToggle.addEventListener('change', function (e) {
			game.audio.muted = e.target.checked;
		});
		document.addEventListener('click', game.controls.documentClick);
		document.addEventListener('keydown', game.controls.documentKeyDown);
		document.addEventListener('keyup', game.controls.documentKeyUp);
		game.dom.playCanvas.addEventListener('mousedown', game.controls.playCanvasMouseDown);
		game.dom.playCanvas.addEventListener('mouseup', game.controls.playCanvasMouseUp);
		game.dom.playCanvas.addEventListener('mousemove', game.controls.playCanvasMouseMove);
		// TODO: Make touch actually work
		game.dom.playCanvas.addEventListener('touchstart', game.controls.playCanvasTouchStart, false);
		game.dom.playCanvas.addEventListener('touchend', game.controls.playCanvasTouchEnd, false);
		game.dom.playCanvas.addEventListener('touchmove', game.controls.playCanvasTouchMove, false);

	},
	showStart: function () {
		document.body.className = 'start';
	},
	showAbout: function () {
		document.body.className = 'about';
	},
	showAchievements: function () {
		document.body.className = 'achievements';
	},
	showSettings: function () {
		document.body.className = 'settings';
		game.dom.animationToggle.checked = game.config.ANIMATE;
		game.dom.soundToggle.checked = game.audio.muted;
		game.dom.updateDotSizer();
	},
	showStore: function () {
		document.body.className = 'play store';
		game.running = false;
	},
	hideStore: function () {
		document.body.className = 'play';
		game.running = true;
	},
	showPreGame: function () {
		document.body.className = 'pregame';
	},
	showPlay: function () {
		document.body.className = 'play';
		game.running = true;
		initStage();
		initCircles();
		requestAnimationFrame(game.step);
	}
}

game.over = function () {
	console.log('Game over');
	game.running = false;
}

game.config = {
	COLS: 6,
	ROWS: 6,
	WESTGAP: 30,
	NORTHGAP: 30,
	GRIDSIZE: 30,
	BACKGROUND: game.Colour.White,
	POINTSFORSWAP: 20,
	LOOPPOINTS: 5,
	XYONLY: true,
	DOTSIZE: 8,
	ANIMATE: false
};

game.stats = {
	score: 0,
	draws: 0,
	loops: 0,
	swaps: 0,
	northSwaps: 0,
	southSwaps: 0,
	westSwaps: 0,
	eastSwaps: 0
};

game.audio = {
	context: null,
	osc: null,
	muted: false,
	init: function () {
		try {
			this.context = new webkitAudioContext();
			this.osc = this.context.createOscillator();
		    this.osc.type = this.osc.TRIANGLE;
		    this.osc.connect(this.context.destination);
		    this.osc.noteOn(0);
		    this.osc.frequency.value = 0;
		}
		catch (e) {}
	},
	play: function (sound) {
		if (this.osc === null || this.muted) {
			return;
		}
		switch (sound) {
			case 'gotOne': {
				this.osc.frequency.value = 500;
				break;		
			}
			case 'gotTwo': {
				this.osc.frequency.value = 1500;
				break;
			}
			case 'gotThree': {
				this.osc.frequency.value = 2500;
				break;
			}
			case 'gotFour': {
				this.osc.frequency.value = 3500;
				break;
			}
			case 'gotFive': {
				this.osc.frequency.value = 4500;
				break;
			}
		}
		setTimeout(function () {
			game.audio.osc.frequency.value = 0;
		}, 100);
	}
};

game.buyables = {
	list: [],
	getHtml: function () {
		return '';
	},
	Buyable: function (name, cost) {
		this.name = name;
		this.cost = cost;
		this.bought = 0;
	}	
};

game.achievements = {
	gotCount: 0,
	count: 0,
	toCheck: {
		AfterTrace: [],
		AfterHitWhite: [],
		AfterPoints: [],
		AfterSwap: []
	},
	register: function (achievement, checkWhen) {
		this.toCheck[game.MoveStage[checkWhen]].push(achievement);
		this.count++;
		return this;
	},
	getAll: function () {
		return this.toCheck.AfterTrace.concat(this.toCheck.AfterHitWhite, this.toCheck.AfterPoints, this.toCheck.AfterSwap);
	},
	check: function (when) {
		this.toCheck[game.MoveStage[when]].forEach(function(achievement){
			if (!achievement.got) {
				if (achievement.satisfied()) {
					achievement.achieve();
					achievement.got = true;
					game.achievements.gotCount++;
					game.achievements.notify(achievement);
				}
			}
		});
	},
	notify: function (achievement) {
		console.log('"' + achievement.name + '" unlocked!');
	},
	Achievement: function (name, description, need, achieve) {
		this.got = false;
		this.name = name;
		this.description = description;
		this.satisfied = need;
		this.achieve = achieve;
	}
};

game.play60secs = function () {
	console.log('play60secs');
	game.type = game.GameType.Time;
	game.state.timeLimit = 60;
	game.state.moves = Infinity;
	game.dom.showPlay();
}

game.play30moves = function () {
	console.log('play30moves');
	game.type = game.GameType.Moves;
	game.state.timeLimit = Infinity;
	game.state.moves = 30;
	game.dom.showPlay();
}

game.playForever = function () {
	console.log('playForever');
	game.type === game.GameType.Forever;
	game.state.timeLimit = Infinity;
	game.state.moves = Infinity;
	game.dom.showPlay();
}

game.controls = {
	documentClick: function (e) {
		var target = e.target.id;
		if (target === 'playButton') {
			game.dom.showPreGame();
		} else if (target === 'achieveButton') {
			game.dom.showAchievements();
		} else if (target === 'settingsButton') {
			game.dom.showSettings();
		} else if (target === 'about') {
			game.dom.showAbout();
		} else if (target === 'score') {
			game.dom.showStore();
		} else if (target === 'back') {
			game.dom.showStart();
		} else if (target === 'random') {
			console.log('random');
		} else if (target === 'fill') {
			console.log('fill');
		} else if (target === 'play60secs') {
			game.play60secs();
		} else if (target === 'play30moves') {
			game.play30moves();
		} else if (target === 'playForever') {
			game.playForever();
		}
	},
	documentKeyDown: function (e) {
		if (e.keyCode === 83 /*s*/) {
			game.move.trackingShape = true;
		} else if (e.keyCode === 27 && game.running) {
			// esc
			console.log('pause game');
		} else {
			console.log(e.keyCode);
		}
		if (game.controls.mouse.down || !game.move.canSwap()) {
			return;
		}
		if (e.shiftKey) {
			game.mode = game.PlayMode.Jewels;
		}
	},
	documentKeyUp: function (e) {
		if (!e.shiftKey) {
			game.mode = game.PlayMode.Dots;
		}
		if (e.keyCode === 83 /*s*/) {
			game.move.trackingShape = false;
		}
	},
	playCanvasMouseDown: function (e) {
		var x = e.offsetX, y = e.offsetY, x2, y2;
		game.controls.mouse.x = x;
		game.controls.mouse.y = y;
		game.controls.mouse.down = true;
		x = game.fn.snapToGrip(x, game.config.GRIDSIZE);
		y = game.fn.snapToGrip(y, game.config.GRIDSIZE);
		if (x !== null && y !== null) {
			x2 = (x - game.config.WESTGAP) / game.config.GRIDSIZE;
			y2 = (y - game.config.NORTHGAP) / game.config.GRIDSIZE;
			if (x2 >= 0 && x2 < game.config.COLS && y2 >= 0 && y2 < game.config.ROWS) {
				game.move.lastX = x2;
				game.move.lastY = y2;
				if (game.mode === game.PlayMode.Jewels) {
					game.move.hitCircles.push(game.circles[x2][y2]);
				} else {
					game.move.trace.push(new game.Point(x, y));
					game.move.hitCircles.push(game.circles[x2][y2]);
					game.move.colour = game.circles[x2][y2].colour;
				}
			}
		}
	},
	playCanvasMouseUp: function () {
		game.controls.mouse.down = false;
		if (game.move.trace.length > 1) {
			clearPoints();
			game.stats.draws++;
		}
		game.move.trace = [];
		game.move.hitCircles = [];
	},
	playCanvasMouseMove: function (e) {
		if (game.controls.mouse.down) {
			var x = e.offsetX, y = e.offsetY, x2, y2, x3, y3;
			game.controls.mouse.x = x;
			game.controls.mouse.y = y;
			x2 = game.fn.snapToGrip(x, game.config.GRIDSIZE);
			y2 = game.fn.snapToGrip(y, game.config.GRIDSIZE);
			if (x2 !== null && y2 !== null) {
				x3 = (x2 - game.config.WESTGAP) / game.config.GRIDSIZE;
				y3 = (y2 - game.config.NORTHGAP) / game.config.GRIDSIZE;
				if (x3 < 0 || x3 >= game.config.COLS || y3 < 0 || y3 >= game.config.ROWS) {
					return;
				}
				if (game.mode === game.PlayMode.Jewels) {
					playCanvasMouseMoveJewels(x3, y3);				
				} else if (game.mode === game.PlayMode.Dots) {
					playCanvasMouseMoveDots(x2, y2, x3, y3);
				}
			}
		}
	},
	playCanvasTouchStart: function (e) {
		if (e.touches.length === 1) { 
			var touch = e.touches[0];
			e.offsetX = touch.pageX - touch.target.offsetLeft;
			e.offsetY = touch.pageY - touch.target.offsetTop;
			game.controls.playCanvasMouseDown(e); 
		}
	},
	playCanvasTouchEnd: function () {
		game.controls.playCanvasMouseUp();
	},
	playCanvasTouchMove: function (e) {
		if (e.touches.length === 1) { 
			var touch = e.touches[0];
			e.offsetX = touch.pageX - touch.target.offsetLeft;
			e.offsetY = touch.pageY - touch.target.offsetTop;
			e.preventDefault();
			game.controls.playCanvasMouseMove(e);
		}
	},
	mouse: {
		x: 0,
		y: 0,
		down: false
	}
};

game.achievements
	.register(
		new game.achievements.Achievement('Loop', 'Get a loop!', function () {
			return game.stats.loops > 0;
		}, function () {
			console.log('Got a loop, yay!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Score of 10', 'Get a score of 10', function () {
			return game.stats.score >= 10;
		}, function () {
			console.log('Got a score of 10, yay!');
		}),
		game.MoveStage.AfterPoints
	)
	.register(
		new game.achievements.Achievement('Remove 4', 'Remove a line of 4', function () {
			return game.move.hitCircles.length > 3;
		}, function () {
			console.log('Got a line of 4, yay!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Clear row', 'Clear a full row', function () {
			for (var y = 0; y < game.config.ROWS; y++) {
				if (game.circles[0][y].colour === game.Colour.White) {
					for (var x = 1; x < game.config.COLS - 1; x++) {
						if (game.circles[x][y].colour !== game.Colour.White) {
							return false;
						}
					}
					if (game.circles[game.config.COLS - 1][y].colour === game.Colour.White) {
						return true;
					}
				}
			}
			return false;
		}, function () {
			console.log('You cleared a whole row!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Clear column', 'Clear a full column', function () {
			for (var x = 0; x < game.config.COLS; x++) {
				if (game.circles[x][0].colour === game.Colour.White) {
					for (var y = 1; y < game.config.ROWS - 1; y++) {
						if (game.circles[x][y].colour !== game.Colour.White) {
							return false;
						}
					}
					if (game.circles[x][game.config.ROWS - 1].colour === game.Colour.White) {
						return true;
					}
				}
			}
			return false;
		}, function () {
			console.log('You cleared a whole column!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full height', 'Draw a line spanning the full height', function () {
			if (game.move.hitCircles.length < 2) {
				return false;
			}
			var x, need = 2;
			for (x = 0; x < game.config.COLS; x++) {
				if (game.circles[x][0].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			for (x = 0; x < game.config.COLS; x++) {
				if (game.circles[x][game.config.ROWS - 1].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			return need == 0;
		}, function () {
			console.log('You drew a line spanning the full height!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full width', 'Draw a line spanning the full width', function () {
			if (game.move.hitCircles.length < 2) {
				return false;
			}
			var y, need = 2;
			for (y = 0; y < game.config.ROWS; y++) {
				if (game.circles[0][y].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			for (y = 0; y < game.config.ROWS; y++) {
				if (game.circles[game.config.COLS - 1][y].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			return need == 0;
		}, function () {
			console.log('You drew a line spanning the full width!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full loop', 'Draw a loop around the perimeter', function () {
			return (game.circles[0][0].colour === game.Colour.White) &&
					(game.circles[0][game.config.ROWS - 1].colour === game.Colour.White) &&
					(game.circles[game.config.COLS - 1][game.config.ROWS - 1].colour === game.Colour.White) &&
					(game.circles[game.config.COLS - 1][0].colour === game.Colour.White)
		}, function () {
			console.log('You drew a loop around the perimeter!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('5 red', 'Get a line of exactly 5 red', function () {
			if (game.move.hitCircles.length != 5) {
				return false;
			}
			for (var i = 0, l = game.move.hitCircles.length; i < l; i++) {
				if (game.move.hitCircles[i].colour !== game.Colour.Red) {
					return false;
				}
			}
			return true;
		}, function () {
			console.log('You got exactly 5 red!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Surrounded', 'Surround a dot with a loop', function () {
			if (game.move.hitCircles.length !== 9) {
				return false;
			}
			var valid = [
				'-40,-56', // clockwise from top left, anti from top left
				'40,-56',  // clockwise from top right, anti from top right
				'40,56',   // clockwise from bottom right, anti from bottom right
				'-40,56',  // clockwise from bottom left, anti from bottom left
				'0,-56',   // clockwise from top middle, anti from top middle
				'40,0',    // clockwise from right middle, anti from right middle
				'0,56',    // clockwise from bottom middle, anti from bottom middle
				'-40,0'    // clockwise from left middle, anti from left middle
			];
			var dist = game.move.getHitShape();
			console.log(dist);
			return valid.indexOf([dist.x, dist.y].toString()) !== -1;
		}, function () {
			console.log('You surrounded a dot with a loop!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Table', 'Draw a red table', function () {
			if (game.move.colour !== game.Colour.Red) {
				return false;
			}
			var valid = ['25,21', '-25,21'];
			var dist = game.move.getHitShape();
			return valid.indexOf([dist.x, dist.y].toString()) !== -1;
		}, function () {
			console.log('You drew a red table!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(	
		new game.achievements.Achievement('Swap', 'Perform a swap', function () {
			return game.stats.swaps > 0;
		}, function () {
			console.log('You performed a swap!');
		}),
		game.MoveStage.AfterSwap
	)
	.register(
		new game.achievements.Achievement('All swaps', 'Perform a swap up, down, left and right', function () {
			return game.stats.northSwaps > 0 && 
					game.stats.southSwaps > 0 &&
					game.stats.westSwaps > 0 &&
					game.stats.eastSwaps > 0;
		}, function () {
			console.log('You swapped in all 4 directions!');
		}),
		game.MoveStage.AfterSwap
	);

game.dom.totalAch.innerHTML = game.achievements.count;

game.fn = {
	deg2rad: function (deg) {
		return (deg * Math.PI) / 180;
	},
	snapToGrip: function (val, gridSize) {
	    var snapCandidate = gridSize * Math.round(val / gridSize);
	    return (Math.abs(val - snapCandidate) < (gridSize / 4) ) ? snapCandidate : null;
	}
};

/**
 * game.Point
 **/

game.Point = function (x, y) {
	this.x = x;
	this.y = y;
}

game.Point.prototype.clone = function () {
	return new game.Point(this.x, this.y);
}

game.Point.prototype.set = function(x, y) {
	this.x = x;
	this.y = y;
	return this;
}

game.Circle = function (colour, location) {
	this.colour = colour;
	this.location = location;
}

game.circles = [];

function randomCircleColour () {
	return [game.Colour.Red,
			game.Colour.Green,
			game.Colour.Blue,
			game.Colour.Black,
			game.Colour.Magenta,
			game.Colour.Maroon
			][~~(Math.random() * 6)];
}

function initCircles () {

	var x, y;

	// Create a COLS x ROWS array to store circles
	for (x = 0; x < game.config.COLS; x++) {
		game.circles[x] = new Array(game.config.ROWS);
	}
	
	// Populate circle array
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			game.circles[x][y] = new game.Circle(randomCircleColour(), new game.Point(x, y));
		}
	}

}

function playCanvasMouseMoveJewels (x, y) {
	var doSwap = false, swapColour, other;
	if (game.move.lastY - y === 1) {
		game.stats.northSwaps++;
		doSwap = true;
	} else if (game.move.lastY - y === -1) {
		game.stats.southSwaps++;
		doSwap = true;
	} else if (game.move.lastX - x === 1) {
		game.stats.westSwaps++;
		doSwap = true;
	} else if (game.move.lastX - x === -1) {
		game.stats.eastSwaps++;
		doSwap = true;
	}	
	if (doSwap) {
		swapColour = game.circles[x][y].colour;
		other = game.move.hitCircles.pop();
		game.circles[x][y].colour = other.colour;
		other.colour = swapColour;
		game.controls.mouse.down = false;
		game.stats.swaps++;
		game.stats.score -= game.config.POINTSFORSWAP;
		game.achievements.check(game.MoveStage.AfterSwap);
		if (!game.move.canSwap()) {
			game.mode = game.PlayMode.Dots;
		}
		if (!game.isStillPlayable()) {
			game.over();
		}
	}
};

function playCanvasMouseMoveDots (x2, y2, x3, y3) {
	var i, l;
	// Has to be between circles of the same colour
	if (game.circles[x3][y3].colour !== game.move.colour) {
		return;
	}
	
	if (( !game.config.XYONLY && 
			( Math.abs(game.move.lastX - x3) === 1 || Math.abs(game.move.lastY - y3) === 1 )
		) ||
		( game.config.XYONLY && 
			( Math.abs(game.move.lastX - x3) === 1 && game.move.lastY === y3 ) || 
			( Math.abs(game.move.lastY - y3) === 1 && game.move.lastX === x3 )
		)
	){
	
		for (i = 0, l = game.move.hitCircles.length; i < l; i++) {
			if (game.move.hitCircles[i] === game.circles[x3][y3]) {
				
				if (i === l - 2) {
				
					// Going back on yourself
					//game.move.hitCircles = game.move.hitCircles.splice(l, 1);
					//game.move.trace.pop();
					return;

				} else {
				
					game.move.loop = true;
					game.stats.loops++;
					
					// End the trace by forcing a "mouse up"
					game.controls.mouse.down = false;
					break;

				}
			}
		}
	
		game.move.trace.push(new game.Point(x2, y2));
		game.move.hitCircles.push(game.circles[x3][y3]);
		game.move.lastX = x3;
		game.move.lastY = y3;
		game.audio.play('gotOne');
								
	}
};

function initStage () {
	game.dom.playContext = game.dom.playCanvas.getContext('2d');
}

function drawStage (c) {
	c.fillStyle = game.Colour[game.config.BACKGROUND];
	c.fillRect(0, 0, game.dom.playCanvas.width, game.dom.playCanvas.height);
}

function drawDots (c) {
	var x, y, _x, _y, size = game.config.DOTSIZE;
	c.lineWidth = 1;
	if (game.mode === game.PlayMode.Dots) {
		c.globalAlpha = 0.4;
		for (x = 0; x < game.config.COLS; x++) {
			for (y = 0; y < game.config.ROWS; y++) {
				c.fillStyle = game.Colour[game.circles[x][y].colour];
				c.strokeStyle = c.fillStyle;
				c.beginPath();
				c.arc(game.config.WESTGAP + (x * game.config.GRIDSIZE), game.config.NORTHGAP + (y * game.config.GRIDSIZE), size, 0, 2 * Math.PI, false);
				c.stroke();
				c.fill();
			}
		}
		c.globalAlpha = 1.0;
	} else if (game.mode === game.PlayMode.Jewels) {
		c.globalAlpha = 1.0;
		for (x = 0; x < game.config.COLS; x++) {
			for (y = 0; y < game.config.ROWS; y++) {
				_x = game.config.WESTGAP + (x * game.config.GRIDSIZE);
				_y = game.config.NORTHGAP + (y * game.config.GRIDSIZE);
				c.fillStyle = game.Colour[game.circles[x][y].colour];
				c.strokeStyle = c.fillStyle;
				c.beginPath();
			    c.lineTo(_x - size, _y);
			    c.lineTo(_x, _y + size);
			    c.lineTo(_x + size, _y);
			    c.lineTo(_x, _y - size);
				c.stroke();
				c.fill();
			}
		}
	}
}

function drawTracer (c) {
	var i, l;
	c.lineWidth = game.config.DOTSIZE / 2;
	c.shadowColor = '#aaa';
	c.shadowBlur = 10;
	c.shadowOffsetX = 0;
	c.shadowOffsetY = 0;
	c.lineJoin = 'round';
	c.beginPath();
	for (i = 0, l = game.move.trace.length; i < l; i++) {
		if (i === 0) {
			c.moveTo(game.move.trace[0].x, game.move.trace[0].y);
		} else {
			c.lineTo(game.move.trace[i].x, game.move.trace[i].y);
		}
	}
	c.strokeStyle = game.Colour[game.move.colour];
    c.stroke();
	if (l > 0) {
		c.lineTo(game.controls.mouse.x, game.controls.mouse.y);
		c.strokeStyle = game.Colour[game.Colour.Grey];
		c.stroke();
	}
}

function clearPoints () {
	var i, l;

	game.achievements.check(game.MoveStage.AfterTrace);

	if (game.move.trackingShape) {
		console.log(game.move.getHitShape());
	}

	// Make circles to clear white
	for (i = 0, l = game.move.hitCircles.length; i < l; i++) {
		game.move.hitCircles[i].colour = game.Colour.White;
	}

	game.achievements.check(game.MoveStage.AfterHitWhite);

	gravity();

	game.stats.score += game.move.hitCircles.length;

	if (game.move.loop) {
		game.stats.score += game.config.LOOPPOINTS;
		game.move.loop = false;
	}

	game.achievements.check(game.MoveStage.AfterPoints);

	if (game.isStillPlayable()) {
		if (game.type === game.GameType.Moves) {
			game.state.moves --;
			if (game.state.moves === 0) {
				alert('No more moves!');
				game.over();
			}
		}
	} else {
		game.over();
	}

}

function gravity () {
	var x, y, y2;
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			if (game.circles[x][y].colour === game.Colour.White) {
				for (y2 = y; y2 > 0; y2--) {
					game.circles[x][y2].colour = game.circles[x][y2 - 1].colour;
				}
				game.circles[x][0].colour = randomCircleColour();
			}
		}
	}
}

function clearAllColour (c) {
	var x, y;
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			if (game.circles[x][y].colour === c) {
				game.circles[x][y].colour = game.Colour.White;
			}
		}
	}
	gravity();
}

game.isStillPlayable = function () {
	var x, y;
	for (x = 0; x < game.config.COLS - 1; x++) {
		for (y = 0; y < game.config.ROWS - 1; y++) {
			if (game.circles[x][y].colour === game.circles[x + 1][y].colour) {
				return true;
			}
			if (game.circles[x][y].colour === game.circles[x][y + 1].colour) {
				return true;
			}
			if (!game.config.XYONLY) {
				if (x !== 0 && game.circles[x][y].colour === game.circles[x + 1][y - 1].colour) {
					return true;
				}
				if (game.circles[x][y].colour === game.circles[x + 1][y + 1].colour) {
					return true;
				}
			}
		}
	}
	
	// If the player has enough points to perform a swap, they can probably keep going...
	if (game.move.canSwap()) {
		return true;
	}
	
	return false;
}

game.step = function (timestamp) {
	if (game.state.startTime === 0) {
		game.state.startTime = timestamp;
	} else if (timestamp - game.state.startTime >= 1000) {
		// console.log('tick ' + game.state.elapsedTime);
		game.state.startTime = timestamp;
		if (game.type === game.GameType.Time && game.state.elapsedTime > game.state.timeLimit) {
			console.log('Time is up');
			game.over();
		}
		game.state.elapsedTime++;
	}
	var playContext = game.dom.playContext;
	playContext.clearRect(0, 0, game.dom.playCanvas.width, game.dom.playCanvas.height);
	drawStage(playContext);
	drawTracer(playContext);
	drawDots(playContext);
	if (game.running) {
		requestAnimationFrame(game.step);
	}
}

watch(game.achievements, 'gotCount', function (property, method, newVal, oldVal) {
    game.dom.gotAch.innerHTML = newVal;
});
watch(game.stats, 'swaps', function (property, method, newVal, oldVal) {
    game.dom.swaps.innerHTML = newVal;
});
watch(game.stats, 'score', function (property, method, newVal, oldVal) {
	game.dom.score.innerHTML = newVal;
});
watch(game.stats, 'draws', function (property, method, newVal, oldVal) {
	game.dom.draws.innerHTML = newVal;
});

game.dom.addEvents();
game.audio.init();
game.dom.showStart();