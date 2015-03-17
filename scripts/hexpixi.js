/*
    HexPixi
    by Mark Harmon 2014
    A free hex game library for pixijs.
    Released under MIT License.
    Please let me know about any games released using this library or derivative work.
*/
var PIXI = require('pixi.js');

exports.Map = require('./hexpiximap.js');

exports.Camera = require('./hexpixicamera.js');

exports.PIXI = PIXI;

if(typeof window !== 'undefined'){
    window.HexPixi = exports;
}


