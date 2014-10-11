/// <reference path="vend/pixi.dev.js" />
(function (window, $) {
    'use strict';
    var hp = window.HexPixi = window.HexPixi || {};

    hp.CoordinateSystems = [
        { name: "odd-q", isFlatTop: true, isOdd: true },
        { name: "even-q", isFlatTop: true, isOdd: false },
        { name: "odd-r", isFlatTop: false, isOdd: true },
        { name: "even-r", isFlatTop: false, isOdd: false }];

    hp.TerrainTypes = [
        { name: "empty", moveMod: 0, color: 0xffffff },
        { name: "brown", moveMod: 0, color: 0x8B4513 },
        { name: "grasst1", moveMod: 0, textureIndex: 0 }
    ];

    hp.Cell = function (rowNo, columnNo, terrainIndex) {
        var self = this;
        self.row = rowNo;
        self.column = columnNo;
        self.center = { x: 0, y: 0 };
        self.terrainIndex = terrainIndex ? terrainIndex : 0;
        self.text = new PIXI.Text("1", { font: "10px Arial", fill: 0x000000 });
    };

    hp.Map = function (pixiStage, options) {
        var self = this,
            defaultOptions = {
                coordinateSystem: 1,
                mapWidth: 10,
                mapHeight: 10,
                hexSize: 40,
                hexSizeHeightRatio: 1,
                hexLineColor: 0x909090,
                hexLineWidth: 1,
                zoomLevel: 1
            };

        self.textures = [];
        self.hexes = new PIXI.Graphics();
        self.container = new PIXI.DisplayObjectContainer();
        self.pixiStage = null;
        self.options = null;
        self.cells = [];

        // Used for manually drawing a hex cell. Does not work with textured cells.
        self.drawHex = function (graphic, hexSize, cell) {
            var size = hexSize,
                i = 0,
                cs = hp.CoordinateSystems[self.options.coordinateSystem],
                offset = cs.isFlatTop ? 0 : 0.5,
                angle = 2 * Math.PI / 6 * offset,
                x = cell.center.x + size * Math.cos(angle),
                y = cell.center.y + size * Math.sin(angle),
                color = hp.TerrainTypes[cell.terrainIndex].color ? hp.TerrainTypes[cell.terrainIndex].color : 0xffffff;

            graphic.beginFill(color);
            graphic.moveTo(Math.round(x), Math.round(y));

            for (i = 1; i < 7; i++) {
                angle = 2 * Math.PI / 6 * (i + offset);
                x = cell.center.x + size * Math.cos(angle);
                y = cell.center.y + size * Math.sin(angle);

                graphic.lineTo(Math.round(x), Math.round(y));
            }
            graphic.endFill();
        }

        function createSpriteHex(cell) {
            var sprite = new PIXI.Sprite(self.textures[hp.TerrainTypes[cell.terrainIndex].textureIndex]);
            sprite.position.x = cell.center.x;
            sprite.position.y = cell.center.y;
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;
            self.hexes.addChild(sprite);
        }

        function getCellCenter(hexSize, column, row, coordinateSystem) {
            var width = hexSize * 2,
                height = Math.round(Math.sqrt(3) / 2 * width),
                incX = Math.round(3 / 4 * width),
                incY = height,
                cs = hp.CoordinateSystems[coordinateSystem],
                center = {x:0, y:0, width: width, height: height };

            if (cs.isFlatTop) {
                var offset = (cs.isOdd) ? 0 : 1;
                center.x = (column * incX) + (width / 2);
                if ((column + offset) % 2) {
                    // even
                    center.y = (row * incY) + (incY / 2);
                } else {
                    // odd
                    center.y = (row * incY) + incY;
                }
            } else {
                height = hexSize * 2;
                width = Math.round(Math.sqrt(3) / 2 * height);
                incX = width;
                incY = Math.round(3 / 4 * height);

                center.y = (row * incY) + (height/2);

                var offset = (cs.isOdd) ? 1 : 0;
                if ((row + offset) % 2) {
                    // even
                    center.x = (column * incX) + (width / 2);
                } else {
                    // odd
                    center.x = (column * incX) + width;
                }
            }

            return center;
        }

        function createCell(cell) {
            var width = self.options.hexSize * 2,
                height = Math.sqrt(3) / 2 * width;

            cell.center = getCellCenter(self.options.hexSize, cell.column, cell.row, self.options.coordinateSystem);

            cell.text.setText(cell.column.toString() + ", " + cell.row.toString());
            cell.text.position.x = Math.round(cell.center.x - (cell.text.width / 2));
            cell.text.position.y = Math.round(cell.center.y - (height / 2) + 4);

            if (hp.TerrainTypes[cell.terrainIndex].textureIndex >= 0) {
                createSpriteHex(cell);
            } else {
                self.drawHex(self.hexes, self.options.hexSize, cell);
            }
        }

        function loadTextures() {
            self.textures = [];
            self.textures.push(new PIXI.Texture.fromImage("/images/game/hex_grass01.png"));
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

            init(options);
        };

        self.generateRandomMap = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var rnd = Math.floor((Math.random() * hp.TerrainTypes.length));
                    var cell = new hp.Cell(row, column, rnd);
                    createCell(cell);
                    self.cells[row].push(cell);
                    self.hexes.addChild(cell.text);
                }
            }
        };

        self.generateBlankMap = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var cell = new hp.Cell(row, column, 0);
                    createCell(cell);
                    self.cells[row].push(cell);
                    self.hexes.addChild(cell.text);
                }
            }
        };

        function init(options) {
            self.options = $.extend(true, {}, defaultOptions, options);
            if (self.pixiStage == null) {
                self.pixiStage = pixiStage;
            }

            self.container.addChild(self.hexes);
            self.pixiStage.addChild(self.container);
            self.hexes.clear();
            self.hexes.lineStyle(self.options.hexLineWidth, self.options.hexLineColor, 1);
            loadTextures();
        }

        init(options);
    };

}(window, jQuery));