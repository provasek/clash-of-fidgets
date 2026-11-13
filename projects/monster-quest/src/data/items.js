export const ITEMS = {
  orb: {
    id: 'orb', name: 'Chytací Orb', cat: 'orbs', price: 200,
    desc: 'Základní kapsle pro chytání divokých příšerek.',
    catchMult: 1.0,
  },
  super_orb: {
    id: 'super_orb', name: 'Super Orb', cat: 'orbs', price: 600,
    desc: 'Vysoce účinný orb s vyšší šancí na chycení.',
    catchMult: 1.6,
  },
  ultra_orb: {
    id: 'ultra_orb', name: 'Ultra Orb', cat: 'orbs', price: 1200,
    desc: 'Špičkový orb pro vzácné a silné příšerky.',
    catchMult: 2.2,
  },
  potion: {
    id: 'potion', name: 'Lektvar', cat: 'med', price: 300,
    desc: 'Obnoví 25 HP jedné příšerce.',
    heal: 25,
  },
  super_potion: {
    id: 'super_potion', name: 'Super Lektvar', cat: 'med', price: 700,
    desc: 'Obnoví 60 HP jedné příšerce.',
    heal: 60,
  },
  full_heal: {
    id: 'full_heal', name: 'Všelék', cat: 'med', price: 500,
    desc: 'Vyléčí všechny stavové potíže (jed, spánek, paralýza, popálení).',
    cureStatus: true,
  },
  revive: {
    id: 'revive', name: 'Oživovač', cat: 'med', price: 1500,
    desc: 'Oživí vyřazenou příšerku a obnoví jí polovinu HP.',
    revive: true,
  },
  rare_candy: {
    id: 'rare_candy', name: 'Vzácný bonbón', cat: 'med', price: 3000,
    desc: 'Okamžitě zvýší úroveň jedné příšerky o +1.',
    levelUp: true,
  },
  repel: {
    id: 'repel', name: 'Odpuzovač', cat: 'key', price: 350,
    desc: 'Na 60 kroků odpudí slabší divoké příšerky v trávě.',
    repelSteps: 60,
  },
};
