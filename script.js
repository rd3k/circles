// combine:
// - bejewelled
// - dots

var stage;
var context;
var scoreEl = document.querySelector('#score');
var drawEl = document.querySelector('#draws');

var Colour = {};
Colour[Colour['0'] = 'White']  = 0;
Colour[Colour['1'] = 'Black']  = 1;
Colour[Colour['2'] = 'Red']    = 2;
Colour[Colour['3'] = 'Green']  = 3;
Colour[Colour['4'] = 'Blue']   = 4;
Colour[Colour['5'] = 'Yellow'] = 5;
Colour[Colour['7'] = 'Grey']   = 7;

var COLS = 6;
var ROWS = 6;
var WESTGAP = 30;
var NORTHGAP = 30;

var BACKGROUND = Colour.White;

var XYONLY = true;

var mouse = {
	x: 0,
	y: 0,
	down: false
};

var score = 0;
var draws = 0;

function initAudio () {

	audioContext = null;
	try {
		audioContext = new webkitAudioContext();
	}
	catch ( e ) {}

}

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

window.requestAnimationFrame = requestAnimationFrame;                       

function Achievement (name, description, need) {
	this.name = name;
	this.description = description;
	this.need = need;
}

var achievements = [
	new Achievement('Test', 'Just a test!', function(){
		
	})
];

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
	var lastX, lastY;
	stage.addEventListener('mousedown', function (e) {
		var x = e.offsetX, y = e.offsetY;
		mouse.x = x;
		mouse.y = y;
		var x2, y2;
		mouse.down = true;
		x = snapToGrip(x, 30);
		y = snapToGrip(y, 30);
		if (x === null || y === null) {
			// ?
		} else {
			x2 = x - WESTGAP;
			y2 = y - NORTHGAP;
			x2 /= 30;
			y2 /= 30;
			if (x2 >= 0 && x2 < COLS && y2 >= 0 && y2 < ROWS) {
				lastX = x2;
				lastY = y2;
				points.push(new Point(x, y));
				//circles[x2][y2].colour = Colour.Yellow;
				hitCircles.push(circles[x2][y2]);
				tracingColour = circles[x2][y2].colour;
			}
		}
	});
	stage.addEventListener('mouseup', function () {
		mouse.down = false;
		// Find out whether any squares were created
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
			if (x2 === null || y2 === null) {
				// ?
			} else {
				x3 = x2 - WESTGAP;
				y3 = y2 - NORTHGAP;
				x3 /= 30;
				y3 /= 30;
				
				// Has to be between circles of the same colour
				if (circles[x3][y3].colour !== tracingColour) {
					return;
				}
				
				if (x3 >= 0 && x3 < COLS && 
					y3 >= 0 && y3 < ROWS &&
					(
						( !XYONLY && 
							Math.abs(lastX - x3) === 1 && Math.abs(lastY - y3) === 1
						) ||
						( XYONLY && 
							( Math.abs(lastX - x3) === 1 && lastY === y3 ) || 
							( Math.abs(lastY - y3) === 1 && lastX === x3 )
						)
					)
				) {
				
					for (var i = 0, l = hitCircles.length; i < l; i++) {
						if (hitCircles[i] === circles[x3][y3]) {
							console.log('loop');
							break;
						}
					}
				
					//circles[x3][y3].colour = Colour.Yellow;
					points.push(new Point(x2, y2));
					hitCircles.push(circles[x3][y3]);
					lastX = x3;
					lastY = y3;
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

	// Make circles to clear white
	for (var i = 0, l = hitCircles.length; i < l; i++) {
		hitCircles[i].colour = Colour.White;
	}
	
	// Apply gravity
	gravity();
	
	// Score
	givePoints(hitCircles.length);
	
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

initStage();
initCircles();
requestAnimationFrame(step);