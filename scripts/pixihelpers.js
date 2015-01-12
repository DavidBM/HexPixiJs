
exports.updateLineStyle = function (lineWidth, color, alpha) {
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

exports.updateFillColor = function (fillColor, alpha) {
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
