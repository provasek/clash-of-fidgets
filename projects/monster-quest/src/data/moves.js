export const MOVES = {
  tackle:       { name: 'Náraz',         type: 'NORMAL',   power: 40, acc: 100, pp: 35, cat: 'phys' },
  scratch:      { name: 'Škrábnutí',     type: 'NORMAL',   power: 40, acc: 100, pp: 35, cat: 'phys' },
  quick_attack: { name: 'Rychlý útok',   type: 'NORMAL',   power: 40, acc: 100, pp: 30, cat: 'phys', priority: 1 },
  hyper_fang:   { name: 'Hyper tesák',   type: 'NORMAL',   power: 80, acc: 90,  pp: 15, cat: 'phys' },
  slash:        { name: 'Seknutí',       type: 'NORMAL',   power: 70, acc: 100, pp: 20, cat: 'phys', highCrit: true },
  growl:        { name: 'Vrčení',        type: 'NORMAL',   power: 0,  acc: 100, pp: 40, cat: 'status', stat: { target: 'foe', key: 'atkStage', delta: -1 } },
  leer:         { name: 'Zlý pohled',    type: 'NORMAL',   power: 0,  acc: 100, pp: 30, cat: 'status', stat: { target: 'foe', key: 'defStage', delta: -1 } },
  focus_up:     { name: 'Bojový pokřik', type: 'NORMAL',   power: 0,  acc: 100, pp: 30, cat: 'status', stat: { target: 'self', key: 'atkStage', delta: 1 } },

  ember:        { name: 'Uhlíky',        type: 'FIRE',     power: 40, acc: 100, pp: 25, cat: 'spec', status: { type: 'BRN', chance: 0.15 } },
  flame_wheel:  { name: 'Ohnivé kolo',   type: 'FIRE',     power: 60, acc: 100, pp: 25, cat: 'phys', status: { type: 'BRN', chance: 0.15 } },
  flamethrower: { name: 'Plamenomet',    type: 'FIRE',     power: 90, acc: 100, pp: 15, cat: 'spec', status: { type: 'BRN', chance: 0.1 } },

  water_gun:    { name: 'Vodní dělo',    type: 'WATER',    power: 40, acc: 100, pp: 25, cat: 'spec' },
  bubble_beam:  { name: 'Bublinový paprsek', type: 'WATER', power: 65, acc: 100, pp: 20, cat: 'spec' },
  hydro_pulse:  { name: 'Hydro vlna',    type: 'WATER',    power: 90, acc: 95,  pp: 10, cat: 'spec' },

  vine_whip:    { name: 'Šlahoun',       type: 'GRASS',    power: 45, acc: 100, pp: 25, cat: 'phys' },
  razor_leaf:   { name: 'Listová břitva',type: 'GRASS',    power: 55, acc: 95,  pp: 25, cat: 'phys', highCrit: true },
  absorb:       { name: 'Vysátí',        type: 'GRASS',    power: 35, acc: 100, pp: 25, cat: 'spec', drain: 0.5 },
  solar_burst:  { name: 'Solární záře',  type: 'GRASS',    power: 95, acc: 90,  pp: 10, cat: 'spec' },
  sleep_powder: { name: 'Spánkový pyl',  type: 'GRASS',    power: 0,  acc: 75,  pp: 15, cat: 'status', status: { type: 'SLP', chance: 1 } },

  thundershock: { name: 'Bleskový šok',  type: 'ELECTRIC', power: 40, acc: 100, pp: 30, cat: 'spec', status: { type: 'PAR', chance: 0.15 } },
  spark:        { name: 'Jiskra',        type: 'ELECTRIC', power: 65, acc: 100, pp: 20, cat: 'phys', status: { type: 'PAR', chance: 0.2 } },
  thunderbolt:  { name: 'Blesk',         type: 'ELECTRIC', power: 90, acc: 100, pp: 15, cat: 'spec', status: { type: 'PAR', chance: 0.1 } },
  thunder_wave: { name: 'Elektrovlna',   type: 'ELECTRIC', power: 0,  acc: 90,  pp: 20, cat: 'status', status: { type: 'PAR', chance: 1 } },

  rock_throw:   { name: 'Hod kamenem',   type: 'ROCK',     power: 50, acc: 90,  pp: 15, cat: 'phys' },
  rock_slide:   { name: 'Kamenný sesuv', type: 'ROCK',     power: 75, acc: 90,  pp: 10, cat: 'phys' },
  harden:       { name: 'Zpevnění',      type: 'ROCK',     power: 0,  acc: 100, pp: 30, cat: 'status', stat: { target: 'self', key: 'defStage', delta: 1 } },

  mud_slap:     { name: 'Blátivý úder',  type: 'GROUND',   power: 40, acc: 100, pp: 25, cat: 'spec' },
  earthquake:   { name: 'Zemětřesení',   type: 'GROUND',   power: 100,acc: 100, pp: 10, cat: 'phys' },

  gust:         { name: 'Vichr',         type: 'FLYING',   power: 40, acc: 100, pp: 35, cat: 'spec' },
  wing_attack:  { name: 'Útok křídly',   type: 'FLYING',   power: 60, acc: 100, pp: 35, cat: 'phys' },
  aerial_ace:   { name: 'Vzdušné eso',   type: 'FLYING',   power: 75, acc: 100, pp: 20, cat: 'phys' },

  bug_bite:     { name: 'Hmyzí kousnutí',type: 'BUG',      power: 50, acc: 100, pp: 25, cat: 'phys' },
  x_scissor:    { name: 'Křížový střih', type: 'BUG',      power: 80, acc: 100, pp: 15, cat: 'phys' },

  poison_sting: { name: 'Jedovatý osten',type: 'POISON',   power: 35, acc: 100, pp: 35, cat: 'phys', status: { type: 'PSN', chance: 0.3 } },
  sludge_bomb:  { name: 'Jedovatá bomba',type: 'POISON',   power: 85, acc: 100, pp: 10, cat: 'spec', status: { type: 'PSN', chance: 0.3 } },

  confusion:    { name: 'Zmatení',       type: 'PSYCHIC',  power: 50, acc: 100, pp: 25, cat: 'spec' },
  psybeam:      { name: 'Psychický paprsek',type:'PSYCHIC', power: 70, acc: 100, pp: 20, cat: 'spec' },
  psychic:      { name: 'Psychokinéze',  type: 'PSYCHIC',  power: 90, acc: 100, pp: 10, cat: 'spec' },

  dragon_breath:{ name: 'Dračí dech',    type: 'DRAGON',   power: 60, acc: 100, pp: 20, cat: 'spec', status: { type: 'PAR', chance: 0.2 } },
  dragon_claw:  { name: 'Dračí dráp',    type: 'DRAGON',   power: 85, acc: 100, pp: 15, cat: 'phys' },
};
