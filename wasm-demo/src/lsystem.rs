use std::collections::HashMap;
use std::hash::Hash;
use rand::prelude::*;


pub struct LSystem<T, P> where P: LRules<T> {
    rules: P,
    pub axiom: Vec<T>,
    state: Vec<T>,
}

impl<T, P> LSystem<T, P> where P: LRules<T>, T: Clone {
    /// create a new L-System from rules and an axiom
    pub fn new(rules: P, axiom: Vec<T>) -> LSystem<T, P> {
        LSystem {
            rules: rules,
            state: axiom.clone(),
            axiom: axiom,
        }
    }

    /// reset the L-System state back to its axiom
    pub fn reset(&mut self) {
        self.state = self.axiom.clone();
    }
}

impl<T, P> Iterator for LSystem<T, P> where P: LRules<T>, T: Clone {
    type Item = Vec<T>;

    /// Get the next iteration of the L-System by evaluating its associated
    /// production rules on its current states.
    fn next(&mut self) -> Option<Vec<T>> {
        let mut i: usize = 0;
        let mut expanded = false;
        while i < self.state.len() {
            let atom = self.state[i].clone();
            let production = self.rules.map(&atom);
            match production {
                Some(atoms) => {
                    self.state.remove(i);
                    for a in atoms.into_iter() {
                        self.state.insert(i, a);
                        i += 1;
                    }
                    expanded = true;
                }
                None => {
                    i += 1;
                }
            }
        }
        if expanded {
            Some(self.state.clone())
        } else {
            None
        }
    }
}

/// A set of production rule for an L-system, which maps an item to a list of
/// items which will replace it in the L-system state.
pub trait LRules<T> {
    /// perform a mapping of one atom to a string.  It returns `Some(Vec<T>)`
    /// if the atom is a variable with an existing production rule, or `None`
    /// if the atom should be considered terminal.
    fn map(&self, input: &T) -> Option<Vec<T>>;
}

pub struct MapRules<T: Hash + Eq> {
    productions: HashMap<T, Vec<(Vec<T>, f64)>>,
}

impl<T> MapRules<T> where T: Hash + Eq + Clone {
    /// Create a new, empty ruleset.
    pub fn new() -> MapRules<T> {
        MapRules {
            productions: HashMap::new(),
        }
    }

    /// Set an atom to produce a vector
    pub fn set(&mut self, k: T, v: Vec<T>) -> Option<Vec<T>> {
        self.set_prob(k, v, 1.0)
    }

    /// Set an atom to produce a vector with probability p
    pub fn set_prob(&mut self, k: T, v: Vec<T>, p: f64) -> Option<Vec<T>> {
        if !self.productions.contains_key(&k) {
            self.productions.insert(k.clone(), Vec::<(Vec<T>, f64)>::new());
        }
        let vec = self.productions.get_mut(&k).unwrap();
        vec.push((v.clone(), p.clone()));
        if vec.len() == 1 {
            Some(v)
        } else {
            None
        }
    }
}

impl MapRules<char> {
    /// Set an atom to produce the Vec<char> corresponding to a string
    pub fn set_str(&mut self, k: char, v: &str) -> Option<Vec<char>> {
        let mut rule = Vec::new();
        for c in v.chars() {
            rule.push(c);
        }
        self.set(k, rule)
    }

    /// Set an atom to produce the Vec<char> corresponding to a string with probability p
    pub fn set_str_prob(&mut self, k: char, v: &str, p: f64) -> Option<Vec<char>> {
        let mut rule = Vec::new();
        for c in v.chars() {
            rule.push(c);
        }
        self.set_prob(k, rule, p)
    }
}

impl<T: ?Sized> LRules<T> for MapRules<T> where T: Clone + Hash + Eq {
    fn map(&self, input: &T) -> Option<Vec<T>> {
        match self.productions.get(input) {
            Some(prods) => {
                for (v, p) in prods.iter() {
                    if random::<f64>() <= *p {
                        return Some(v.clone());
                    }
                }
                return Some(vec![input.clone()])
            },
            None => None,
        }
    }
}

/// A convenience function to print out the String representation of a char
/// vector.
pub fn to_string(v: &Vec<char>) -> String {
    let mut out = String::with_capacity(v.len());
    for c in v.iter() {
        out.push(*c);
    }
    out
}


pub trait Flippable<B> {
    fn flip(&self) -> B;
}

#[derive(Clone, Debug, Copy)]
pub struct Position2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, Copy)]
pub struct Line2D {
    pub start: Position2D,
    pub end: Position2D,
}

#[derive(Clone, Debug, Copy)]
pub struct Bearing2D {
    pub rotation: f64,
}

impl Flippable<Bearing2D> for Bearing2D {
    fn flip(&self) -> Bearing2D {
        Bearing2D { rotation: -1.0 *  self.rotation.clone() }
    }
}

#[derive(Clone, Debug, Copy)]
pub struct Position3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Clone, Debug, Copy)]
pub struct Line3D {
    pub start: Position3D,
    pub end: Position3D,
}

#[derive(Clone, Debug, Copy)]
pub struct Bearing3D {
    pub azimuth: f64,
    pub declination: f64,
}

impl Flippable<Bearing3D> for Bearing3D {
    fn flip(&self) -> Bearing3D {
        Bearing3D { azimuth: -1.0 *  self.azimuth.clone(), declination: -1.0 *  self.declination.clone() }
    }
}

/// A set of turtle drawer functions for an L-system, which maps a string to a list of lines
pub trait Turtle {
    type Line;
    type Bearing;
    type Position;

    /// move forward dist units
    fn move_forward(&mut self, dist: f64);

    /// turn angle radians
    fn turn(&mut self, bearing: &Self::Bearing);

    /// push position and angle onto the stack
    fn push(&mut self);

    /// pop position and angle the stack
    fn pop(&mut self);

    /// get current position
    fn position(&self) -> Self::Position;

    /// get current bearing
    fn bearing(&self) -> Self::Bearing;
}

pub struct Turtle2D {
    orientations: Vec<(Position2D, Bearing2D)>,
    current_position: Position2D,
    current_bearing: Bearing2D,
}

impl Turtle2D {
    pub(crate) fn new() -> Turtle2D {
        Turtle2D {
            orientations: vec![],
            current_position: Position2D { x: num_traits::identities::zero(), y: num_traits::identities::zero() },
            current_bearing: Bearing2D { rotation: num_traits::identities::zero()},
        }
    }

    pub(crate) fn new_from(x: f64, y: f64, rotation: f64) -> Turtle2D {
        Turtle2D {
            orientations: vec![],
            current_position: Position2D { x:x, y: y },
            current_bearing: Bearing2D { rotation: rotation },
        }
    }
}

impl Turtle for Turtle2D {
    type Line = Line2D;
    type Bearing = Bearing2D;
    type Position = Position2D;

    fn move_forward(&mut self, dist: f64) {
        self.current_position = Self::Position {
            x: self.current_position.x.clone() + dist * self.current_bearing.rotation.cos(),
            y: self.current_position.y.clone() + dist * self.current_bearing.rotation.sin(),
        }
    }

    fn turn(&mut self, bearing: &Self::Bearing) {
        self.current_bearing = Self::Bearing { rotation: self.current_bearing.rotation.clone() + bearing.rotation.clone() }
    }

    fn push(&mut self) {
        self.orientations.push((self.current_position.clone(), self.current_bearing.clone()))
    }

    fn pop(&mut self) {
        match self.orientations.pop() {
            Some((p, b)) => {
                self.current_position = p;
                self.current_bearing = b;
            }
            None => {}
        }
    }

    fn position(&self) -> Self::Position {
        return self.current_position;
    }

    fn bearing(&self) -> Self::Bearing {
        return self.current_bearing;
    }
}


pub struct Turtle3D {
    orientations: Vec<(Position3D, Bearing3D)>,
    current_position: Position3D,
    current_bearing: Bearing3D,
}

impl Turtle3D {
    pub(crate) fn new() -> Turtle3D {
        Turtle3D {
            orientations: vec![],
            current_position: Position3D { x: num_traits::identities::zero(), y: num_traits::identities::zero(), z: num_traits::identities::zero() },
            current_bearing: Bearing3D { azimuth: num_traits::identities::zero(), declination: num_traits::identities::zero() },
        }
    }

    pub(crate) fn new_from(x: f64, y: f64, z: f64, azimuth: f64, declination: f64) -> Turtle3D {
        Turtle3D {
            orientations: vec![],
            current_position: Position3D { x: x, y: y, z: z},
            current_bearing: Bearing3D { azimuth: azimuth, declination: declination },
        }
    }
}

impl Turtle for Turtle3D {
    type Line = Line3D;
    type Bearing = Bearing3D;
    type Position = Position3D;

    fn move_forward(&mut self, dist: f64) {
        self.current_position = Self::Position {
            x: self.current_position.x.clone() + dist * self.current_bearing.azimuth.cos() * self.current_bearing.declination.sin(),
            y: self.current_position.y.clone() + dist * self.current_bearing.azimuth.sin() * self.current_bearing.declination.sin(),
            z: self.current_position.z.clone() + dist * self.current_bearing.declination.cos(),
        }
    }

    fn turn(&mut self, bearing: &Self::Bearing) {
        self.current_bearing = Self::Bearing {
            azimuth: self.current_bearing.azimuth.clone() + bearing.azimuth,
            declination: self.current_bearing.declination.clone() + bearing.declination,
        }
    }

    fn push(&mut self) {
        self.orientations.push((self.current_position.clone(), self.current_bearing.clone()))
    }

    fn pop(&mut self) {
        match self.orientations.pop() {
            Some((p, b)) => {
                self.current_position = p;
                self.current_bearing = b;
            }
            None => {}
        }
    }

    fn position(&self) -> Self::Position {
        return self.current_position;
    }

    fn bearing(&self) -> Self::Bearing {
        return self.current_bearing;
    }
}


pub trait LineDrawer<
    T,
    TT> where TT: Turtle {
    /// perform a mapping of atoms to lines and markers
    fn map(&self, input: &Vec<T>, turtle: &mut TT) -> (Vec<TT::Line>, Vec<TT::Position>);

    fn get_move_distance(&self) -> f64;

    fn get_move_bearing(&self) -> TT::Bearing;
}


pub struct PlantDrawer2D<TT>
    where TT: Turtle
{
    pub move_distance: f64,
    pub move_bearing: TT::Bearing,
}


pub struct PlantDrawer3D<TT>
    where TT: Turtle
{
    pub move_distance: f64,
    pub move_bearing: TT::Bearing,
}


impl<TT> LineDrawer<char, TT> for PlantDrawer2D<TT>
    where TT: Turtle<Line=Line2D, Bearing=Bearing2D, Position=Position2D> {
    fn map(&self, input: &Vec<char>, turtle: &mut TT) -> (Vec<TT::Line>, Vec<TT::Position>)
    {
        let mut lines = Vec::<TT::Line>::new();
        let mut markers = Vec::<TT::Position>::new();
        for s in input.iter() {
            match s {
                'F' => {
                    let start = turtle.position();
                    turtle.move_forward(self.get_move_distance());
                    let line = TT::Line {
                        start: start,
                        end: turtle.position(),
                    };
                    lines.push(line);
                }
                '-' => turtle.turn(&self.get_move_bearing().flip()),
                '+' => turtle.turn(&self.get_move_bearing()),
                '[' => turtle.push(),
                ']' => turtle.pop(),
                'M' => {
                    markers.push(turtle.position().clone());
                },
                _ => {}
            }
        }
        return (lines, markers);
    }

    fn get_move_distance(&self) -> f64 {
        return self.move_distance;
    }

    fn get_move_bearing(&self) -> TT::Bearing {
        return self.move_bearing;
    }
}

impl<TT> LineDrawer<char, TT> for PlantDrawer3D<TT>
    where TT: Turtle<Line=Line3D, Bearing=Bearing3D, Position=Position3D> {
    fn map(&self, input: &Vec<char>, turtle: &mut TT) -> (Vec<TT::Line>, Vec<TT::Position>) {
        let mut lines = Vec::<TT::Line>::new();
        let mut markers = Vec::<TT::Position>::new();
        for s in input.iter() {
            match s {
                'F' => {
                    let start = turtle.position();
                    turtle.move_forward(self.get_move_distance());
                    let line = TT::Line {
                        start: start,
                        end: turtle.position(),
                    };
                    lines.push(line);
                }
                '-' => turtle.turn(&self.get_move_bearing().flip()),
                '+' => turtle.turn(&self.get_move_bearing()),
                '[' => turtle.push(),
                ']' => turtle.pop(),
                'M' => {
                    markers.push(turtle.position().clone());
                },
                _ => {}
            }
        }
        return (lines, markers);
    }

    fn get_move_distance(&self) -> f64 {
        return self.move_distance + random::<f64>();
    }

    fn get_move_bearing(&self) -> TT::Bearing {
        return self.move_bearing;
    }
}

