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

/**
 * game.PlayMode
 **/
game.PlayMode = {};
game.PlayMode[game.PlayMode['0'] = 'Dots']   = 0;
game.PlayMode[game.PlayMode['1'] = 'Jewels'] = 1;

/**
 * game.MoveStage
 **/
game.MoveStage = {};
game.MoveStage[game.MoveStage['0'] = 'AfterTrace']    = 0;
game.MoveStage[game.MoveStage['1'] = 'AfterHitWhite'] = 1;
game.MoveStage[game.MoveStage['2'] = 'AfterPoints']   = 2;
game.MoveStage[game.MoveStage['3'] = 'AfterSwap']     = 3;

game.mouse = {
	x: 0,
	y: 0,
	down: false
};

game.move = {
	loop: false,
	hitCircles: [],
	colour: null,
	trace: [],
	lastX: null,
	lastY: null,
	trackingShape: false
}

game.running = false;

game.mode = game.PlayMode.Dots;

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
	}
}

document.addEventListener('click', function (e) {
	var target = e.target.id;
	if (target === 'playButton') {
		showPlay();
	} else if (target === 'achieveButton') {
		console.log('Achieve')
		game.dom.showAchievements();
	} else if (target === 'settingsButton') {
		console.log('Settings');
		game.dom.showSettings();
	} else if (target === 'about') {
		game.dom.showAbout();
	} else if (target === 'score') {
		console.log('show store');
		game.dom.showStore();
	} else if (target === 'back') {
		game.dom.showStart();
	} else if (target === 'random') {
		console.log('random');
	} else if (target === 'fill') {
		console.log('fill');
	}
});

function showPlay () {
	document.body.className = 'play';
	game.running = true;
	initStage();
	initCircles();
	requestAnimationFrame(game.step);
}

function getHitShape () {
	var i, l = game.move.hitCircles.length, prev = new game.Point(), xDist = 0, yDist = 0, xChain = [], yChain = [];
	if (l > 0) {
		prev = game.move.hitCircles[0].location.clone();
		for (i = 1; i < l; i++) {
			xDist += (game.move.hitCircles[i].location.x - prev.x) * i * 5;
			yDist += (game.move.hitCircles[i].location.y - prev.y) * i * 7;
			xChain.push(xDist);
			yChain.push(yDist);
			prev.x = game.move.hitCircles[i].location.x;
			prev.y = game.move.hitCircles[i].location.y;
		}
	}
	return {
		x: xDist,
		y: yDist,
		xChain: xChain,
		yChain: yChain
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

game.audio.init();

game.buyables = {
	list: [],
	getHtml: function () {
		return '';
	},
	Buyable: function (name, cost) {
		this.name = name;
		this.cost = cost;
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
				if (circles[0][y].colour === game.Colour.White) {
					for (var x = 1; x < game.config.COLS - 1; x++) {
						if (circles[x][y].colour !== game.Colour.White) {
							break;
						}
					}
					if (circles[game.config.COLS - 1][y].colour === game.Colour.White) {
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
				if (circles[x][0].colour === game.Colour.White) {
					for (var y = 1; y < game.config.ROWS - 1; y++) {
						if (circles[x][y].colour !== game.Colour.White) {
							break;
						}
					}
					if (circles[x][game.config.ROWS - 1].colour === game.Colour.White) {
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
				if (circles[x][0].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			for (x = 0; x < game.config.COLS; x++) {
				if (circles[x][game.config.ROWS - 1].colour === game.Colour.White) {
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
				if (circles[0][y].colour === game.Colour.White) {
					need--;
					break;
				}
			}
			for (y = 0; y < game.config.ROWS; y++) {
				if (circles[game.config.COLS - 1][y].colour === game.Colour.White) {
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
			return (circles[0][0].colour === game.Colour.White) &&
					(circles[0][game.config.ROWS - 1].colour === game.Colour.White) &&
					(circles[game.config.COLS - 1][game.config.ROWS - 1].colour === game.Colour.White) &&
					(circles[game.config.COLS - 1][0].colour === game.Colour.White)
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
			var dist = getHitShape();
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
			var dist = getHitShape();
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

function deg2rad (deg) {
	return (deg * Math.PI) / 180;
}



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

function Circle (colour, location) {
	this.colour = colour;
	this.location = location;
}

var circles = [];

function snapToGrip(val, gridSize) {
    var snapCandidate = gridSize * Math.round(val / gridSize);
    return (Math.abs(val - snapCandidate) < (gridSize / 4) ) ? snapCandidate : null;
};

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
		circles[x] = new Array(game.config.ROWS);
	}
	
	// Populate circle array
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			circles[x][y] = new Circle(randomCircleColour(), new game.Point(x, y));
		}
	}

}

function gameKeyDown (e) {
	if (e.keyCode === 83 /*s*/) {
		game.move.trackingShape = true;
	} else if (e.keyCode === 27 && game.running) {
		// esc
		console.log('pause game');
	} else {
		console.log(e.keyCode);
	}
	if (game.mouse.down || game.stats.score < game.config.POINTSFORSWAP) {
		return;
	}
	if (e.shiftKey) {
		game.mode = game.PlayMode.Jewels;
	}
}

function gameKeyUp (e) {
	if (!e.shiftKey) {
		game.mode = game.PlayMode.Dots;
	}
	if (e.keyCode === 83 /*s*/) {
		game.move.trackingShape = false;
	}
}

function playCanvasMouseDown (e) {
	var x = e.offsetX, y = e.offsetY, x2, y2;
	game.mouse.x = x;
	game.mouse.y = y;
	game.mouse.down = true;
	x = snapToGrip(x, 30);
	y = snapToGrip(y, 30);
	if (x !== null && y !== null) {
		x2 = x - game.config.WESTGAP;
		y2 = y - game.config.NORTHGAP;
		x2 /= 30;
		y2 /= 30;
		if (x2 >= 0 && x2 < game.config.COLS && y2 >= 0 && y2 < game.config.ROWS) {
			game.move.lastX = x2;
			game.move.lastY = y2;
			if (game.mode === game.PlayMode.Jewels) {
				game.move.hitCircles.push(circles[x2][y2]);
			} else {
				game.move.trace.push(new game.Point(x, y));
				game.move.hitCircles.push(circles[x2][y2]);
				game.move.colour = circles[x2][y2].colour;
			}
		}
	}
}

function playCanvasMouseUp () {
	game.mouse.down = false;
	if (game.move.trace.length > 1) {
		clearPoints();
		game.stats.draws++;
	}
	game.move.trace = [];
	game.move.hitCircles = [];
}

function playCanvasMouseMove (e) {
	if (game.mouse.down) {
		var x = e.offsetX,
			y = e.offsetY,
			x2, y2,
			x3, y3;
		game.mouse.x = x;
		game.mouse.y = y;
		x2 = snapToGrip(x, 30);
		y2 = snapToGrip(y, 30);
		if (x2 !== null && y2 !== null) {
			x3 = x2 - game.config.WESTGAP;
			y3 = y2 - game.config.NORTHGAP;
			x3 /= 30;
			y3 /= 30;
			
			if (x3 < 0 || x3 >= game.config.COLS || y3 < 0 || y3 >= game.config.ROWS) {
				return;
			}
			
			if (game.mode === game.PlayMode.Jewels) {
				
				var doSwap = false, swapColour, other;
				if (game.move.lastY - y3 === 1) {
					// North
					game.stats.northSwaps++;
					doSwap = true;
				} else if (game.move.lastY - y3 === -1) {
					// South
					game.stats.southSwaps++;
					doSwap = true;
				} else if (game.move.lastX - x3 === 1) {
					// West
					game.stats.westSwaps++;
					doSwap = true;
				} else if (game.move.lastX - x3 === -1) {
					// East
					game.stats.eastSwaps++;
					doSwap = true;
				}
				
				if (doSwap) {
					swapColour = circles[x3][y3].colour;
					other = game.move.hitCircles.pop();
					circles[x3][y3].colour = other.colour;
					other.colour = swapColour;
					game.mouse.down = false;
					game.stats.swaps++;
					game.stats.score -= game.config.POINTSFORSWAP;
					game.achievements.check(game.MoveStage.AfterSwap);
					if (game.stats.score < game.config.POINTSFORSWAP) {
						game.mode = game.PlayMode.Dots;
					}
					if (!game.isStillPlayable()) {
						game.over();
					}
				}
				
				
			} else if (game.mode === game.PlayMode.Dots) {
			
				// Has to be between circles of the same colour
				if (circles[x3][y3].colour !== game.move.colour) {
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
				
					for (var i = 0, l = game.move.hitCircles.length; i < l; i++) {
						if (game.move.hitCircles[i] === circles[x3][y3]) {
							
							if (i === l - 2) {
							
								// Going back on yourself
								//game.move.hitCircles = game.move.hitCircles.splice(l, 1);
								//game.move.trace.pop();
								return;
	
							} else {
							
								game.move.loop = true;
								game.stats.loops++;
								
								// End the trace by forcing a "mouse up"
								game.mouse.down = false;
								break;
	
							}
						}
					}
				
					game.move.trace.push(new game.Point(x2, y2));
					game.move.hitCircles.push(circles[x3][y3]);
					game.move.lastX = x3;
					game.move.lastY = y3;
					
					game.audio.play('gotOne');
											
				}
			}
				
		}
	}
}

function playCanvasTouchStart (e) {
	if (e.touches.length === 1) { 
		var touch = event.touches[0];
		e.offsetX = touch.pageX - touch.target.offsetLeft;
		e.offsetY = touch.pageY - touch.target.offsetTop;
		playCanvasMouseDown(e); 
	}
}

function playCanvasTouchEnd () {
	playCanvasMouseUp();
}

function playCanvasTouchMove (e) {
	if (e.touches.length === 1) { 
		var touch = event.touches[0];
		e.offsetX = touch.pageX - touch.target.offsetLeft;
		e.offsetY = touch.pageY - touch.target.offsetTop;
		e.preventDefault();
		playCanvasMouseMove(e);
	}
}

function initStage () {
	game.dom.playContext = game.dom.playCanvas.getContext('2d')
	document.addEventListener('keydown', gameKeyDown);
	document.addEventListener('keyup', gameKeyUp);
	game.dom.playCanvas.addEventListener('mousedown', playCanvasMouseDown);
	game.dom.playCanvas.addEventListener('mouseup', playCanvasMouseUp);
	game.dom.playCanvas.addEventListener('mousemove', playCanvasMouseMove);
	game.dom.playCanvas.addEventListener('touchstart', playCanvasTouchStart, false);
	game.dom.playCanvas.addEventListener('touchend', playCanvasTouchEnd, false);
	game.dom.playCanvas.addEventListener('touchmove', playCanvasTouchMove, false);
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
				c.fillStyle = game.Colour[circles[x][y].colour];
				c.strokeStyle = c.fillStyle;
				c.beginPath();
				c.arc(30 + (x * 30), 30 + (y * 30), size, 0, 2 * Math.PI, false);
				c.stroke();
				c.fill();
			}
		}
		c.globalAlpha = 1.0;
	} else if (game.mode === game.PlayMode.Jewels) {
		c.globalAlpha = 1.0;
		for (x = 0; x < game.config.COLS; x++) {
			for (y = 0; y < game.config.ROWS; y++) {
				_x = 30 + (x * 30);
				_y = 30 + (y * 30);
				c.fillStyle = game.Colour[circles[x][y].colour];
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
		c.lineTo(game.mouse.x, game.mouse.y);
		c.strokeStyle = game.Colour[game.Colour.Grey];
		c.stroke();
	}
}

function clearPoints () {
	var i, l;

	game.achievements.check(game.MoveStage.AfterTrace);
	
	if (game.move.trackingShape) {
		console.log(getHitShape());
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
	
	if (!game.isStillPlayable()) {
		game.over();
	}
	
}

function gravity () {
	var x, y, y2;
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			if (circles[x][y].colour === game.Colour.White) {
				for (y2 = y; y2 > 0; y2--) {
					circles[x][y2].colour = circles[x][y2 - 1].colour;
				}
				circles[x][0].colour = randomCircleColour();
			}
		}
	}
}

function clearAllColour (c) {
	var x, y;
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			if (circles[x][y].colour === c) {
				circles[x][y].colour = game.Colour.White;
			}
		}
	}
	gravity();
}

game.isStillPlayable = function () {
	// TODO: This is wrong if the player has enough points to perform a swap...
	var x, y;
	for (x = 0; x < game.config.COLS - 1; x++) {
		for (y = 0; y < game.config.ROWS - 1; y++) {
			if (circles[x][y].colour === circles[x + 1][y].colour) {
				return true;
			}
			if (circles[x][y].colour === circles[x][y + 1].colour) {
				return true;
			}
			if (!game.config.XYONLY) {
				if (x !== 0 && circles[x][y].colour === circles[x + 1][y - 1].colour) {
					return true;
				}
				if (circles[x][y].colour === circles[x + 1][y + 1].colour) {
					return true;
				}
			}
		}
	}
	return false;
}

game.step = function (timestamp) {
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
game.dom.showStart();