import * as wasm from "wasm-demo"

let canvas = document.getElementById('canvas');
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;
wasm.plant_2d(5, 'canvas');

