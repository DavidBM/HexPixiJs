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
        { name: "dirt", moveMod: 0, color: 0x9B5523 },
        { name: "sand", moveMod: 0, color: 0xdBd588 },
        { name: "snow", moveMod: 0, color: 0xebebfa },
        { name: "water", moveMod: 0, color: 0x5585f8 }
        //, { name: "grasst1", moveMod: 0, textureIndex: 0 }
    ];

    hp.Cell = function (rowNo, columnNo, terrainIndex) {
        var self = this;
        self.row = rowNo;
        self.column = columnNo;
        self.center = { x: 0, y: 0 };
        self.terrainIndex = terrainIndex ? terrainIndex : 0;
    };

    hp.Map = function (pixiStage, options) {
        var self = this,
            defaultOptions = {
                coordinateSystem: 1,
                mapWidth: 10,
                mapHeight: 10,
                hexSize: 30,
                hexSizeHeightRatio: 1,
                hexLineColor: 0x909090,
                hexLineWidth: 2,
                showCoordinates: false
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

            graphic.lineStyle(self.options.hexLineWidth, self.options.hexLineColor, 1);
            
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

        function createTexturedHex(cell) {
            var sprite = new PIXI.Sprite(self.textures[hp.TerrainTypes[cell.terrainIndex].textureIndex]),
                cs = hp.CoordinateSystems[self.options.coordinateSystem],
                parentContainer = new PIXI.DisplayObjectContainer();

            if (!cs.isFlatTop) {
                sprite.anchor.x = 0.5;
                sprite.anchor.y = 0.5;
                sprite.rotation = 0.523598776; // 30 degrees in radians
                parentContainer.position.x = cell.center.x;
                parentContainer.position.y = cell.center.y;
            } else {
                parentContainer.position.x = cell.center.x - (sprite.width / 2);
                parentContainer.position.y = cell.center.y - (sprite.height / 2);
            }

            parentContainer.addChild(sprite);
            self.hexes.addChild(parentContainer);

            self.cells[cell.row].push(cell);
            if (self.options.showCoordinates) {
                self.hexes.addChild(cell.text);
            }
        }

        function getCellCenter(hexSize, column, row, coordinateSystem) {
            var width = hexSize * 2,
                height = Math.round(Math.sqrt(3) / 2 * width),
                incX = Math.round(3 / 4 * width),
                incY = height,
                cs = hp.CoordinateSystems[coordinateSystem],
                center = { x: 0, y: 0, width: width, height: height };

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

                center.y = (row * incY) + (height / 2);

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

            if (self.options.showCoordinates) {
                cell.text = new PIXI.Text("1", { font: "10px Arial", fill: "black", dropShadow: "true", dropShadowDistance: 1, dropShadowColor: "white" });
                cell.text.setText(cell.column.toString() + ", " + cell.row.toString());
                cell.text.position.x = Math.round(cell.center.x - (cell.text.width / 2));
                cell.text.position.y = Math.round(cell.center.y - (height / 2) + 4);
            }

            if (hp.TerrainTypes[cell.terrainIndex].textureIndex >= 0) {
                createTexturedHex(cell);
            } else {
                self.drawHex(self.hexes, self.options.hexSize, cell);
            }

            self.cells[cell.row].push(cell);

            if (self.options.showCoordinates) {
                self.hexes.addChild(cell.text);
            }
        }

        function loadTextures() {
            self.textures = [];
            self.textures.push(new PIXI.Texture.fromImage("images/game/hex_grass01.png"));
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
                }
            }
        };

        self.generateRandomMapBetter = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var rnd = Math.floor((Math.random() * hp.TerrainTypes.length));
                    var cell = new hp.Cell(row, column, rnd);
                    createCell(cell);
                }
            }
        };

        self.generateBlankMap = function () {
            for (var row = 0; row < self.options.mapHeight; row++) {
                self.cells[row] = [];
                for (var column = 0; column < self.options.mapWidth; column++) {
                    var cell = new hp.Cell(row, column, 0);
                    createCell(cell);
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
            loadTextures();
        }

        init(options);
    };

}(window, jQuery));