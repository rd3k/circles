var stage;
var context;
var scoreEl = document.querySelector('#score');
var drawEl = document.querySelector('#draws');
var loopEl = document.querySelector('#loops') ;
var swapEl = document.querySelector('#swaps');
var gotAchEl = document.querySelector('#gotachievements');
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

var COLS = 6;
var ROWS = 6;
var WESTGAP = 30;
var NORTHGAP = 30;

var BACKGROUND = Colour.White;

var SOUND = false;

var XYONLY = true;

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

var osc = null;
var freqs = [500, 1500, 2500, 3500, 4500];

function initAudio () {

	audioContext = null;
	try {
		audioContext = new webkitAudioContext();
		osc = audioContext.createOscillator();
	    osc.type = this.osc.TRIANGLE;
	    osc.connect(audioContext.destination);
	    osc.noteOn(0);
	    osc.frequency.value = 0;
	}
	catch (e) {}

}

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

window.requestAnimationFrame = requestAnimationFrame;                       

function Achievement (name, description, need, achieve) {
	this.got = false;
	this.name = name;
	this.description = description;
	this.satisfied = need;
	this.achieve = achieve;
}

var gotAch = 0;

var achievements = [
	new Achievement('Loop', 'Get a loop!', function () {
		return loops > 0;
	}, function () {
		console.log('Got a loop, yay!');
	}),
	new Achievement('Score of 10', 'Get a score of 10', function () {
		return score >= 10;
	}, function () {
		console.log('Got a score of 10, yay!');
	}),
	new Achievement('Remove 4', 'Remove a line of 4', function () {
		return hitCircles.length > 3;
	}, function () {
		console.log('Got a line of 4, yay!');
	}),
	new Achievement('Clear row', 'Clear a full row', function () {
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
	new Achievement('Clear column', 'Clear a full column', function () {
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
	new Achievement('5 red', 'Get a line of exactly 5 red', function () {
		if (hitCircles.length < 5) {
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
	new Achievement('Swap', 'Perform a swap', function () {
		return swaps > 0;
	}, function () {
		console.log('You performed a swap!');
	})
];

totalAchEl.innerHTML = achievements.length;

function checkAchievements () {
	for (var i = 0, l = achievements.length; i < l; i++) {
		if (!achievements[i].got) {
			if(achievements[i].satisfied()){
				achievements[i].achieve();
				achievements[i].got = true;
				gotAchEl.innerHTML = (++gotAch);
			}
		}
	}
}

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

function Circle () {
	this.colour = Colour.Grey;
}

var circles = [];
var points = [];
var hitCircles = [];
var tracingColour = null;
var traceLength = 0;

function snapToGrip(val, gridSize) {
    var snap_candidate = gridSize * Math.round(val / gridSize);
    if (Math.abs(val - snap_candidate) < (gridSize / 4) ) {
        return snap_candidate;
    } else {
        return null;
    }
};

function initCircles () {

	// Create a COLS x ROWS array to store circles
	for (var i = 0; i < COLS; i++) {
		circles[i] = new Array(ROWS);
	}
	
	// Populate circle array
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			circles[x][y] = new Circle();
			circles[x][y].colour = [Colour.Red, Colour.Green, Colour.Blue][~~(Math.random() * 3)]
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
		if (mouse.down) {
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
						console.log('north');
						doSwap = true;
					} else if (lastY - y3 === -1) {
						console.log('south');
						doSwap = true;
					} else if (lastX - x3 === 1) {
						console.log('west');
						doSwap = true;
					} else if (lastX - x3 === -1) {
						console.log('east');
						doSwap = true;
					}
					
					if (doSwap) {
						swapColour = circles[x3][y3].colour;
						other = hitCircles.pop();
						circles[x3][y3].colour = other.colour;
						other.colour = swapColour;
						mouse.down = false;
						swapEl.innerHTML = (++swaps);
						checkAchievements();
					}
					
					
				} else if (gamemode === Mode.Dots) {
				
					// Has to be between circles of the same colour
					if (circles[x3][y3].colour !== tracingColour) {
						return;
					}
					
					if (( !XYONLY && 
							Math.abs(lastX - x3) === 1 || Math.abs(lastY - y3) === 1
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
						
						if (osc !== null && SOUND) {
							osc.frequency.value = freqs[Math.min(traceLength, freqs.length - 1)];
							setTimeout(function () {
								osc.frequency.value = 0;
							}, 100);
							console.log('noise');
						}
						
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

	// Achievements, um
	checkAchievements();

	// Make circles to clear white
	for (var i = 0, l = hitCircles.length; i < l; i++) {
		hitCircles[i].colour = Colour.White;
	}
	
	// Achievements
	checkAchievements();
	
	// Apply gravity
	gravity();
	
	// Score
	givePoints(hitCircles.length);
	
	// Achievements...again?
	checkAchievements();
	
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

initAudio();
initStage();
initCircles();
requestAnimationFrame(step);