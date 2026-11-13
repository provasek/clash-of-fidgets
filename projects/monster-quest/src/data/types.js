export const TYPES = {
  NORMAL:   { name: 'Normální',  color: '#A8A77A' },
  FIRE:     { name: 'Ohnivý',    color: '#EE8130' },
  WATER:    { name: 'Vodní',     color: '#6390F0' },
  GRASS:    { name: 'Travní',    color: '#7AC74C' },
  ELECTRIC: { name: 'Elektrický',color: '#F7D02C' },
  ROCK:     { name: 'Kamenný',   color: '#B6A136' },
  GROUND:   { name: 'Zemní',     color: '#E2BF65' },
  FLYING:   { name: 'Létající',  color: '#A98FF3' },
  BUG:      { name: 'Hmyzí',     color: '#A6B91A' },
  POISON:   { name: 'Jedovatý',  color: '#A33EA1' },
  PSYCHIC:  { name: 'Psychický', color: '#F95587' },
  DRAGON:   { name: 'Dračí',     color: '#6F35FC' },
};

const CHART = {
  NORMAL:   { ROCK: 0.5 },
  FIRE:     { FIRE: 0.5, WATER: 0.5, GRASS: 2, BUG: 2, ROCK: 0.5, DRAGON: 0.5 },
  WATER:    { FIRE: 2, WATER: 0.5, GRASS: 0.5, GROUND: 2, ROCK: 2, DRAGON: 0.5 },
  GRASS:    { FIRE: 0.5, WATER: 2, GRASS: 0.5, POISON: 0.5, GROUND: 2, FLYING: 0.5, BUG: 0.5, ROCK: 2, DRAGON: 0.5 },
  ELECTRIC: { WATER: 2, GRASS: 0.5, ELECTRIC: 0.5, GROUND: 0, FLYING: 2, DRAGON: 0.5 },
  ROCK:     { FIRE: 2, GROUND: 0.5, FLYING: 2, BUG: 2 },
  GROUND:   { FIRE: 2, GRASS: 0.5, ELECTRIC: 2, POISON: 2, FLYING: 0, BUG: 0.5, ROCK: 2 },
  FLYING:   { GRASS: 2, ELECTRIC: 0.5, BUG: 2, ROCK: 0.5 },
  BUG:      { FIRE: 0.5, GRASS: 2, POISON: 0.5, FLYING: 0.5, PSYCHIC: 2 },
  POISON:   { GRASS: 2, POISON: 0.5, GROUND: 0.5, ROCK: 0.5 },
  PSYCHIC:  { POISON: 2, PSYCHIC: 0.5 },
  DRAGON:   { DRAGON: 2 },
};

export function getTypeEffectiveness(moveType, defenderTypes) {
  let mult = 1;
  for (const def of defenderTypes) {
    const row = CHART[moveType];
    if (row && row[def] !== undefined) {
      mult *= row[def];
    }
  }
  return mult;
}
