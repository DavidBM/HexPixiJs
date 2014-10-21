/// <reference path="../vend/pixi-addons.js" />
/// <reference path="vend/pixi.dev.js" />
/* 
    HexPixi
    Version 0.2 (work in progress)
    by Mark Harmon 2014
    A free hex game library for pixijs.
*/
(function (window, $) {
    'use strict';
    var hp = window.HexPixi = window.HexPixi || {};

    hp.CoordinateSystems = [
        { name: "odd-q", isFlatTop: true, isOdd: true },
        { name: "even-q", isFlatTop: true, isOdd: false },
        { name: "odd-r", isFlatTop: false, isOdd: true },
        { name: "even-r", isFlatTop: false, isOdd: false }];

    hp.Cell = function (rowNo, columnNo, terrainIndex) {
        var self = this;
        self.row = rowNo;
        self.column = columnNo;
        self.center = { x: 0, y: 0 };
        self.terrainIndex = terrainIndex ? terrainIndex : 0;
        self.poly = null; // The cell's poly that is used as a hit area.
        self.outline = null; // The PIXI.Graphics outline of the cell's hex.
        self.sprite = null; // If a textured cell then this is the PIXI.Sprite of the hex inner.
        self.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner.
        self.hex = null; // The parent container of the hex's graphic objects.

        self.resetGraphics = function () {
            self.terrainIndex = terrainIndex ? terrainIndex : 0;
            self.poly = null; // The cell's poly that is used as a hit area.
            self.outline = null; // The PIXI.Graphics outline of the cell's hex.
            self.sprite = null; // If a textured cell then this is the PIXI.Sprite of the hex inner.
            self.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner.
            self.hex = null; // The parent container of the hex's graphic objects.
        };
    };

    hp.Map = function (pixiStage, options) {
        var self = this,
            defaultOptions = {
                coordinateSystem: 1,
                mapWidth: 10,
                mapHeight: 10,
                hexSize: 40,
                hexLineColor: 0x909090,
                hexLineWidth: 2,
                showCoordinates: false,
                onHexClick: null,
                terrainTypes: [{ name: "empty", color: 0xffffff }],
                textures: [],
                tiles: []
            };

        self.tiles = [];
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

        self.clearCell = function (cell) {
            self.hexes.removeChild(cell.hex);
            cell.resetGraphics();
        };

        self.setCellTerrainType = function (cell, terrainIndex) {
            self.clearCell(cell);
            cell.terrainIndex = terrainIndex;
            self.hexes.addChild(createInteractiveCell(cell));
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

            return new PIXI.Polygon(points);
        }

        // Creates a drawn hex while ignoring the cell's position. A new PIXI.Graphics object is created
        // and used to draw and (possibly) fill in the hex. The PIXI.Graphics is returned to the caller.
        function createDrawHex_internal(cell, hasOutline, hasFill) {
            var graphic = new PIXI.Graphics(),
                i = 0,
                cs = hp.CoordinateSystems[self.options.coordinateSystem],
                color = self.options.terrainTypes[cell.terrainIndex].color ? self.options.terrainTypes[cell.terrainIndex].color : 0xffffff;

            if (cell.poly == null) {
                console.log("Cell's poly must first be defined by calling createHexPoly");
                return null;
            }

            if (hasOutline === false) {
                // If this is for masking then we don't need the line itself. Just the poly filled.
                graphic.lineStyle(0, 0, 1);
            } else {
                graphic.lineStyle(self.options.hexLineWidth, self.options.hexLineColor, 1);
            }

            if (hasFill !== false) {
                graphic.beginFill(color);
            }

            graphic.moveTo(cell.poly.points[0].x, cell.poly.points[0].y);

            for (i = 1; i < 7; i++) {
                graphic.lineTo(cell.poly.points[i].x, cell.poly.points[i].y);
            }

            if (hasFill !== false) {
                graphic.endFill();
            }

            return graphic;
        }

        // Used for manually drawing a hex cell. Creates the filled in hex, creates the outline and then wraps 
        // them in a PIXI.DisplayObjectContainer.
        self.createDrawnHex = function (cell) {
            var hexInner = createDrawHex_internal(cell, false, true),
                hexOuter = createDrawHex_internal(cell, true, false),
                parentContainer = new PIXI.DisplayObjectContainer();

            cell.outline = hexOuter;
            cell.inner = hexInner;
            parentContainer.addChild(hexInner);
            parentContainer.addChild(hexOuter);
            parentContainer.position.x = cell.center.x;
            parentContainer.position.y = cell.center.y;

            return parentContainer;
        };

        // Use for creating a hex cell with a textured background. First creates a PIXI.Graphics of the hex shape.
        // Next creates a PIXI.Sprite and uses the PIXI.Graphics hex as a mask. Masked PIXI.Sprite is added to parent
        // PIXI.DisplayObjectContainer. Hex outline is created and added to parent container. Parent container is returned.
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

            cell.sprite = sprite;

            cell.outline = createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);

            parentContainer.position.x = cell.center.x;
            parentContainer.position.y = cell.center.y;

            return parentContainer;
        }

        function getHexWidth() {
            var result = null,
                cs = hp.CoordinateSystems[self.options.coordinateSystem];
            result = self.options.hexSize * 2;
            if (cs.isFlatTop == false) {
                result = Math.sqrt(3) / 2 * result;
            }

            return result;
        }

        function getHexHeight() {
            var result = null,
                cs = hp.CoordinateSystems[self.options.coordinateSystem];
            result = self.options.hexSize * 2;
            if (cs.isFlatTop == true) {
                result = Math.sqrt(3) / 2 * result;
            }

            return result;
        }

        function getCellCenter(column, row, coordinateSystem) {
            var incX = 0.75 * self.options.hexWidth,
                incY = self.options.hexHeight,
                cs = hp.CoordinateSystems[coordinateSystem],
                center = { x: 0, y: 0 };

            if (cs.isFlatTop) {
                var offset = (cs.isOdd) ? 0 : 1;
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
                var offset = (cs.isOdd) ? 1 : 0;
                if ((row + offset) % 2) {
                    // even
                    center.x = (column * incX) + (self.options.hexWidth / 2);
                } else {
                    // odd
                    center.x = (column * incX) + self.options.hexWidth;
                }
            }

            return center;
        }

        function createCell(cell) {
            cell.center = getCellCenter(cell.column, cell.row, self.options.coordinateSystem);
            // Generate poly first then use poly to draw hex and create masks and all that.
            cell.poly = createHexPoly();

            if (self.options.showCoordinates) {
                cell.text = new PIXI.Text("1", { font: "10px Arial", fill: "black", dropShadow: "true", dropShadowDistance: 1, dropShadowColor: "white" });
                cell.text.setText(cell.column.toString() + ", " + cell.row.toString());
                cell.text.position.x = -Math.round((cell.text.width / 2));
                cell.text.position.y = 4 - Math.round(self.options.hexHeight / 2);
            }

            // Create the hex or textured hex
            var hex = null;
            if (self.options.terrainTypes[cell.terrainIndex].textureIndex >= 0) {
                hex = createTexturedHex(cell);
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

        function createInteractiveCell(cell) {
            var hex = createCell(cell);
            hex.hitArea = cell.poly;
            hex.setInteractive(true);

            // set the mouseover callback..
            hex.mouseover = function (data) {
                var cell = data.target.p_cell;
                self.cellHighlighter.position.x = cell.center.x;
                self.cellHighlighter.position.y = cell.center.y;

                if (self.inCellCount == 0) {
                    self.hexes.addChild(self.cellHighlighter);
                }

                if (cell.isOver !== true) {
                    cell.isOver = true;
                    self.inCellCount++;
                }
            }

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
            }

            hex.click = function (data) {
                if (self.options.onHexClick) {
                    self.options.onHexClick(data.target.p_cell);
                }
            }

            hex.tap = function (data) {
                if (self.options.onHexClick) {
                    self.options.onHexClick(data.target.p_cell);
                }
            }

            return hex;
        }

        function loadTiles() {
            self.tiles = [];
            $.each(self.options.textures, function (index, item) {
                self.tiles.push(new PIXI.Texture.fromImage(item));
            });
        }

        function loadTextures() {
            self.textures = [];
            $.each(self.options.textures, function (index, item) {
                self.textures.push(new PIXI.Texture.fromImage(item));
            });
        }

        self.reset = function (options) {
            while (self.cells.length > 0) {
                while (self.cells[0].length > 0) {
                    self.cells[0].splice(0, 1);
                }
                self.cells.splice(0, 1);
            }

            while (self.hexes.children.length) {
                self.hexes.removeChild(self.hexes.children[0]);
            }

            while (self.container.children.length > 0) {
                self.container.removeChildAt(0);
            }

            self.pixiStage.removeChild(self.container);

            if (self.cellHighlighter) {
                self.cellHighlighter = null;
            }

            init(options);
        };

        // todo: add the cells in the correct rendering order so tiles that overlap look right.
        self.generateRandomMap = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var rnd = Math.floor((Math.random() * self.options.terrainTypes.length));
                    var cell = new hp.Cell(row, column, rnd);
                    self.hexes.addChild(createInteractiveCell(cell));
                    self.cells[cell.row].push(cell);
                }
            }
        };

        // todo: add the cells in the correct rendering order so tiles that overlap look right.
        self.generateBlankMap = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var cell = new hp.Cell(row, column, 0);
                    self.hexes.addChild(createInteractiveCell(cell));
                    self.cells[cell.row].push(cell);
                }
            }
        };

        function init(options) {
            self.options = $.extend(true, {}, defaultOptions, options);

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

            if (self.pixiStage == null) {
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
}(window, jQuery));

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