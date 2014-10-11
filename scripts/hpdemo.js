/// <reference path="vend/pixi.dev.js" />
/// <reference path="hexpixi.js" />
(function (window, $) {
    'use strict';
    var hp = window.HexPixi = window.HexPixi || {},
        map = null,
        stage = new PIXI.Stage(0xe0e0e0),
        renderer = new PIXI.autoDetectRenderer($("#stage").width(), $("#stage").height(), null, false, false);


    function setupPixiJs() {
        // add the renderer view element to the DOM
        $("#stage")[0].appendChild(renderer.view);

        requestAnimFrame(animate);
        map = new hp.Map(stage);
    }

    function animate() {
        requestAnimFrame(animate);
        // render the stage
        renderer.render(stage);
    }

    function clearMap() {
        map.reset(getOptions());
    }

    function getOptions() {
        return {
            mapWidth: $("#mapWidth").val(), 
            mapHeight: $("#mapHeight").val(), 
            coordinateSystem: $("#coordinateSystem").val(),
            hexLineWidth: 2
        }
    }

    function makeMap() {
        map.reset(getOptions());
        //map.generateBlankMap();
        map.generateRandomMap();
    }

    $(document).ready(function () {
        setupPixiJs();

        $("#makeMapBtn").on("click", makeMap);
        $("#clearMapBtn").on("click", clearMap);
    });

}(window, jQuery));