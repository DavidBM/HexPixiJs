/// <reference path="vend/pixi.dev.js" />
/// <reference path="hexpixi.js" />
(function (window, $) {
    'use strict';
    var hp = window.HexPixi = window.HexPixi || {},
        map = null,
        stage = new PIXI.Stage(0xe0e0e0),
        renderer = new PIXI.autoDetectRenderer($("#stage").width(), 600, null, false, false);


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
            hexLineWidth: $("#showLines").prop("checked") ? 2 : 0,
            hexSize: $("#hexSize").val(),
            showCoordinates: $("#showCoordinates").prop("checked"),
            hexWidth: parseInt($("#hexWidth").val()),
            hexHeight: parseInt($("#hexHeight").val())
        }
    }

    function makeMap() {
        map.reset(getOptions());
        if ($("#randomTerrain").prop("checked")) {
            map.generateRandomMap();
        } else {
            map.generateBlankMap();
        }
    }

    function onResize() {
        renderer.view.style.width = $("#stage").width() + "px";
    }

    $(document).ready(function () {
        setupPixiJs();

        $(window).on("resize", function () {
            // todo: debounce
            onResize();
        });

        $("#makeMapBtn").on("click", makeMap);
        $("#clearMapBtn").on("click", clearMap);
    });

}(window, jQuery));