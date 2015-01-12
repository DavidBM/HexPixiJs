/// <reference path="../vend/pixi-addons.js" />
/// <reference path="vend/pixi.dev.js" />
/*
    HexPixi (alpha)
    Version 0.30
    by Mark Harmon 2014
    A free hex game library for pixijs.
    Released under MIT License.
    Please let me know about any games released using this library or derivative work.
*/

var PIXI = require('pixi.js');

var hp = {};
module.exports = exports = hp;

// There are four basic coordinate systems based on http://www.redblobgames.com/grids/hexagons/
hp.CoordinateSystems = [
    { name: "odd-q", isFlatTop: true, isOdd: true },
    { name: "even-q", isFlatTop: true, isOdd: false },
    { name: "odd-r", isFlatTop: false, isOdd: true },
    { name: "even-r", isFlatTop: false, isOdd: false }];


hp.Camera = function (amap) {
    var self = this,
        position = { x: 0, y: 0 },
        map = amap;

    function updateSceneGraph() {
    }

    self.position = function (x, y) {
        var result = position;

        if (x >= 0 && y >= 0) {
            position.x = x;
            position.y = y;
            updateSceneGraph();
        }

        return position;
    };
};

// The HexPixi.Cell object represents one map hex cell.
hp.Cell = function (rowNo, columnNo, terrainIndex) {
    var self = this;
    self.row = rowNo;
    self.column = columnNo;
    self.center = { x: 0, y: 0 };
    self.terrainIndex = terrainIndex ? terrainIndex : 0;
    self.poly = null; // The cell's poly that is used as a hit area.
    self.outline = null; // The PIXI.Graphics outline of the cell's hex.
    self.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner, otherwise a PIXI.Sprite.
    self.hex = null; // The parent container of the hex's graphics objects.
    self.isEmpty = null; // The cell is empty if set to true.

    self.resetGraphics = function () {
        self.terrainIndex = terrainIndex ? terrainIndex : 0;
        self.poly = null; // The cell's poly that is used as a hit area.
        self.outline = null; // The PIXI.Graphics outline of the cell's hex.
        self.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner.
        self.hex = null; // The parent container of the hex's graphics objects.
    };
};

// Scene graph heirarchy = pixiState -> container -> hexes
hp.Map = function (pixiStage, options) {
    var self = this,
        defaultOptions = {
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


    self.setCellTerrainType = function (cell, terrainIndex) {
        cell.terrainIndex = terrainIndex;
        createSceneGraph();
    };

    // Creates a hex shaped polygon that is used for the hex's hit area.
    function createHexPoly() {
        var i = 0,
            cs = hp.CoordinateSystems[self.options.coordinateSystem],
            offset = cs.isFlatTop ? 0 : 0.5,
            angle = 2 * Math.PI / 6 * offset,
            center = { x: self.hexAxis.x / 2, y: self.hexAxis.y / 2 },
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
    }

    // Creates a drawn hex while ignoring the cell's position. A new PIXI.Graphics object is created
    // and used to draw and (possibly) fill in the hex. The PIXI.Graphics is returned to the caller.
    function createDrawHex_internal(cell, hasOutline, hasFill) {
        var graphics = new PIXI.Graphics(),
            i = 0,
            cs = hp.CoordinateSystems[self.options.coordinateSystem],
            color = self.options.terrainTypes[cell.terrainIndex].color ? self.options.terrainTypes[cell.terrainIndex].color : 0xffffff;

        if (cell.poly === null) {
            console.log("Cell's poly must first be defined by calling createHexPoly");
            return null;
        }

        if (hasOutline === false) {
            // If this is for masking then we don't need the line itself. Just the poly filled.
            graphics.lineStyle(0, 0, 1);
        } else {
            graphics.lineStyle(self.options.hexLineWidth, self.options.hexLineColor, 1);
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
    }

    // Used for manually drawing a hex cell. Creates the filled in hex, creates the outline (if there is one)
    // and then wraps them in a PIXI.DisplayObjectContainer.
    self.createDrawnHex = function (cell) {
        var parentContainer = new PIXI.DisplayObjectContainer();

        cell.inner = createDrawHex_internal(cell, false, true);
        parentContainer.addChild(cell.inner);

        if (self.options.hexLineWidth > 0) {
            cell.outline = createDrawHex_internal(cell, true, false);
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
    function createTexturedHex(cell) {
        var sprite = new PIXI.Sprite(self.textures[self.options.terrainTypes[cell.terrainIndex].textureIndex]),
            cs = hp.CoordinateSystems[self.options.coordinateSystem],
            parentContainer = new PIXI.DisplayObjectContainer(),
            mask = null;

        // Get the display object for the hex shape
        mask = createDrawHex_internal(cell, false, true);

        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.width = self.options.hexWidth;
        sprite.height = self.options.hexHeight;
        parentContainer.addChild(mask);
        sprite.mask = mask;
        parentContainer.addChild(sprite);

        cell.inner = sprite;

        if (self.options.hexLineWidth > 0) {
            cell.outline = createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    // Use for creating a hex cell with a textured background that stands on it's own. The hex outline will
    // bee added if options.hexLineWidth is greater than 0. Parent container is returned.
    function createTileHex(cell) {
        var sprite = new PIXI.Sprite(self.textures[self.options.terrainTypes[cell.terrainIndex].tileIndex]),
            cs = hp.CoordinateSystems[self.options.coordinateSystem],
            parentContainer = new PIXI.DisplayObjectContainer(),
            mask = null,
            topPercent = 0.5;

        sprite.width = self.options.hexWidth;
        sprite.height = self.options.hexHeight + self.options.hexBottomPad;

        topPercent = self.options.hexHeight / sprite.height;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = topPercent / 2;

        parentContainer.addChild(sprite);

        cell.inner = sprite;

        if (self.options.hexLineWidth > 0) {
            cell.outline = createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    function createEmptyHex(cell) {
        var parentContainer = new PIXI.DisplayObjectContainer();

        cell.inner = null;

        if (self.options.hexLineWidth > 0) {
            cell.outline = createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    // Calculates and returns the width of a hex cell.
    function getHexWidth() {
        var result = null,
            cs = hp.CoordinateSystems[self.options.coordinateSystem];
        result = self.options.hexSize * 2;
        if (cs.isFlatTop === false) {
            result = Math.sqrt(3) / 2 * result;
        }

        return result;
    }

    // Calculates and returns the height of a hex cell.
    function getHexHeight() {
        var result = null,
            cs = hp.CoordinateSystems[self.options.coordinateSystem];
        result = self.options.hexSize * 2;
        if (cs.isFlatTop === true) {
            result = Math.sqrt(3) / 2 * result;
        }

        return result;
    }

    // Calculate the center of a cell based on column, row and coordinate system.
    function getCellCenter(column, row, coordinateSystem) {
        var incX = 0.75 * self.options.hexWidth,
            incY = self.options.hexHeight,
            cs = hp.CoordinateSystems[coordinateSystem],
            center = { x: 0, y: 0 },
            offset = (cs.isOdd) ? 0 : 1;

        if (cs.isFlatTop) {
            center.x = (column * incX) + (self.options.hexWidth / 2);
            if ((column + offset) % 2) {
                // even
                center.y = (row * incY) + (incY / 2);
            } else {
                // odd
                center.y = (row * incY) + incY;
            }
        } else {
            incX = self.options.hexWidth;
            incY = (0.75 * self.options.hexHeight);
            center.y = (row * incY) + (self.options.hexHeight / 2);
            offset = (cs.isOdd) ? 1 : 0;
            if ((row + offset) % 2) {
                // even
                center.x = (column * incX) + (self.options.hexWidth / 2);
            } else {
                // odd
                center.x = (column * incX) + self.options.hexWidth;
            }
        }

        //center.y -= self.options.hexBottomPad;

        return center;
    }

    // Takes a cell and creates all the graphics to display it.
    function createCell(cell) {
        cell.center = getCellCenter(cell.column, cell.row, self.options.coordinateSystem);

        // Generate poly first then use poly to draw hex and create masks and all that.
        cell.poly = createHexPoly();

        if (self.options.showCoordinates) {
            cell.text = new PIXI.Text("1", { font: "10px Arial", fill: "black", dropShadow: "true", dropShadowDistance: 1, dropShadowColor: "white" });
            cell.text.setText(cell.column.toString() + ", " + cell.row.toString());
            cell.text.position.x = -Math.round((cell.text.width / 2));
            cell.text.position.y = 8 - Math.round(self.options.hexHeight / 2);
        }

        // Create the hex or textured hex
        var hex = null;
        if (self.options.terrainTypes[cell.terrainIndex].isEmpty === true) {
            hex = createEmptyHex(cell);
        } else if (self.options.terrainTypes[cell.terrainIndex].textureIndex >= 0) {
            hex = createTexturedHex(cell);
        } else if (self.options.terrainTypes[cell.terrainIndex].tileIndex >= 0) {
            hex = createTileHex(cell);
        } else {
            hex = self.createDrawnHex(cell);
        }

        // Text is a child of the display object container containing the hex.
        if (self.options.showCoordinates) {
            hex.addChild(cell.text);
        }

        // Set a property on the hex that references the cell.
        hex.p_cell = cell;
        hex.p_cell.hex = hex;

        return hex;
    }

    // A wrapper for createCell that adds interactivity to the individual cells.
    function createInteractiveCell(cell) {
        var hex = createCell(cell);
        hex.hitArea = cell.poly;
        hex.interactive = true;

        // set the mouseover callback..
        hex.mouseover = function (data) {
            var cell = data.target.p_cell;
            self.cellHighlighter.position.x = cell.center.x;
            self.cellHighlighter.position.y = cell.center.y;

            if (self.inCellCount === 0) {
                self.hexes.addChild(self.cellHighlighter);
            }

            if (cell.isOver !== true) {
                cell.isOver = true;
                self.inCellCount++;
            }
        };

        // set the mouseout callback..
        hex.mouseout = function (data) {
            var cell = data.target.p_cell;
            if (cell.isOver === true) {
                self.inCellCount--;

                if (self.inCellCount == 0) {
                    self.hexes.removeChild(self.cellHighlighter);
                }

                cell.isOver = false;
            }
        };

        hex.click = function (data) {
            if (self.options.onHexClick) {
                self.options.onHexClick(data.target.p_cell);
            }
        };

        hex.tap = function (data) {
            if (self.options.onHexClick) {
                self.options.onHexClick(data.target.p_cell);
            }
        };

        return hex;
    }

    // Loads all the textures specified in options.
    function loadTextures() {
        self.textures = [];

        if (self.options.textures.length) {
            // create a new loader
            var loader = new PIXI.AssetLoader(self.options.textures, true);

            // use callback
            loader.onComplete = self.options.onAssetsLoaded;

            //begin load
            loader.load();

            for (var i = 0; i < self.options.textures.length; i++) {
                self.textures.push(new PIXI.Texture.fromImage(self.options.textures[i]));
            }
        } else {
            // No assets to load so just call onAssetsLoaded function to notify game that we are done.
            if(self.options.onAssetsLoaded)
                self.options.onAssetsLoaded();
        }
    }

    // Clears out all objects from self.hexes.children.
    function clearHexes() {
        while (self.hexes.children.length) {
            self.hexes.removeChild(self.hexes.children[0]);
        }
    }

    // Resets the entire map without destroying the HexPixi.Map instance.
    self.reset = function (options) {
        while (self.cells.length > 0) {
            while (self.cells[0].length > 0) {
                self.cells[0].splice(0, 1);
            }
            self.cells.splice(0, 1);
        }

        clearHexes();

        while (self.container.children.length > 0) {
            self.container.removeChildAt(0);
        }

        self.pixiStage.removeChild(self.container);

        if (self.cellHighlighter) {
            self.cellHighlighter = null;
        }

        init(options);
    };

    // Clears the scene graph and recreates it from self.cells.
    function createSceneGraph() {
        var cell = null,
            row = null,
            rowIndex = 0,
            colIndex = 0;

        clearHexes();
        while (rowIndex < self.cells.length) {
            row = self.cells[rowIndex];
            colIndex = 0;
            while (colIndex < row.length) {
                cell = row[colIndex];
                self.hexes.addChild(createInteractiveCell(cell));
                colIndex++;
            }
            rowIndex++;
        }
    }

    self.generateRandomMap = function () {
        var column, rnd, cell;
        for (var row = 0; row < self.options.mapHeight; row++) {
            self.cells.push([]);
            for (column = 0; column < self.options.mapWidth; column += 2) {
                rnd = Math.floor((Math.random() * self.options.terrainTypes.length));
                cell = new hp.Cell(row, column, rnd);
                self.cells[cell.row].push(cell);
            }
            for (column = 1; column < self.options.mapWidth; column+=2) {
                rnd = Math.floor((Math.random() * self.options.terrainTypes.length));
                cell = new hp.Cell(row, column, rnd);
                self.cells[cell.row].push(cell);
            }
        }
        createSceneGraph();
    };

    self.generateBlankMap = function () {
        var column, cell;
        for (var row = 0; row < self.options.mapHeight; row++) {
            self.cells.push([]);
            for (column = 0; column < self.options.mapWidth; column+=2) {
                cell = new hp.Cell(row, column, 0);
                self.cells[cell.row].push(cell);
            }
            for (column = 1; column < self.options.mapWidth; column+=2) {
                cell = new hp.Cell(row, column, 0);
                self.cells[cell.row].push(cell);
            }
        }
        createSceneGraph();
    };

    function extend(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function (source) {
            if (source) {
                for (var prop in source) {
                    if (source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            extend(obj[prop], source[prop]);
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

    function init(options) {
        self.options = extend(defaultOptions, options);

        // If we are overiding the top-down view method then need to force some settings
        if (self.options.hexWidth && self.options.hexHeight) {
            var cs = hp.CoordinateSystems[self.options.coordinateSystem];
            self.options.hexSize = self.options.hexWidth / 2;
            self.aspectRatio = self.options.hexHeight / self.options.hexWidth;
            self.hexAxis.x = cs.isFlatTop ? self.options.hexWidth : ((1 - (Math.sqrt(3) / 2)) * self.options.hexWidth) + self.options.hexWidth;
            self.hexAxis.y = cs.isFlatTop ? ((1 - (Math.sqrt(3) / 2)) * self.options.hexHeight) + self.options.hexHeight : self.options.hexHeight;
        } else {
            self.aspectRatio = 1;
            self.options.hexWidth = getHexWidth();
            self.options.hexHeight = getHexHeight();
            self.hexAxis.x = self.options.hexSize * 2;
            self.hexAxis.y = self.options.hexSize * 2;
        }

        if (self.pixiStage === null) {
            self.pixiStage = pixiStage;
        }

        self.container.addChild(self.hexes);
        self.pixiStage.addChild(self.container);
        self.hexes.clear();
        loadTextures();

        // Setup cell hilighter
        var cell = new hp.Cell(0, 0, 0);

        cell.poly = createHexPoly();
        var chg = createDrawHex_internal(cell, true, false);
        if (chg) {
            chg.updateLineStyle(3, 0xff5521);
            self.cellHighlighter = new PIXI.DisplayObjectContainer();
            self.cellHighlighter.addChild(chg);
        } else {
            console.log("Error creating cell hilighter");
        }
    }

    init(options);
};

PIXI.Graphics.prototype.updateLineStyle = function (lineWidth, color, alpha) {
    var len = this.graphicsData.length;
    for (var i = 0; i < len; i++) {
        var data = this.graphicsData[i];
        if (data.lineWidth && lineWidth) {
            data.lineWidth = lineWidth;
        }
        if (data.lineColor && color) {
            data.lineColor = color;
        }
        if (data.alpha && alpha) {
            data.alpha = alpha;
        }
        this.dirty = true;
        this.clearDirty = true;
    }
};

PIXI.Graphics.prototype.updateFillColor = function (fillColor, alpha) {
    var len = this.graphicsData.length;
    for (var i = 0; i < len; i++) {
        var data = this.graphicsData[i];
        if (data.fillColor && fillColor) {
            data.fillColor = fillColor;
        }
        if (data.alpha && alpha) {
            data.alpha = alpha;
        }
        this.dirty = true;
        this.clearDirty = true;
    }
};
