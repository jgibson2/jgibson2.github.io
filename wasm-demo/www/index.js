import * as wasm from "wasm-demo";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const coords = wasm.plant_2d(5);
ctx.canvas.width  = window.innerWidth * 0.9;
ctx.canvas.height = window.innerHeight * 0.9;

// draw background and floor
ctx.fillStyle = "#d7fcff";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
ctx.fillStyle = "#4A3728";
ctx.fillRect(0, ctx.canvas.height - 5, ctx.canvas.width, ctx.canvas.height);

const x_offset = ctx.canvas.width / 2.0;
const y_offset = ctx.canvas.height - 50;

// draw pot
ctx.strokeStyle = "#B35642"
ctx.fillStyle = "#B35642"
ctx.fillRect(x_offset - 30, y_offset, 60, 10);
ctx.beginPath();
ctx.moveTo(x_offset - 20, y_offset + 10);
ctx.lineTo(x_offset + 25, y_offset + 10);
ctx.lineTo(x_offset + 15, ctx.canvas.height - 5);
ctx.lineTo(x_offset - 15, ctx.canvas.height - 5);
ctx.lineTo(x_offset - 25, y_offset + 10);
ctx.closePath();
ctx.fill();
ctx.stroke();

ctx.strokeStyle = "#4F7942";
let delayMs = 1;
let i = 0;

ctx.beginPath();
let drawCallback = setInterval(() => {
    if (i > coords.length) {
        console.log("Stopping draw loop");
        clearInterval(drawCallback);
        return;
    }
    let start_x = coords[i  ] + x_offset;
    let start_y = coords[i+1] + y_offset;
    let end_x   = coords[i+2] + x_offset;
    let end_y   = coords[i+3] + y_offset;
    // flip 90 degrees
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
    i += 4;
}, delayMs);
ctx.closePath();

console.log(coords);