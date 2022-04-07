mod utils;
mod lsystem;

use std::f64::consts::PI;
use rand::random;
use wasm_bindgen::prelude::*;
use lsystem::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn plant_2d(rounds: u8) -> Vec<f64> {
    let mut rules: MapRules<char> = MapRules::new();
    rules.set_str_prob('X', "F+[[X]-X]-F[-FX]+X", 0.9);
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

    let lines = drawer.map(&state, &mut turtle);

    let mut coords = Vec::<f64>::with_capacity(lines.len() * 4);
    for line in lines.iter() {
        coords.push(line.start.x);
        coords.push(line.start.y);
        coords.push(line.end.x);
        coords.push(line.end.y);
    }
    // alert(format!("{:?}", lines).as_str());
    return coords;
}
