// Adapted from https://robert-reese.squarespace.com/blog/hexagonjs
// Hex math defined here: http://blog.ruslans.com/2011/02/hexagonal-grid-math.html

function HexagonGrid(canvasId, radius) {
    this.radius = radius;

    this.height = Math.sqrt(3) * radius;
    this.width = 2 * radius;
    this.side = (3 / 2) * radius;

    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext('2d');

    this.canvasOriginX = 0;
    this.canvasOriginY = 0;
    
    this.canvas.addEventListener("mousedown", this.clickEvent.bind(this), false);

    this.clicks = []; // Keep track of number of clicks for each hexagon
};

// Finds hexagon by row and column number
HexagonGrid.prototype.findHexByID = function(idX, idY) {
    var hex = undefined;
    for (var i = 0; i < this.clicks.length; i++) {
        if (this.clicks[i].idX === idX && this.clicks[i].idY === idY) {
            hex = this.clicks[i];
            break;
        }
    }
    return hex;
}

HexagonGrid.prototype.drawHexGrid = function (rows, cols, originX, originY, isDebug) {
    this.canvasOriginX = originX;
    this.canvasOriginY = originY;
    
    var currentHexX;
    var currentHexY;
    var debugText = "";

    var offsetColumn = false;

    var numClicks = 0;

    for (var col = 0; col < cols; col++) {
        for (var row = 0; row < rows; row++) {

            if (!offsetColumn) {
                currentHexX = (col * this.side) + originX;
                currentHexY = (row * this.height) + originY;
            } else {
                currentHexX = col * this.side + originX;
                currentHexY = (row * this.height) + originY + (this.height * 0.5);
            }

            this.clicks.push({idX: col, idY: row, numClicks: numClicks});

            if (isDebug) {
                debugText = col + "," + row;
            }

            this.drawHex(currentHexX, currentHexY, "#bfbfff", debugText);
        }
        offsetColumn = !offsetColumn;
    }
};

HexagonGrid.prototype.drawHexAtColRow = function(column, row, color) {
    var drawy = column % 2 == 0 ? (row * this.height) + this.canvasOriginY : (row * this.height) + this.canvasOriginY + (this.height / 2);
    var drawx = (column * this.side) + this.canvasOriginX;

    this.drawHex(drawx, drawy, color, "");
};

HexagonGrid.prototype.drawHex = function(x0, y0, fillColor, debugText) {
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    this.context.moveTo(x0 + this.width - this.side, y0);
    this.context.lineTo(x0 + this.side, y0);
    this.context.lineTo(x0 + this.width, y0 + (this.height / 2));
    this.context.lineTo(x0 + this.side, y0 + this.height);
    this.context.lineTo(x0 + this.width - this.side, y0 + this.height);
    this.context.lineTo(x0, y0 + (this.height / 2));

    if (fillColor) {
        this.context.fillStyle = fillColor;
        this.context.fill();
    }

    this.context.closePath();
    this.context.stroke();

    if (debugText) {
        this.context.font = "5px";
        this.context.fillStyle = "#000";
        this.context.fillText(debugText, x0 + (this.width / 2) - (this.width/4), y0 + (this.height - 5));
    }
};

//Recusivly step up to the body to calculate canvas offset.
HexagonGrid.prototype.getRelativeCanvasOffset = function() {
  var x = 0, y = 0;
  var layoutElement = this.canvas;
    if (layoutElement.offsetParent) {
        do {
            x += layoutElement.offsetLeft;
            y += layoutElement.offsetTop;
        } while (layoutElement = layoutElement.offsetParent);
        
        return { x: x, y: y };
    }
}

//Uses a grid overlay algorithm to determine hexagon location
//Left edge of grid has a test to accurately determine correct hex
HexagonGrid.prototype.getSelectedTile = function(mouseX, mouseY) {

  var offSet = this.getRelativeCanvasOffset();

    mouseX -= offSet.x;
    mouseY -= offSet.y;

    var column = Math.floor((mouseX) / this.side);
    var row = Math.floor(
        column % 2 == 0
            ? Math.floor((mouseY) / this.height)
            : Math.floor(((mouseY + (this.height * 0.5)) / this.height)) - 1);


    //Test if on left side of frame            
    if (mouseX > (column * this.side) && mouseX < (column * this.side) + this.width - this.side) {


        //Now test which of the two triangles we are in 
        //Top left triangle points
        var p1 = new Object();
        p1.x = column * this.side;
        p1.y = column % 2 == 0
            ? row * this.height
            : (row * this.height) + (this.height / 2);

        var p2 = new Object();
        p2.x = p1.x;
        p2.y = p1.y + (this.height / 2);

        var p3 = new Object();
        p3.x = p1.x + this.width - this.side;
        p3.y = p1.y;

        var mousePoint = new Object();
        mousePoint.x = mouseX;
        mousePoint.y = mouseY;

        if (this.isPointInTriangle(mousePoint, p1, p2, p3)) {
            column--;

            if (column % 2 != 0) {
                row--;
            }
        }

        //Bottom left triangle points
        var p4 = new Object();
        p4 = p2;

        var p5 = new Object();
        p5.x = p4.x;
        p5.y = p4.y + (this.height / 2);

        var p6 = new Object();
        p6.x = p5.x + (this.width - this.side);
        p6.y = p5.y;

        if (this.isPointInTriangle(mousePoint, p4, p5, p6)) {
            column--;

            if (column % 2 == 0) {
                row++;
            }
        }
    }

    // Increment number of clicks
    var hex = this.findHexByID(column, row);
    if (hex === undefined) return undefined;
    hex.numClicks += 1;

    return  { row: row, column: column, clicks: hex.numClicks };
};

// Get surrounding tiles
HexagonGrid.prototype.getSurroundingTiles = function(mouseX, mouseY) {

  var offSet = this.getRelativeCanvasOffset();

    mouseX -= offSet.x;
    mouseY -= offSet.y;

    var column = Math.floor((mouseX) / this.side);
    var row = Math.floor(
        column % 2 == 0
            ? Math.floor((mouseY) / this.height)
            : Math.floor(((mouseY + (this.height * 0.5)) / this.height)) - 1);


    //Test if on left side of frame            
    if (mouseX > (column * this.side) && mouseX < (column * this.side) + this.width - this.side) {


        //Now test which of the two triangles we are in 
        //Top left triangle points
        var p1 = new Object();
        p1.x = column * this.side;
        p1.y = column % 2 == 0
            ? row * this.height
            : (row * this.height) + (this.height / 2);

        var p2 = new Object();
        p2.x = p1.x;
        p2.y = p1.y + (this.height / 2);

        var p3 = new Object();
        p3.x = p1.x + this.width - this.side;
        p3.y = p1.y;

        var mousePoint = new Object();
        mousePoint.x = mouseX;
        mousePoint.y = mouseY;

        if (this.isPointInTriangle(mousePoint, p1, p2, p3)) {
            column--;

            if (column % 2 != 0) {
                row--;
            }
        }

        // Bottom left triangle points
        var p4 = new Object();
        p4 = p2;

        var p5 = new Object();
        p5.x = p4.x;
        p5.y = p4.y + (this.height / 2);

        var p6 = new Object();
        p6.x = p5.x + (this.width - this.side);
        p6.y = p5.y;

        if (this.isPointInTriangle(mousePoint, p4, p5, p6)) {
            column--;

            if (column % 2 == 0) {
                row++;
            }
        }
    }

    // Get surrounding tile positions
    var pos = [];
    if (column % 2 === 0 && row % 2 === 0) {
        pos.push({row: row - 1, column: column    });
        pos.push({row: row -1 , column: column + 1});
        pos.push({row: row    , column: column + 1});
        pos.push({row: row + 1, column: column    });
        pos.push({row: row    , column: column - 1});
        pos.push({row: row - 1, column: column - 1});
    } else if (column % 2 !== 0 && row % 2 !== 0) {
        pos.push({row: row - 1, column: column    });
        pos.push({row: row    , column: column + 1});
        pos.push({row: row + 1, column: column + 1});
        pos.push({row: row + 1, column: column    });
        pos.push({row: row + 1, column: column - 1});
        pos.push({row: row    , column: column - 1});
    } else if (column % 2 !== 0 && row % 2 == 0) {
        pos.push({row: row - 1, column: column    });
        pos.push({row: row    , column: column + 1});
        pos.push({row: row + 1, column: column + 1});
        pos.push({row: row + 1, column: column    });
        pos.push({row: row + 1, column: column - 1});
        pos.push({row: row    , column: column - 1});
    } else {
        pos.push({row: row - 1, column: column    });
        pos.push({row: row - 1, column: column + 1});
        pos.push({row: row    , column: column + 1});
        pos.push({row: row + 1, column: column    });
        pos.push({row: row    , column: column - 1});
        pos.push({row: row - 1, column: column - 1});
    }
    
    var surroundingTiles = [];
    for (var i = 0; i < pos.length; i++) {
        var hex = this.findHexByID(pos[i].column, pos[i].row);
        hex.numClicks += 1;
        if (hex !== undefined) {
            surroundingTiles.push({row: hex.idY, column: hex.idX, clicks: hex.numClicks});
        }
    }
    return surroundingTiles;
};


HexagonGrid.prototype.sign = function(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};

//TODO: Replace with optimized barycentric coordinate method
HexagonGrid.prototype.isPointInTriangle = function isPointInTriangle(pt, v1, v2, v3) {
    var b1, b2, b3;

    b1 = this.sign(pt, v1, v2) < 0.0;
    b2 = this.sign(pt, v2, v3) < 0.0;
    b3 = this.sign(pt, v3, v1) < 0.0;

    return ((b1 == b2) && (b2 == b3));
};

HexagonGrid.prototype.clickEvent = function (e) {
    var mouseX = e.pageX;
    var mouseY = e.pageY;

    var localX = mouseX - this.canvasOriginX;
    var localY = mouseY - this.canvasOriginY;

    var tile = this.getSelectedTile(localX, localY);
    if (tile.column >= 0 && tile.row >= 0) {
        var drawy = tile.column % 2 == 0 ? (tile.row * this.height) + this.canvasOriginY + 6 : (tile.row * this.height) + this.canvasOriginY + 6 + (this.height / 2);
        var drawx = (tile.column * this.side) + this.canvasOriginX;

        var color = this.getColor(tile.clicks);
        this.drawHex(drawx, drawy - 6, color, "");

         // Get surrounding tiles
         var surroundingTiles = this.getSurroundingTiles(localX, localY);
         for (var i = 0; i < surroundingTiles.length; i++) {
            var sTile = surroundingTiles[i];
            if (sTile.column >= 0 && sTile.row >= 0) {
                var drawy = sTile.column % 2 == 0 ? (sTile.row * this.height) + this.canvasOriginY + 6 : (sTile.row * this.height) + this.canvasOriginY + 6 + (this.height / 2);
                var drawx = (sTile.column * this.side) + this.canvasOriginX;

                this.drawHex(drawx, drawy - 6, "rgba(0,0,0,0.05)", "");
            }
        }
    } 
};

HexagonGrid.prototype.getColor = function(clicks) {
    if (clicks % 6 === 1) {
        return "rgba(255,0,0,0.5)";
    } else if (clicks % 6 === 2) {
        return "rgba(255,165,0,0.5";
    } else if (clicks % 6 === 3) {
        return "rgba(255,255,0,0.5";
    } else if (clicks % 6 === 4) {
        return "rgba(0,255,0,0.5";
    } else if (clicks % 6 === 5) {
        return "rgba(0,0,255,0.5";
    } else if (clicks % 6 === 0) {
        return "rgba(255,0,255,0.5";
    } else {
        // do nothing
    }
};