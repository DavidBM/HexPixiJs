/// <reference path="vend/pixi.dev.js" />
/// <reference path="hexpixi.js" />
(function (window) {
    'use strict';
    var hp = window.HexPixi = window.HexPixi || {},
        map = null,
        stage = new PIXI.Stage(0xe0e0e0),
        renderer = new PIXI.autoDetectRenderer(800, 600, {
            antialiasing: false,
            transparent: false,
            resolution: 1
        });

    function animate() {
        requestAnimFrame(animate);
        // render the stage
        renderer.render(stage);
    }

    function getOptions() {
        return {
            mapWidth: 10,
            mapHeight: 8,
            coordinateSystem: 2,
            hexLineWidth: 2,
            hexSize: 40,
            showCoordinates: true,
            textures: ["images/game/grassTexture.jpg", "images/game/waterTexture.jpg"],
            terrainTypes: [
                { name: "dirt", color: 0x9B5523 },
                { name: "sand", color: 0xdBd588 },
                { name: "snow", color: 0xebebfa },
                { name: "water", textureIndex: 1, color: 0x4060fa },
                { name: "grass", textureIndex: 0, color: 0x10fa10 }
            ],
            onAssetsLoaded: function () { requestAnimFrame(animate); }
        }
    }

    function setupPixiJs() {
        // add the renderer view element to the DOM
        var div = document.getElementById('stage');
        div.appendChild(renderer.view);

        //requestAnimFrame(animate);
        map = new hp.Map(stage, getOptions());
    }

    function initPage() {
        setupPixiJs();

        map.generateRandomMap();
    }

    initPage();

}(window));