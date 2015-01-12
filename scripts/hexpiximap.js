
var Cell = require('./hexpixicell.js');
var pixiHelpers = require('./pixihelpers.js');
var PIXI = require('pixi.js');

// There are four basic coordinate systems based on http://www.redblobgames.com/grids/hexagons/
hp.CoordinateSystems = [
    { name: "odd-q", isFlatTop: true, isOdd: true },
    { name: "even-q", isFlatTop: true, isOdd: false },
    { name: "odd-r", isFlatTop: false, isOdd: true },
    { name: "even-r", isFlatTop: false, isOdd: false }];

// Scene graph heirarchy = pixiState -> container -> hexes
hp.Map = function (pixiStage, options) {
    var defaultOptions = {
        // The HexPixi.CoordinateSystems index to use for the map.
        coordinateSystem: 1,
        // The map's number of cells across (cell column count).
        mapWidth: 10,
        // The map's number of cells high (cell row count).
        mapHeight: 10,
        // The radius of the hex. Ignored if hexWidth and hexHeight are set to non-null.
        hexSize: 40,
        // The pixel width of a hex.
        hexWidth: null,
        // The pixel height of a hex.
        hexHeight: null,
        // The color to use when drawing hex outlines.
        hexLineColor: 0x909090,
        // The width in pixels of the hex outline.
        hexLineWidth: 2,
        // If true then the hex's coordinates will be visible on the hex.
        showCoordinates: false,
        // Callback function (cell) that handles a hex being clicked on or tapped.
        onHexClick: null,
        // Specify the types of terrain available on the map. Map cells reference these terrain
        // types by index. Add custom properties to extend functionality.
        terrainTypes: [{ name: "empty", color: 0xffffff, isEmpty: true }],
        // Array of strings that specify the url of a texture. Can be referenced by index in terrainType.
        textures: [],
        // This is the pixel height specifying an area of overlap for hex cells. Necessary when
        // working with isometric view art systems.
        hexBottomPad: 0,
        onAssetsLoaded: function(){}
    };

    self.textures = [];
    self.hexes = new PIXI.Graphics();
    self.container = new PIXI.DisplayObjectContainer();
    self.pixiStage = null;
    self.options = null;
    self.cells = [];
    self.cellHighlighter = null;
    self.inCellCount = 0;
    self.hexAxis = { x: 0, y: 0 };
    self.aspectRatio = 1;


    this.init(options);
};

hp.Map.prototype.setCellTerrainType = function (cell, terrainIndex) {
    cell.terrainIndex = terrainIndex;
    this.createSceneGraph();
};

// Creates a hex shaped polygon that is used for the hex's hit area.
hp.Map.prototype.createHexPoly = function () {
    var i = 0,
        cs = hp.CoordinateSystems[this.options.coordinateSystem],
        offset = cs.isFlatTop ? 0 : 0.5,
        angle = 2 * Math.PI / 6 * offset,
        center = { x: this.hexAxis.x / 2, y: this.hexAxis.y / 2 },
        x = center.x * Math.cos(angle),
        y = center.y * Math.sin(angle),
        points = [];

    points.push(new PIXI.Point(x, y));

    for (i = 1; i < 7; i++) {
        angle = 2 * Math.PI / 6 * (i + offset);
        x = center.x * Math.cos(angle);
        y = center.y * Math.sin(angle);

        points.push(new PIXI.Point(x, y));
    }

    console.log(points);

    return new PIXI.Polygon(points);
};

// Creates a drawn hex while ignoring the cell's position. A new PIXI.Graphics object is created
// and used to draw and (possibly) fill in the hex. The PIXI.Graphics is returned to the caller.
hp.Map.prototype.createDrawHex_internal = function (cell, hasOutline, hasFill) {
    var graphics = new PIXI.Graphics(),
        i = 0,
        cs = hp.CoordinateSystems[this.options.coordinateSystem],
        color = this.options.terrainTypes[cell.terrainIndex].color ? this.options.terrainTypes[cell.terrainIndex].color : 0xffffff;

    if (cell.poly === null) {
        console.log("Cell's poly must first be defined by calling createHexPoly");
        return null;
    }

    if (hasOutline === false) {
        // If this is for masking then we don't need the line itself. Just the poly filled.
        graphics.lineStyle(0, 0, 1);
    } else {
        graphics.lineStyle(this.options.hexLineWidth, this.options.hexLineColor, 1);
    }

    if (hasFill !== false) {
        graphics.beginFill(color, 1);
    }

    graphics.moveTo(cell.poly.points[i], cell.poly.points[i+1]);

    for (i = 2; i < cell.poly.points.length; i += 2) {
        graphics.lineTo(cell.poly.points[i], cell.poly.points[i+1]);
    }

    if (hasFill !== false) {
        graphics.endFill();
    }

    return graphics;
};

// Used for manually drawing a hex cell. Creates the filled in hex, creates the outline (if there is one)
// and then wraps them in a PIXI.DisplayObjectContainer.
hp.Map.prototype.createDrawnHex = function (cell) {
    var parentContainer = new PIXI.DisplayObjectContainer();

    cell.inner = this.createDrawHex_internal(cell, false, true);
    parentContainer.addChild(cell.inner);

    if (this.options.hexLineWidth > 0) {
        cell.outline = this.createDrawHex_internal(cell, true, false);
        parentContainer.addChild(cell.outline);
    }

    parentContainer.position.x = cell.center.x;
    parentContainer.position.y = cell.center.y;

    return parentContainer;
};

// Use for creating a hex cell with a textured background. First creates a PIXI.Graphics of the hex shape.
// Next creates a PIXI.Sprite and uses the PIXI.Graphics hex as a mask. Masked PIXI.Sprite is added to parent
// PIXI.DisplayObjectContainer. Hex outline (if there is one) is created and added to parent container.
// Parent container is returned.
hp.Map.prototype.createTexturedHex = function (cell) {
    var sprite = new PIXI.Sprite(this.textures[this.options.terrainTypes[cell.terrainIndex].textureIndex]),
        cs = hp.CoordinateSystems[this.options.coordinateSystem],
        parentContainer = new PIXI.DisplayObjectContainer(),
        mask = null;

    // Get the display object for the hex shape
    mask = this.createDrawHex_internal(cell, false, true);

    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.width = this.options.hexWidth;
    sprite.height = this.options.hexHeight;
    parentContainer.addChild(mask);
    sprite.mask = mask;
    parentContainer.addChild(sprite);

    cell.inner = sprite;

    if (this.options.hexLineWidth > 0) {
        cell.outline = this.createDrawHex_internal(cell, true, false);
        parentContainer.addChild(cell.outline);
    }

    parentContainer.position.x = cell.center.x;
    parentContainer.position.y = cell.center.y;

    return parentContainer;
};

// Use for creating a hex cell with a textured background that stands on it's own. The hex outline will
// bee added if options.hexLineWidth is greater than 0. Parent container is returned.
hp.Map.prototype.createTileHex = function (cell) {
    var sprite = new PIXI.Sprite(this.textures[this.options.terrainTypes[cell.terrainIndex].tileIndex]),
        cs = hp.CoordinateSystems[this.options.coordinateSystem],
        parentContainer = new PIXI.DisplayObjectContainer(),
        mask = null,
        topPercent = 0.5;

    sprite.width = this.options.hexWidth;
    sprite.height = this.options.hexHeight + this.options.hexBottomPad;

    topPercent = this.options.hexHeight / sprite.height;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = topPercent / 2;

    parentContainer.addChild(sprite);

    cell.inner = sprite;

    if (this.options.hexLineWidth > 0) {
        cell.outline = this.createDrawHex_internal(cell, true, false);
        parentContainer.addChild(cell.outline);
    }

    parentContainer.position.x = cell.center.x;
    parentContainer.position.y = cell.center.y;

    return parentContainer;
};

hp.Map.prototype.createEmptyHex = function (cell) {
    var parentContainer = new PIXI.DisplayObjectContainer();

    cell.inner = null;

    if (this.options.hexLineWidth > 0) {
        cell.outline = this.createDrawHex_internal(cell, true, false);
        parentContainer.addChild(cell.outline);
    }

    parentContainer.position.x = cell.center.x;
    parentContainer.position.y = cell.center.y;

    return parentContainer;
};

// Calculates and returns the width of a hex cell.
hp.Map.prototype.getHexWidth = function () {
    var result = null,
        cs = hp.CoordinateSystems[this.options.coordinateSystem];
    result = this.options.hexSize * 2;
    if (cs.isFlatTop === false) {
        result = Math.sqrt(3) / 2 * result;
    }

    return result;
};

// Calculates and returns the height of a hex cell.
hp.Map.prototype.getHexHeight = function () {
    var result = null,
        cs = hp.CoordinateSystems[this.options.coordinateSystem];
    result = this.options.hexSize * 2;
    if (cs.isFlatTop === true) {
        result = Math.sqrt(3) / 2 * result;
    }

    return result;
};

// Calculate the center of a cell based on column, row and coordinate system.
hp.Map.prototype.getCellCenter = function (column, row, coordinateSystem) {
    var incX = 0.75 * this.options.hexWidth,
        incY = this.options.hexHeight,
        cs = hp.CoordinateSystems[coordinateSystem],
        center = { x: 0, y: 0 },
        offset = (cs.isOdd) ? 0 : 1;

    if (cs.isFlatTop) {
        center.x = (column * incX) + (this.options.hexWidth / 2);
        if ((column + offset) % 2) {
            // even
            center.y = (row * incY) + (incY / 2);
        } else {
            // odd
            center.y = (row * incY) + incY;
        }
    } else {
        incX = this.options.hexWidth;
        incY = (0.75 * this.options.hexHeight);
        center.y = (row * incY) + (this.options.hexHeight / 2);
        offset = (cs.isOdd) ? 1 : 0;
        if ((row + offset) % 2) {
            // even
            center.x = (column * incX) + (this.options.hexWidth / 2);
        } else {
            // odd
            center.x = (column * incX) + this.options.hexWidth;
        }
    }

    //center.y -= this.options.hexBottomPad;

    return center;
};

// Takes a cell and creates all the graphics to display it.
hp.Map.prototype.createCell = function(cell) {
    cell.center = this.getCellCenter(cell.column, cell.row, self.options.coordinateSystem);

    // Generate poly first then use poly to draw hex and create masks and all that.
    cell.poly = this.createHexPoly();

    if (this.options.showCoordinates) {
        cell.text = new PIXI.Text("1", { font: "10px Arial", fill: "black", dropShadow: "true", dropShadowDistance: 1, dropShadowColor: "white" });
        cell.text.setText(cell.column.toString() + ", " + cell.row.toString());
        cell.text.position.x = -Math.round((cell.text.width / 2));
        cell.text.position.y = 8 - Math.round(this.options.hexHeight / 2);
    }

    // Create the hex or textured hex
    var hex = null;
    if (this.options.terrainTypes[cell.terrainIndex].isEmpty === true) {
        hex = this.createEmptyHex(cell);
    } else if (this.options.terrainTypes[cell.terrainIndex].textureIndex >= 0) {
        hex = this.createTexturedHex(cell);
    } else if (this.options.terrainTypes[cell.terrainIndex].tileIndex >= 0) {
        hex = this.createTileHex(cell);
    } else {
        hex = this.createDrawnHex(cell);
    }

    // Text is a child of the display object container containing the hex.
    if (this.options.showCoordinates) {
        hex.addChild(cell.text);
    }

    // Set a property on the hex that references the cell.
    hex.p_cell = cell;
    hex.p_cell.hex = hex;

    return hex;
};

// A wrapper for createCell that adds interactivity to the individual cells.
hp.Map.prototype.createInteractiveCell = function (cell) {
    var hex = this.createCell(cell);
    hex.hitArea = cell.poly;
    hex.interactive = true;
    var _this = this;

    // set the mouseover callback..
    hex.mouseover = function (data) {
        var cell = data.target.p_cell;
        _this.cellHighlighter.position.x = cell.center.x;
        _this.cellHighlighter.position.y = cell.center.y;

        if (_this.inCellCount === 0) {
            _this.hexes.addChild(_this.cellHighlighter);
        }

        if (cell.isOver !== true) {
            cell.isOver = true;
            _this.inCellCount++;
        }
    };

    // set the mouseout callback..
    hex.mouseout = function (data) {
        var cell = data.target.p_cell;
        if (cell.isOver === true) {
            _this.inCellCount--;

            if (_this.inCellCount === 0) {
                _this.hexes.removeChild(_this.cellHighlighter);
            }

            cell.isOver = false;
        }
    };

    hex.click = function (data) {
        if (_this.options.onHexClick) {
            _this.options.onHexClick(data.target.p_cell);
        }
    };

    hex.tap = function (data) {
        if (_this.options.onHexClick) {
            _this.options.onHexClick(data.target.p_cell);
        }
    };

    return hex;
};

// Loads all the textures specified in options.
hp.Map.prototype.loadTextures = function() {
    this.textures = [];

    if (this.options.textures.length) {
        // create a new loader
        var loader = new PIXI.AssetLoader(this.options.textures, true);

        // use callback
        loader.onComplete = this.options.onAssetsLoaded;

        //begin load
        loader.load();

        for (var i = 0; i < this.options.textures.length; i++) {
            this.textures.push(new PIXI.Texture.fromImage(this.options.textures[i]));
        }
    } else {
        // No assets to load so just call onAssetsLoaded function to notify game that we are done.
        if(this.options.onAssetsLoaded)
            this.options.onAssetsLoaded();
    }
};

// Clears out all objects from self.hexes.children.
hp.Map.prototype.clearHexes = function () {
    while (this.hexes.children.length) {
        this.hexes.removeChild(this.hexes.children[0]);
    }
};

// Resets the entire map without destroying the HexPixi.Map instance.
hp.Map.prototype.reset = function (options) {
    while (this.cells.length > 0) {
        while (this.cells[0].length > 0) {
            this.cells[0].splice(0, 1);
        }
        this.cells.splice(0, 1);
    }

    clearHexes();

    while (this.container.children.length > 0) {
        this.container.removeChildAt(0);
    }

    this.pixiStage.removeChild(this.container);

    if (this.cellHighlighter) {
        this.cellHighlighter = null;
    }

    init(options);
};

// Clears the scene graph and recreates it from self.cells.
hp.Map.prototype.createSceneGraph = function() {
    var cell = null,
        row = null,
        rowIndex = 0,
        colIndex = 0;

    clearHexes();
    while (rowIndex < hp.Map.prototype..cells.length) {
        row = hp.Map.prototype..cells[rowIndex];
        colIndex = 0;
        while (colIndex < row.length) {
            cell = row[colIndex];
            hp.Map.prototype..hexes.addChild(this.createInteractiveCell(cell));
            colIndex++;
        }
        rowIndex++;
    }
};

hp.Map.prototype.generateRandomMap = function () {
    var column, rnd, cell;
    for (var row = 0; row < this.options.mapHeight; row++) {
        this.cells.push([]);
        for (column = 0; column < this.options.mapWidth; column += 2) {
            rnd = Math.floor((Math.random() * this.options.terrainTypes.length));
            cell = new Cell(row, column, rnd);
            this.cells[cell.row].push(cell);
        }
        for (column = 1; column < this.options.mapWidth; column+=2) {
            rnd = Math.floor((Math.random() * this.options.terrainTypes.length));
            cell = new Cell(row, column, rnd);
            this.cells[cell.row].push(cell);
        }
    }
    this.createSceneGraph();
};

hp.Map.prototype.generateBlankMap = function () {
    var column, cell;
    for (var row = 0; row < this.options.mapHeight; row++) {
        this.cells.push([]);
        for (column = 0; column < this.options.mapWidth; column+=2) {
            cell = new Cell(row, column, 0);
            this.cells[cell.row].push(cell);
        }
        for (column = 1; column < this.options.mapWidth; column+=2) {
            cell = new Cell(row, column, 0);
            this.cells[cell.row].push(cell);
        }
    }
    this.createSceneGraph();
};

hp.Map.prototype.init = function(options) {
    this.options = extend(defaultOptions, options);

    // If we are overiding the top-down view method then need to force some settings
    if (this.options.hexWidth && this.options.hexHeight) {
        var cs = hp.CoordinateSystems[this.options.coordinateSystem];
        this.options.hexSize = this.options.hexWidth / 2;
        this.aspectRatio = this.options.hexHeight / this.options.hexWidth;
        this.hexAxis.x = cs.isFlatTop ? this.options.hexWidth : ((1 - (Math.sqrt(3) / 2)) * this.options.hexWidth) + this.options.hexWidth;
        this.hexAxis.y = cs.isFlatTop ? ((1 - (Math.sqrt(3) / 2)) * this.options.hexHeight) + this.options.hexHeight : this.options.hexHeight;
    } else {
        this.aspectRatio = 1;
        this.options.hexWidth = this.getHexWidth();
        this.options.hexHeight = this.getHexHeight();
        this.hexAxis.x = this.options.hexSize * 2;
        this.hexAxis.y = this.options.hexSize * 2;
    }

    if (this.pixiStage === null) {
        this.pixiStage = pixiStage;
    }

    this.container.addChild(this.hexes);
    this.pixiStage.addChild(this.container);
    this.hexes.clear();
    loadTextures();

    // Setup cell hilighter
    var cell = new Cell(0, 0, 0);

    cell.poly = this.createHexPoly();
    var chg = this.createDrawHex_internal(cell, true, false);
    if (chg) {
        pixiHelpers.updateLineStyle.call(chg, 3, 0xff5521);
        this.cellHighlighter = new PIXI.DisplayObjectContainer();
        this.cellHighlighter.addChild(chg);
    } else {
        console.log("Error creating cell hilighter");
    }
};

function extend (obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
        if (source) {
            for (var prop in source) {
                if (source[prop].constructor === Object) {
                    if (!obj[prop] || obj[prop].constructor === Object) {
                        obj[prop] = obj[prop] || {};
                        this.extend(obj[prop], source[prop]);
                    } else {
                        obj[prop] = source[prop];
                    }
                } else {
                    obj[prop] = source[prop];
                }
            }
        }
    });
    return obj;
}
