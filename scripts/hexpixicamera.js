module.exports = exports = function (_map) {
    this.position = { x: 0, y: 0 };
    this.map = _map;

};

exports.prototype.updateSceneGraph = function () {
};

exports.prototype.position = function (x, y) {
    var result = this.position;

    if (x >= 0 && y >= 0) {
        this.position.x = x;
        this.position.y = y;
        this.updateSceneGraph();
    }

    return result;
};
