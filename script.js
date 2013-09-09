// combine:
// - bejewelled
// - dots

var stage;
var context;

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

function deg2rad (deg) {
	return (deg * Math.PI) / 180;
}

function clear () {
	context.clearRect(0, 0, stage.width, stage.height);
}

function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Circle() {
	this.position = new Point(0, 0);
	this.colour = Colour.Grey;
}

var circles = [];
var points = [];

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
	for (var i=0; i<COLS; i++) {
		circles[i] = new Array(ROWS);
	}
	
	// Populare circle array
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			circles[x][y] = new Circle(); 
		}
	}

}

function initStage () {
	stage = document.querySelector('#game');
	stage.setAttribute('width', 210);
	stage.setAttribute('height', 210 );
	context = stage.getContext('2d');
	var mouseDown = false;
	var lastX, lastY;
	stage.addEventListener('mousedown', function (e) {
		var x = e.offsetX, y = e.offsetY;
		mouseDown = true;
		x = snapToGrip(x, 30);
		y = snapToGrip(y, 30);
		if (x === null || y === null) {
			// ?
		} else {
			points.push(new Point(x, y));
			lastX = x;
			lastY = y;
			x -= WESTGAP;
			y -= NORTHGAP;
			x /= 30;
			y /= 30;
			if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
				circles[x][y].colour = Colour.Yellow;
			}
		}
	});
	stage.addEventListener('mouseup', function () {
		mouseDown = false;
		points = [];
	});
	stage.addEventListener('mousemove', function (e) {
		if (mouseDown) {
			var x = e.offsetX,
				y = e.offsetY,
				x2, y2;
			x2 = snapToGrip(x, 30);
			y2 = snapToGrip(y, 30);
			if (x2 === null || y2 === null) {
				// ?
			} else {
				x2 -= WESTGAP;
				y2 -= NORTHGAP;
				x2 /= 30;
				y2 /= 30;
				if (x2 >= 0 && x2 < COLS && y2 >= 0 && y2 < ROWS && (lastX != x2 || lastY != y2)) {
					circles[x2][y2].colour = Colour.Yellow;
					points.push(new Point(x, y));
					lastX = x2;
					lastY = y2;
				}
			}
		}
	});
}

function drawStage () {
	context.fillStyle = Colour[Colour.White];
	context.fillRect(0, 0, stage.width, stage.height);
}

function drawDots () {
	context.lineWidth = 1;
	for (var x = 0; x < COLS; x++) {
		for (var y = 0; y < ROWS; y++) {
			context.fillStyle = Colour[circles[x][y].colour];
			context.beginPath();
			context.arc(30 + (x * 30), 30 + (y * 30), 5, 0, 2 * Math.PI, false);
			context.stroke();
			context.fill();
		}
	}
}

function drawPoints () {
	context.lineWidth = 3;
	context.beginPath();
	for (var i = 0, l = points.length; i < l; i ++) {
		if (i === 0) {
			context.moveTo(points[0].x, points[0].y);
		} else {
			context.lineTo(points[i].x, points[i].y);
		}
	}
	context.strokeStyle = Colour[Colour.Black];
    context.stroke();
}

function step (timestamp) {
	clear();
	// stuff
	drawStage();
	drawDots();
	drawPoints();
	requestAnimationFrame(step);
}

initStage();
initCircles();
requestAnimationFrame(step);