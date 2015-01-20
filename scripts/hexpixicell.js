
// The HexPixi.Cell object represents one map hex cell.
module.exports = exports = function (rowNo, columnNo, terrainIndex, cellData) {
    this.row = rowNo;
    this.column = columnNo;
    this.center = { x: 0, y: 0 };
    this.terrainIndex = terrainIndex ? terrainIndex : 0;
    this.poly = null; // The cell's poly that is used as a hit area.
    this.outline = null; // The PIXI.Graphics outline of the cell's hex.
    this.inner = []; // If a non-textured cell then this is the PIXI.Graphics of the hex inner, otherwise a PIXI.Sprite.
    this.hex = null; // The parent container of the hex's graphics objects.
    this.isEmpty = null; // The cell is empty if set to true.
    this.data = cellData;
    this.isOver = false;
};

exports.prototype.resetGraphics = function () {
    this.terrainIndex = terrainIndex ? terrainIndex : 0;
    this.poly = null; // The cell's poly that is used as a hit area.
    this.outline = null; // The PIXI.Graphics outline of the cell's hex.
    this.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner.
    this.hex = null; // The parent container of the hex's graphics objects.
};
