mod utils;
mod lsystem;

use std::f64::consts::PI;
use rand::random;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use lsystem::*;
use crate::utils::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

fn draw_scene_2d(lines: Rc<Vec<Line2D>>, markers: Rc<Vec<Position2D>>, element: &str) -> Result<(), JsValue> {
    let document = document();
    let canvas = document.get_element_by_id(element).unwrap();
    let canvas: web_sys::HtmlCanvasElement = canvas
        .dyn_into::<web_sys::HtmlCanvasElement>()
        .map_err(|_| ())
        .unwrap();

    let ctx = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<web_sys::CanvasRenderingContext2d>()
        .unwrap();

    let height = f64::from(ctx.canvas().unwrap().height());
    let width = f64::from(ctx.canvas().unwrap().width());

    // draw background and floor
    ctx.set_fill_style(&JsValue::from_str("#d7fcff"));
    ctx.fill_rect(0.0, 0.0, width, height);
    ctx.set_fill_style(&JsValue::from_str("#4A3728"));
    ctx.fill_rect(0.0, height - 5.0, width, height);

    let x_offset = width / 2.0;
    let y_offset = height - 50.0;

    // draw pot
    ctx.set_stroke_style(&JsValue::from_str("#B35642"));
    ctx.set_fill_style(&JsValue::from_str("#B35642"));
    ctx.fill_rect(x_offset - 30.0, y_offset, 60.0, 10.0);
    ctx.begin_path();
    ctx.move_to(x_offset - 20.0, y_offset + 10.0);
    ctx.line_to(x_offset + 25.0, y_offset + 10.0);
    ctx.line_to(x_offset + 15.0, height - 5.0);
    ctx.line_to(x_offset - 15.0, height - 5.0);
    ctx.line_to(x_offset - 25.0, y_offset + 10.0);
    ctx.close_path();
    ctx.fill();
    ctx.stroke();

    ctx.set_stroke_style(&JsValue::from_str("#4F7942"));
    ctx.set_line_width(3.0);
    ctx.begin_path();

    // Here we want to call `requestAnimationFrame` in a loop, but only a fixed
    // number of times. After it's done we want all our resources cleaned up. To
    // achieve this we're using an `Rc`. The `Rc` will eventually store the
    // closure we want to execute on each frame, but to start out it contains
    // `None`.
    //
    // After the `Rc` is made we'll actually create the closure, and the closure
    // will reference one of the `Rc` instances. The other `Rc` reference is
    // used to store the closure, request the first frame, and then is dropped
    // by this function.
    //
    // Inside the closure we've got a persistent `Rc` reference, which we use
    // for all future iterations of the loop
    let ctx_ref = Rc::new(ctx);
    let f = Rc::new(RefCell::new(None));
    let lines_ref = lines.clone();
    let markers_ref = markers.clone();
    let g = f.clone();

    let mut i = 0;
    let mut j = 0;
    let mut prev_time = window().performance().unwrap().now();

    *g.borrow_mut() = Some(Closure::wrap(Box::new(move || {
        if i < lines_ref.len() {
            // we want to draw at the bottom of the canvas
            let start_x = lines_ref[i].start.x + x_offset;
            let start_y = lines_ref[i].start.y + y_offset;
            let end_x = lines_ref[i].end.x + x_offset;
            let end_y = lines_ref[i].end.y + y_offset;
            ctx_ref.move_to(start_x, start_y);
            ctx_ref.line_to(end_x, end_y);
            ctx_ref.stroke();

            i += 1;

            // Schedule ourself for another requestAnimationFrame callback.
            request_animation_frame(f.borrow().as_ref().unwrap());
        } else if j < markers_ref.len() {
            ctx_ref.close_path();

            // if we are done with lines, draw flowers
            // otherwise they don't pop in nicely
            if window().performance().unwrap().now() - prev_time > 200.0 {
                let start_x = markers_ref[j].x + x_offset;
                let start_y = markers_ref[j].y + y_offset;

                ctx_ref.set_fill_style(&JsValue::from_str("#C8A2C8"));
                ctx_ref.begin_path();
                for i in 0..5 {
                    let theta1 = PI * 2.0 / 5.0 * f64::from(i + 1);
                    let theta2 = PI * 2.0 / 5.0 * f64::from(i);
                    let x1 = 20.0 * theta1.sin() + start_x;
                    let y1 = 20.0 * theta1.cos() + start_y;
                    let x2 = 20.0 * theta2.sin() + start_x;
                    let y2 = 20.0 * theta2.cos() + start_y;
                    ctx_ref.move_to(start_x, start_y);
                    ctx_ref.bezier_curve_to(x1, y1, x2, y2, start_x, start_y);
                }
                ctx_ref.close_path();
                ctx_ref.fill();

                ctx_ref.set_fill_style(&JsValue::from_str("#FDDA0D"));
                ctx_ref.begin_path();
                ctx_ref.arc(start_x, start_y, 3.0, 0.0, 2.0 * PI).unwrap();
                ctx_ref.close_path();
                ctx_ref.fill();

                j += 1;
                prev_time = window().performance().unwrap().now();
            }

            request_animation_frame(f.borrow().as_ref().unwrap());
        } else {
            // Drop our handle to this closure so that it will get cleaned
            // up once we return.
            let _ = f.borrow_mut().take();
            return;
        }
    }) as Box<dyn FnMut()>));

    request_animation_frame(g.borrow().as_ref().unwrap());

    Ok(())
}

#[wasm_bindgen]
pub fn plant_2d(rounds: u8, element: &str) -> Result<(), JsValue> {
    set_panic_hook();
    let mut rules: MapRules<char> = MapRules::new();
    rules.set_str_prob('X', "F+[[X]-X]-F[-FX]+X", 0.9);
    // only applies if previous rule does not trigger
    rules.set_str_prob('X', "M", 0.25);
    rules.set_str('F', "FF");
    let axiom = "X".chars().collect();
    let mut system = LSystem::new(rules, axiom);

    for _ in 0..rounds-1 {
        system.next();
    }

    let state = system.next().unwrap();

    let mut turtle = Turtle2D::new_from(0.0, 0.0, -PI / 2.0);
    let drawer = PlantDrawer2D::<Turtle2D>{
        move_distance: 5.0 + (random::<f64>() * 2.0 - 1.0),
        move_bearing: Bearing2D{
            rotation: PI / 6.0 + ((random::<f64>() * 2.0 - 1.0) / (2.0 * PI))
        }
    };

    let (lines, markers) = drawer.map(&state, &mut turtle);

    console_log!("{:?}", lines);
    console_log!("{:?}", markers);

    draw_scene_2d(Rc::new(lines), Rc::new(markers), element)
}
