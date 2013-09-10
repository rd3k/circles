var game = {};

var stage;
var context;
var scoreEl = document.querySelector('#score');
var drawEl = document.querySelector('#draws');
var loopEl = document.querySelector('#loops') ;
var swapEl = document.querySelector('#swaps');
var totalAchEl = document.querySelector('#totalachievements');

var Colour = {};
Colour[Colour['0'] = 'White']  = 0;
Colour[Colour['1'] = 'Black']  = 1;
Colour[Colour['2'] = 'Red']    = 2;
Colour[Colour['3'] = 'Green']  = 3;
Colour[Colour['4'] = 'Blue']   = 4;
Colour[Colour['5'] = 'Yellow'] = 5;
Colour[Colour['7'] = 'Grey']   = 7;

var Mode = {};
Mode[Mode['0'] = 'Dots']   = 0;
Mode[Mode['1'] = 'Jewels'] = 1;

var MoveStage = {};
MoveStage[MoveStage['1'] = 'AfterTrace']    = 1;
MoveStage[MoveStage['2'] = 'AfterHitWhite'] = 2;
MoveStage[MoveStage['4'] = 'AfterPoints']   = 4;
MoveStage[MoveStage['8'] = 'AfterSwap']     = 8;

var COLS = 6;
var ROWS = 6;
var WESTGAP = 30;
var NORTHGAP = 30;

var BACKGROUND = Colour.White;

var SOUND = false;

var XYONLY = true;

var POINTSFORSWAP = 20;

var trackingShape = false;

var mouse = {
	x: 0,
	y: 0,
	down: false
};

var score = 0;
var draws = 0;
var loops = 0;
var swaps = 0;
var gamemode = Mode.Dots;

var northSwaps = 0;
var southSwaps = 0;
var westSwaps = 0;
var eastSwaps = 0;

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

window.requestAnimationFrame = requestAnimationFrame;                       

function getHitShape () {
	var l = hitCircles.length, prev = new Point(), xDist = 0, yDist = 0, xChain = [], yChain = [];
	if (l > 0) {
		prev = hitCircles[0].location.clone();
		for (var i = 1; i < l; i++) {
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

game.config = {
	COLS: 6,
	ROWS: 6,
	WESTGAP: 30,
	NORTHGAP: 30
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

game.achievements = {
	gotCount: 0,
	count: 0,
	gotEl: document.querySelector('#gotachievements'),
	toCheck: {
		AfterTrace: [],
		AfterHitWhite: [],
		AfterPoints: [],
		AfterSwap: []
	},
	register: function (achievement, checkWhen) {
		this.toCheck[MoveStage[checkWhen]].push(achievement);
		this.count++;
		return this;
	},
	getAll: function () {
		return this.toCheck.AfterTrace.concat(this.toCheck.AfterHitWhite, this.toCheck.AfterPoints, this.toCheck.AfterSwap);
	},
	check: function (when) {
		this.toCheck[MoveStage[when]].forEach(function(achievement){
			if (!achievement.got) {
				if (achievement.satisfied()) {
					achievement.achieve();
					achievement.got = true;
					game.achievements.gotCount++;
				}
			}
		});
	},
	Achievement: function(name, description, need, achieve) {
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
			return loops > 0;
		}, function () {
			console.log('Got a loop, yay!');
		}),
		MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Score of 10', 'Get a score of 10', function () {
			return score >= 10;
		}, function () {
			console.log('Got a score of 10, yay!');
		}),
		MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Remove 4', 'Remove a line of 4', function () {
			return hitCircles.length > 3;
		}, function () {
			console.log('Got a line of 4, yay!');
		}),
		MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Clear row', 'Clear a full row', function () {
			for (var y = 0; y < ROWS; y++) {
				if (circles[0][y].colour === Colour.White) {
					for (var x = 1; x < COLS - 1; x++) {
						if (circles[x][y].colour !== Colour.White) {
							break;
						}
					}
					if (circles[COLS - 1][y].colour === Colour.White) {
						return true;
					}
				}
			}
			return false;
		}, function () {
			console.log('You cleared a whole row!');
		}),
		MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Clear column', 'Clear a full column', function () {
			for (var x = 0; x < COLS; x++) {
				if (circles[x][0].colour === Colour.White) {
					for (var y = 1; y < ROWS - 1; y++) {
						if (circles[x][y].colour !== Colour.White) {
							break;
						}
					}
					if (circles[x][ROWS - 1].colour === Colour.White) {
						return true;
					}
				}
			}
			return false;
		}, function () {
			console.log('You cleared a whole column!');
		}),
		MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full height', 'Draw a line spanning the full height', function () {
			if (hitCircles.length < 2) {
				return false;
			}
			var need = 2;
			for (var x = 0; x < COLS; x++) {
				if (circles[x][0].colour === Colour.White) {
					need--;
					break;
				}
			}
			for (x = 0; x < COLS; x++) {
				if (circles[x][ROWS - 1].colour === Colour.White) {
					need--;
					break;
				}
			}
			return need == 0;
		}, function () {
			console.log('You drew a line spanning the full height!');
		}),
		MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full width', 'Draw a line spanning the full width', function () {
			if (hitCircles.length < 2) {
				return false;
			}
			var need = 2;
			for (var y = 0; y < ROWS; y++) {
				if (circles[0][y].colour === Colour.White) {
					need--;
					break;
				}
			}
			for (y = 0; y < ROWS; y++) {
				if (circles[COLS - 1][y].colour === Colour.White) {
					need--;
					break;
				}
			}
			return need == 0;
		}, function () {
			console.log('You drew a line spanning the full width!');
		}),
		MoveStage.AfterHitWhite
	)
	.register(
		new game.achievements.Achievement('Full loop', 'Draw a loop around the perimeter', function () {
			return (circles[0][0].colour === Colour.White) &&
					(circles[0][ROWS - 1].colour === Colour.White) &&
					(circles[COLS - 1][ROWS - 1].colour === Colour.White) &&
					(circles[COLS - 1][0].colour === Colour.White)
		}, function () {
			console.log('You drew a loop around the perimeter!');
		}),
		MoveStage.AfterHitWhite
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
		MoveStage.AfterTrace
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
		MoveStage.AfterTrace
	)
	.register(
		new game.achievements.Achievement('Table', 'Draw a red table', function () {
			if (tracingColour !== Colour.Red) {
				return false;
			}
			var valid = ['25,21', '-25,21'];
			var dist = getHitShape();
			return valid.indexOf([dist.x, dist.y].toString()) !== -1;
		}, function () {
			console.log('You drew a red table!');
		}),
		MoveStage.AfterTrace
	)
	.register(	
		new game.achievements.Achievement('Swap', 'Perform a swap', function () {
			return swaps > 0;
		}, function () {
			console.log('You performed a swap!');
		}),
		MoveStage.AfterSwap
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
		MoveStage.AfterSwap
	);

totalAchEl.innerHTML = game.achievements.count;

function deg2rad (deg) {
	return (deg * Math.PI) / 180;
}

function clear () {
	context.clearRect(0, 0, stage.width, stage.height);
}

function Point (x, y) {
	this.x = x;
	this.y = y;
}

Point.prototype.clone = function () {
	return new Point(this.x, this.y);
}

function Circle (colour, location) {
	this.colour = colour;
	this.location = location;
}

var circles = [];
var points = [];
var hitCircles = [];
var tracingColour = null;
var traceLength = 0;

function snapToGrip(val, gridSize) {
    var snapCandidate = gridSize * Math.round(val / gridSize);
    return (Math.abs(val - snapCandidate) < (gridSize / 4) ) ? snapCandidate : null;
};

function initCircles () {

	// Create a COLS x ROWS array to store circles
	for (var i = 0; i < COLS; i++) {
		circles[i] = new Array(ROWS);
	}
	
	// Populate circle array
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			circles[x][y] = new Circle([Colour.Red, Colour.Green, Colour.Blue][~~(Math.random() * 3)], new Point(x, y));
		}
	}

}

function initStage () {
	stage = document.querySelector('#game');
	stage.setAttribute('width', 210);
	stage.setAttribute('height', 210);
	context = stage.getContext('2d');
	var lastX, lastY, shift = false;
	document.addEventListener('keydown', function (e) {
		if (e.keyCode === 83 /*s*/) {
			trackingShape = true;
		}
		if (mouse.down || score < POINTSFORSWAP) {
			return;
		}
		if (e.shiftKey) {
			shift = true;
			gamemode = Mode.Jewels;
		}
	});
	document.addEventListener('keyup', function (e) {
		if (!e.shiftKey && shift) {
			shift = false;
			gamemode = Mode.Dots;
		}
		if (e.keyCode === 83 /*s*/) {
			trackingShape = false;
		}
	});
	stage.addEventListener('mousedown', function (e) {
		var x = e.offsetX, y = e.offsetY;
		mouse.x = x;
		mouse.y = y;
		var x2, y2;
		mouse.down = true;
		x = snapToGrip(x, 30);
		y = snapToGrip(y, 30);
		if (x !== null && y !== null) {
			x2 = x - WESTGAP;
			y2 = y - NORTHGAP;
			x2 /= 30;
			y2 /= 30;
			if (x2 >= 0 && x2 < COLS && y2 >= 0 && y2 < ROWS) {
				lastX = x2;
				lastY = y2;
				if (gamemode === Mode.Jewels) {
					hitCircles.push(circles[x2][y2]);
				} else {
					points.push(new Point(x, y));
					hitCircles.push(circles[x2][y2]);
					tracingColour = circles[x2][y2].colour;
					traceLength = 0;
				}
			}
		}
	});
	stage.addEventListener('mouseup', function () {
		mouse.down = false;
		if (points.length > 1) {
			clearPoints();
			drawEl.innerHTML = (++draws);
		}
		points = [];
		hitCircles = [];
	});
	stage.addEventListener('mousemove', function (e) {
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
				x3 = x2 - WESTGAP;
				y3 = y2 - NORTHGAP;
				x3 /= 30;
				y3 /= 30;
				
				if (x3 < 0 || x3 >= COLS || y3 < 0 || y3 >= ROWS) {
					return;
				}
				
				if (gamemode === Mode.Jewels) {
					
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
						swaps++;
						givePoints(-POINTSFORSWAP);
						game.achievements.check(MoveStage.AfterSwap);
					}
					
					
				} else if (gamemode === Mode.Dots) {
				
					// Has to be between circles of the same colour
					if (circles[x3][y3].colour !== tracingColour) {
						return;
					}
					
					if (( !XYONLY && 
							( Math.abs(lastX - x3) === 1 || Math.abs(lastY - y3) === 1 )
						) ||
						( XYONLY && 
							( Math.abs(lastX - x3) === 1 && lastY === y3 ) || 
							( Math.abs(lastY - y3) === 1 && lastX === x3 )
						)
					){
					
						for (var i = 0, l = hitCircles.length; i < l; i++) {
							if (hitCircles[i] === circles[x3][y3]) {
								loopEl.innerHTML = (++loops);
								
								// End the trace by forcing a "mouse up"
								mouse.down = false;
								break;
							}
						}
					
						points.push(new Point(x2, y2));
						hitCircles.push(circles[x3][y3]);
						lastX = x3;
						lastY = y3;
						
						game.audio.play('gotOne');
						
						traceLength ++;
						
					}
				}
					
			}
		}
	});
}

function drawStage () {
	context.fillStyle = Colour[BACKGROUND];
	context.fillRect(0, 0, stage.width, stage.height);
}

function drawDots () {
	context.lineWidth = 1;
	context.globalAlpha = 0.4;
	if (gamemode === Mode.Dots) {
		for (var x = 0; x < COLS; x++) {
			for (var y = 0; y < ROWS; y++) {
				context.fillStyle = Colour[circles[x][y].colour];
				context.strokeStyle = context.fillStyle;
				context.beginPath();
				context.arc(30 + (x * 30), 30 + (y * 30), 5, 0, 2 * Math.PI, false);
				context.stroke();
				context.fill();
			}
		}
	} else if (gamemode === Mode.Jewels) {
		context.globalAlpha = 1.0;
		var size = 5;
		for (var x = 0; x < COLS; x++) {
			for (var y = 0; y < ROWS; y++) {
				context.fillStyle = Colour[circles[x][y].colour];
				context.strokeStyle = context.fillStyle;
				context.beginPath();
			    context.lineTo((30 + (x * 30)) - size, 30 + (y * 30));
			    context.lineTo((30 + (x * 30)), 30 + (y * 30) + size);
			    context.lineTo((30 + (x * 30)) + size, 30 + (y * 30));
			    context.lineTo((30 + (x * 30)), 30 + (y * 30) - size);
				context.stroke();
				context.fill();
			}
		}
	}
	context.globalAlpha = 1.0;
}

function drawPoints () {
	context.lineWidth = 3;
	context.shadowColor = '#aaa';
	context.shadowBlur = 10;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 0;
	context.lineJoin = 'round';
	context.beginPath();
	for (var i = 0, l = points.length; i < l; i++) {
		if (i === 0) {
			context.moveTo(points[0].x, points[0].y);
		} else {
			context.lineTo(points[i].x, points[i].y);
		}
	}
	context.strokeStyle = Colour[tracingColour];
    context.stroke();
}

function drawTracer () {
	if (points.length > 0) {
		context.lineWidth = 3;
		context.beginPath();
		context.moveTo(points[points.length-1].x, points[points.length-1].y);
		context.lineTo(mouse.x, mouse.y);
		context.strokeStyle = Colour[Colour.Grey];
		context.stroke();
	}
}

function clearPoints () {

	game.achievements.check(MoveStage.AfterTrace);
	
	if (trackingShape) {
		console.log(getHitShape());
	}

	// Make circles to clear white
	for (var i = 0, l = hitCircles.length; i < l; i++) {
		hitCircles[i].colour = Colour.White;
	}
	
	game.achievements.check(MoveStage.AfterHitWhite);
	
	gravity();
	
	// Score
	givePoints(hitCircles.length);
	
	game.achievements.check(MoveStage.AfterPoints);
	
}

function gravity () {
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			if (circles[x][y].colour === Colour.White) {
				for (var y2 = y; y2 > 0; y2--) {
					circles[x][y2].colour = circles[x][y2 - 1].colour;
				}
				circles[x][0].colour = [Colour.Red, Colour.Green, Colour.Blue][~~(Math.random() * 3)];
			}
		}
	}
}

function clearAllColour (c) {
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			if (circles[x][y].colour === c) {
				circles[x][y].colour = Colour.White;
			}
		}
	}
	gravity();
}

function givePoints (p) {
	scoreEl.innerHTML = (score += p);
}

function step (timestamp) {
	clear();
	drawStage();
	drawPoints();
	drawTracer();
	drawDots();
	requestAnimationFrame(step);
}

function makeDotLoop () {
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			circles[x][y].colour = Colour.Black;
		}
	}
	circles[2][2].colour = Colour.Red;
	circles[2][3].colour = Colour.Red;
	circles[2][4].colour = Colour.Red;
	circles[4][2].colour = Colour.Red;
	circles[4][3].colour = Colour.Red;
	circles[4][4].colour = Colour.Red;
	circles[3][2].colour = Colour.Red;
	circles[3][4].colour = Colour.Red;
}

initStage();
initCircles();
requestAnimationFrame(step);