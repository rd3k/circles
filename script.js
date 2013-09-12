window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var game = {};

var Colour = {};
Colour[Colour['0'] = 'White']   = 0;
Colour[Colour['1'] = 'Black']   = 1;
Colour[Colour['2'] = 'Red']     = 2;
Colour[Colour['3'] = 'Green']   = 3;
Colour[Colour['4'] = 'Blue']    = 4;
Colour[Colour['5'] = 'Yellow']  = 5;
Colour[Colour['6'] = 'Grey']    = 6;
Colour[Colour['7'] = 'Magenta'] = 7;
Colour[Colour['8'] = 'Maroon']  = 8;

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

game.trackingShape = false;

game.dom = {
	score: document.querySelector('#score'),
	draws: document.querySelector('#draws'),
	swaps: document.querySelector('#swaps'),
	totalAch: document.querySelector('#totalachievements'),
	gotAch: document.querySelector('#gotachievements'),
	playCanvas: document.querySelector('#game'),
	playContext: null,
	updateDotSizer: function () {
		dsd.style.width = (game.config.DOTSIZE * 2) + 'px';
		dsd.style.height = (game.config.DOTSIZE * 2) + 'px';
		dsd.style.marginTop = (14 - (game.config.DOTSIZE)) + (game.config.DOTSIZE / 2) + 'px';
	}
}

mouse = {
	x: 0,
	y: 0,
	down: false
};

game.running = false;

game.mode = game.PlayMode.Dots;
                    
document.addEventListener('click', function (e) {
	var target = e.target.id;
	if (target === 'playButton') {
		console.log('Play');
		showPlay();
	} else if (target === 'achieveButton') {
		console.log('Achieve')
		showAchievements();
	} else if (target === 'settingsButton') {
		console.log('Settings');
		showSettings();
	} else if (target === 'about') {
		showAbout();
	} else if (target === 'score') {
		console.log('show store');
		showStore();
	} else if (target === 'back') {
		showStart();
	} else if (target === 'random') {
		console.log('random');
	} else if (target === 'fill') {
		console.log('fill');
	}
});

function showStart () {
	document.body.className = 'start';
}

showStart();

function showAbout() {
	document.body.className = 'about';
}

function showAchievements () {
	document.body.className = 'achievements';
}

function showSettings () {
	document.body.className = 'settings';
	updateSettingsUi();
}

function showPlay () {
	document.body.className = 'play';
	game.running = true;
	initStage();
	initCircles();
	requestAnimationFrame(game.step);
}

function showStore () {
	document.body.className = 'play store';
}

function getHitShape () {
	var i, l = hitCircles.length, prev = new Point(), xDist = 0, yDist = 0, xChain = [], yChain = [];
	if (l > 0) {
		prev = hitCircles[0].location.clone();
		for (i = 1; i < l; i++) {
			xDist += (hitCircles[i].location.x - prev.x) * i * 5;
			yDist += (hitCircles[i].location.y - prev.y) * i * 7;
			xChain.push(xDist);
			yChain.push(yDist);
			prev.x = hitCircles[i].location.x;
			prev.y = hitCircles[i].location.y;
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
	BACKGROUND: Colour.White,
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
			return hitCircles.length > 3;
		}, function () {
			console.log('Got a line of 4, yay!');
		}),
		game.MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Clear row', 'Clear a full row', function () {
			for (var y = 0; y < game.config.ROWS; y++) {
				if (circles[0][y].colour === Colour.White) {
					for (var x = 1; x < game.config.COLS - 1; x++) {
						if (circles[x][y].colour !== Colour.White) {
							break;
						}
					}
					if (circles[game.config.COLS - 1][y].colour === Colour.White) {
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
				if (circles[x][0].colour === Colour.White) {
					for (var y = 1; y < game.config.ROWS - 1; y++) {
						if (circles[x][y].colour !== Colour.White) {
							break;
						}
					}
					if (circles[x][game.config.ROWS - 1].colour === Colour.White) {
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
			if (hitCircles.length < 2) {
				return false;
			}
			var x, need = 2;
			for (x = 0; x < game.config.COLS; x++) {
				if (circles[x][0].colour === Colour.White) {
					need--;
					break;
				}
			}
			for (x = 0; x < game.config.COLS; x++) {
				if (circles[x][game.config.ROWS - 1].colour === Colour.White) {
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
			if (hitCircles.length < 2) {
				return false;
			}
			var y, need = 2;
			for (y = 0; y < game.config.ROWS; y++) {
				if (circles[0][y].colour === Colour.White) {
					need--;
					break;
				}
			}
			for (y = 0; y < game.config.ROWS; y++) {
				if (circles[game.config.COLS - 1][y].colour === Colour.White) {
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
			return (circles[0][0].colour === Colour.White) &&
					(circles[0][game.config.ROWS - 1].colour === Colour.White) &&
					(circles[game.config.COLS - 1][game.config.ROWS - 1].colour === Colour.White) &&
					(circles[game.config.COLS - 1][0].colour === Colour.White)
		}, function () {
			console.log('You drew a loop around the perimeter!');
		}),
		game.MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('5 red', 'Get a line of exactly 5 red', function () {
			if (hitCircles.length != 5) {
				return false;
			}
			for (var i = 0, l = hitCircles.length; i < l; i++) {
				if (hitCircles[i].colour !== Colour.Red) {
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
			if (hitCircles.length !== 9) {
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
			if (game.tracingColour !== Colour.Red) {
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
 * Point
 **/

function Point (x, y) {
	this.x = x;
	this.y = y;
}

Point.prototype.clone = function () {
	return new Point(this.x, this.y);
}

Point.prototype.set = function(x, y) {
	this.x = x;
	this.y = y;
	return this;
}

function Circle (colour, location) {
	this.colour = colour;
	this.location = location;
}

var circles = [];
var trace = [];
var hitCircles = [];
game.tracingColour = null;

function snapToGrip(val, gridSize) {
    var snapCandidate = gridSize * Math.round(val / gridSize);
    return (Math.abs(val - snapCandidate) < (gridSize / 4) ) ? snapCandidate : null;
};

function randomCircleColour () {
	return [Colour.Red, Colour.Green, Colour.Blue, Colour.Black, Colour.Magenta, Colour.Maroon][~~(Math.random() * 6)];
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
			circles[x][y] = new Circle(randomCircleColour(), new Point(x, y));
		}
	}

}

function stageKeyUp () {
	
}

function initStage () {
	var lastX, lastY, shift = false;
	game.dom.playContext = game.dom.playCanvas.getContext('2d')
	document.addEventListener('keydown', function (e) {
		if (e.keyCode === 83 /*s*/) {
			game.trackingShape = true;
		} else {
			/* 27 = escape */
			console.log(e.keyCode);
		}
		if (mouse.down || game.stats.score < game.config.POINTSFORSWAP) {
			return;
		}
		if (e.shiftKey) {
			shift = true;
			game.mode = game.PlayMode.Jewels;
		}
	});
	document.addEventListener('keyup', function (e) {
		if (!e.shiftKey && shift) {
			shift = false;
			game.mode = game.PlayMode.Dots;
		}
		if (e.keyCode === 83 /*s*/) {
			game.trackingShape = false;
		}
	});
	game.dom.playCanvas.addEventListener('mousedown', function (e) {
		var x = e.offsetX, y = e.offsetY;
		mouse.x = x;
		mouse.y = y;
		var x2, y2;
		mouse.down = true;
		x = snapToGrip(x, 30);
		y = snapToGrip(y, 30);
		if (x !== null && y !== null) {
			x2 = x - game.config.WESTGAP;
			y2 = y - game.config.NORTHGAP;
			x2 /= 30;
			y2 /= 30;
			if (x2 >= 0 && x2 < game.config.COLS && y2 >= 0 && y2 < game.config.ROWS) {
				lastX = x2;
				lastY = y2;
				if (game.mode === game.PlayMode.Jewels) {
					hitCircles.push(circles[x2][y2]);
				} else {
					trace.push(new Point(x, y));
					hitCircles.push(circles[x2][y2]);
					game.tracingColour = circles[x2][y2].colour;
				}
			}
		}
	});
	game.dom.playCanvas.addEventListener('mouseup', function () {
		mouse.down = false;
		if (trace.length > 1) {
			clearPoints();
			game.stats.draws++;
		}
		trace = [];
		hitCircles = [];
	});
	game.dom.playCanvas.addEventListener('mousemove', function (e) {
		if (mouse.down) {
			var x = e.offsetX,
				y = e.offsetY,
				x2, y2,
				x3, y3;
			mouse.x = x;
			mouse.y = y;
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
					if (lastY - y3 === 1) {
						// North
						game.stats.northSwaps++;
						doSwap = true;
					} else if (lastY - y3 === -1) {
						// South
						game.stats.southSwaps++;
						doSwap = true;
					} else if (lastX - x3 === 1) {
						// West
						game.stats.westSwaps++;
						doSwap = true;
					} else if (lastX - x3 === -1) {
						// East
						game.stats.eastSwaps++;
						doSwap = true;
					}
					
					if (doSwap) {
						swapColour = circles[x3][y3].colour;
						other = hitCircles.pop();
						circles[x3][y3].colour = other.colour;
						other.colour = swapColour;
						mouse.down = false;
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
					if (circles[x3][y3].colour !== game.tracingColour) {
						return;
					}
					
					if (( !game.config.XYONLY && 
							( Math.abs(lastX - x3) === 1 || Math.abs(lastY - y3) === 1 )
						) ||
						( game.config.XYONLY && 
							( Math.abs(lastX - x3) === 1 && lastY === y3 ) || 
							( Math.abs(lastY - y3) === 1 && lastX === x3 )
						)
					){
					
						for (var i = 0, l = hitCircles.length; i < l; i++) {
							if (hitCircles[i] === circles[x3][y3]) {
								
								if (i === l - 2) {
								
									// Going back on yourself
									//hitCircles = hitCircles.splice(l, 1);
									//trace.pop();
									return;

								} else {
								
									game.stats.loops++;
									game.stats.score += game.config.LOOPPOINTS;
									
									// End the trace by forcing a "mouse up"
									mouse.down = false;
									break;

								}
							}
						}
					
						trace.push(new Point(x2, y2));
						hitCircles.push(circles[x3][y3]);
						lastX = x3;
						lastY = y3;
						
						game.audio.play('gotOne');
												
					}
				}
					
			}
		}
	});
}

function drawStage (c) {
	c.fillStyle = Colour[game.config.BACKGROUND];
	c.fillRect(0, 0, game.dom.playCanvas.width, game.dom.playCanvas.height);
}

function drawDots (c) {
	var x, y, size = game.config.DOTSIZE;
	c.lineWidth = 1;
	c.globalAlpha = 0.4;
	if (game.mode === game.PlayMode.Dots) {
		for (x = 0; x < game.config.COLS; x++) {
			for (y = 0; y < game.config.ROWS; y++) {
				c.fillStyle = Colour[circles[x][y].colour];
				c.strokeStyle = c.fillStyle;
				c.beginPath();
				c.arc(30 + (x * 30), 30 + (y * 30), size, 0, 2 * Math.PI, false);
				c.stroke();
				c.fill();
			}
		}
	} else if (game.mode === game.PlayMode.Jewels) {
		c.globalAlpha = 1.0;
		var _x, _y;
		for (x = 0; x < game.config.COLS; x++) {
			for (y = 0; y < game.config.ROWS; y++) {
				_x = 30 + (x * 30);
				_y = 30 + (y * 30);
				c.fillStyle = Colour[circles[x][y].colour];
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
	c.globalAlpha = 1.0;
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
	for (i = 0, l = trace.length; i < l; i++) {
		if (i === 0) {
			c.moveTo(trace[0].x, trace[0].y);
		} else {
			c.lineTo(trace[i].x, trace[i].y);
		}
	}
	c.strokeStyle = Colour[game.tracingColour];
    c.stroke();
	if (l > 0) {
		c.lineTo(mouse.x, mouse.y);
		c.strokeStyle = Colour[Colour.Grey];
		c.stroke();
	}
}

function clearPoints () {
	var i, l;

	game.achievements.check(game.MoveStage.AfterTrace);
	
	if (game.trackingShape) {
		console.log(getHitShape());
	}

	// Make circles to clear white
	for (i = 0, l = hitCircles.length; i < l; i++) {
		hitCircles[i].colour = Colour.White;
	}
	
	game.achievements.check(game.MoveStage.AfterHitWhite);
	
	gravity();
	
	game.stats.score += hitCircles.length;
	
	game.achievements.check(game.MoveStage.AfterPoints);
	
	if (!game.isStillPlayable()) {
		game.over();
	}
	
}

function gravity () {
	var x, y, y2;
	for (x = 0; x < game.config.COLS; x++) {
		for (y = 0; y < game.config.ROWS; y++) {
			if (circles[x][y].colour === Colour.White) {
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
				circles[x][y].colour = Colour.White;
			}
		}
	}
	gravity();
}

game.isStillPlayable = function () {
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

var an = document.getElementById('animation');
var dsd = document.getElementById('dotsizedot');
var ds = document.getElementById('dotsizer');

function updateSettingsUi () {
	an.checked = game.config.ANIMATE;
	game.dom.updateDotSizer();
}

ds.addEventListener('change', function (e) {
	game.config.DOTSIZE = parseInt(e.target.value);
	game.dom.updateDotSizer();
});

an.addEventListener('change', function (e) {
	game.config.ANIMATE = e.target.checked;
});