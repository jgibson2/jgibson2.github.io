import init, { plant_2d } from "./pkg/wasm_demo.js"

async function run() {
    await init();

    let canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
    plant_2d(5, "element");
}

run();


