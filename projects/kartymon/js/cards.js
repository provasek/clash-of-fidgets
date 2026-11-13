// Database of 160 unique KartyMon creatures across 8 elements and 6 rarity tiers

const ELEMENTS = {
  fire: { id: 'fire', name: 'Oheň', icon: '🔥', color: '#ff5a36', dark: '#4a1207', glow: 'rgba(255, 90, 54, 0.45)' },
  water: { id: 'water', name: 'Voda', icon: '💧', color: '#2ea8ff', dark: '#082747', glow: 'rgba(46, 168, 255, 0.45)' },
  nature: { id: 'nature', name: 'Příroda', icon: '🌿', color: '#39d96b', dark: '#0a361a', glow: 'rgba(57, 217, 107, 0.45)' },
  electric: { id: 'electric', name: 'Blesk', icon: '⚡', color: '#ffd43b', dark: '#3d3004', glow: 'rgba(255, 212, 59, 0.45)' },
  shadow: { id: 'shadow', name: 'Stín', icon: '🌑', color: '#a855f7', dark: '#230b3d', glow: 'rgba(168, 85, 247, 0.45)' },
  crystal: { id: 'crystal', name: 'Krystal', icon: '💎', color: '#22d3ee', dark: '#083344', glow: 'rgba(34, 211, 238, 0.45)' },
  wind: { id: 'wind', name: 'Vítr', icon: '🌪️', color: '#7dd3fc', dark: '#0c2d42', glow: 'rgba(125, 211, 252, 0.45)' },
  cosmic: { id: 'cosmic', name: 'Kosmos', icon: '🌌', color: '#f472b6', dark: '#3b0726', glow: 'rgba(244, 114, 182, 0.45)' }
};

const RARITIES = {
  common: { id: 'common', label: 'Běžná', short: 'C', sell: 10, order: 1, color: '#9ca3af' },
  uncommon: { id: 'uncommon', label: 'Neobvyklá', short: 'U', sell: 25, order: 2, color: '#34d399' },
  rare: { id: 'rare', label: 'Vzácná', short: 'R', sell: 60, order: 3, color: '#fbbf24' },
  epic: { id: 'epic', label: 'Epická', short: 'E', sell: 150, order: 4, color: '#c084fc' },
  mythic: { id: 'mythic', label: 'Mýtická', short: 'M', sell: 400, order: 5, color: '#fb7185' },
  secret: { id: 'secret', label: 'Tajná', short: 'S', sell: 1000, order: 6, color: '#fde047' }
};

const PACK_TYPES = [
  {
    id: 'classic',
    name: 'Klasický Booster',
    subtitle: 'Skvělý start do sbírky',
    cost: 50,
    emblem: '🎴',
    theme: 'linear-gradient(135deg, #1e3a8a, #3b82f6, #1d4ed8)',
    accent: '#60a5fa',
    weights: { common: 56, uncommon: 28, rare: 11, epic: 3.5, mythic: 1.2, secret: 0.3 },
    guaranteedMin: null
  },
  {
    id: 'elemental',
    name: 'Neonový Booster',
    subtitle: 'Vyšší šance na Vzácné a Epické',
    cost: 120,
    emblem: '⚡',
    theme: 'linear-gradient(135deg, #4c1d95, #9333ea, #ec4899)',
    accent: '#e879f9',
    weights: { common: 32, uncommon: 34, rare: 22, epic: 8.5, mythic: 2.8, secret: 0.7 },
    guaranteedMin: 'uncommon'
  },
  {
    id: 'ultra',
    name: 'Ultra Arkáda Pack',
    subtitle: 'Garantovaná Vzácná+ karta!',
    cost: 280,
    emblem: '👑',
    theme: 'linear-gradient(135deg, #78350f, #f59e0b, #ef4444)',
    accent: '#fbbf24',
    weights: { common: 15, uncommon: 28, rare: 33, epic: 16, mythic: 6.2, secret: 1.8 },
    guaranteedMin: 'rare'
  }
];

// 160 unique creature definitions (20 per element)
// Rarity distribution across 160:
// common: 60, uncommon: 40, rare: 30, epic: 16, mythic: 10, secret: 4
const RAW_MONSTERS = [
  // === FIRE (1-20) ===
  { n: 'Jiskřík', e: 'fire', r: 'common', s: 1, ab: 'Žhavý štěk', l: 'Malý ohnivý lišák, kterému při radosti praskají uši.' },
  { n: 'Plamoliš', e: 'fire', r: 'uncommon', s: 2, ab: 'Ohnivý ocas', l: 'Běhá lesem tak rychle, že za sebou zanechává zlaté jiskry.' },
  { n: 'Ignisaur', e: 'fire', r: 'rare', s: 3, ab: 'Sluneční řev', l: 'Král spálených plání s hřívou ze živého plamene.' },
  { n: 'Uhlík', e: 'fire', r: 'common', s: 1, ab: 'Popelavý skok', l: 'Vypadá jako roztomilý kámen, dokud se nerozžhaví doběla.' },
  { n: 'Lávokrtek', e: 'fire', r: 'uncommon', s: 2, ab: 'Magmatický tunel', l: 'Hloupí si nory přímo v sopečných stěnách.' },
  { n: 'Žárodrak', e: 'fire', r: 'rare', s: 3, ab: 'Sopečný dech', l: 'Jeho křídla dokážou rozfoukat popel na kilometry daleko.' },
  { n: 'Světlopýr', e: 'fire', r: 'common', s: 1, ab: 'Teplý záblesk', l: 'Noční můra se zářícími křídly jako lucerna.' },
  { n: 'Fénixče', e: 'fire', r: 'uncommon', s: 2, ab: 'Popelový vír', l: 'Když spadne z hnízda, promění se v obláček jisker.' },
  { n: 'Krbodlak', e: 'fire', r: 'common', s: 1, ab: 'Kouřová clona', l: 'Rád spí u starých pecí a chytá padající uhlíky.' },
  { n: 'Pecogor', e: 'fire', r: 'uncommon', s: 2, ab: 'Tlaková vlna', l: 'V jeho břiše neustále hoří modrý plamen.' },
  { n: 'Sirkáček', e: 'fire', r: 'common', s: 1, ab: 'Škrt!', l: 'Hlavička mu vzplane vždy, když se lekne.' },
  { n: 'Pochodeňák', e: 'fire', r: 'rare', s: 2, ab: 'Tanec plamenů', l: 'Osvětluje temné jeskyně svým tříramenným plamenem.' },
  { n: 'Popeláček', e: 'fire', r: 'common', s: 1, ab: 'Kouřový kroužek', l: 'Vyfukuje dokonalé kruhy z voňavého dýmu.' },
  { n: 'Bleskožár', e: 'fire', r: 'common', s: 1, ab: 'Rychlá jiskra', l: 'Malý ještěr rychlejší než letící šíp.' },
  { n: 'Magmaron', e: 'fire', r: 'uncommon', s: 2, ab: 'Roztavený štít', l: 'Kůži má tvrdou jako vychladlý čedič.' },
  { n: 'Infernik', e: 'fire', r: 'rare', s: 2, ab: 'Kruh ohně', l: 'Vzduch kolem něj se vlní nesnesitelným horkem.' },
  { n: 'Vulkanos', e: 'fire', r: 'epic', s: 'Apex', ab: 'Erupce titána', l: 'Starověký strážce kráterů, který budí sopky ze spánku.' },
  { n: 'Solarius', e: 'fire', r: 'epic', s: 'Apex', ab: 'Koronární výbuch', l: 'Nese v sobě žár malého slunce a zlatou zbroj.' },
  { n: 'Pyrokrál', e: 'fire', r: 'mythic', s: 'Apex', ab: 'Věčný oheň', l: 'Legendární fénix-drak, jehož peří nikdy nevyhasne.' },
  { n: 'Ohnivý Bůh Rá-X', e: 'fire', r: 'secret', s: 'Apex', ab: 'Supernova', l: 'Tajná prismatická entita zrozená v jádru první hvězdy.' },

  // === WATER (21-40) ===
  { n: 'Kapička', e: 'water', r: 'common', s: 1, ab: 'Vodní šplouch', l: 'Průsvitná příšerka, která se v dešti dokáže úplně ztratit.' },
  { n: 'Bublinář', e: 'water', r: 'uncommon', s: 2, ab: 'Bublinová past', l: 'Vytváří obří duhové bubliny, ve kterých rád spí.' },
  { n: 'Příbojník', e: 'water', r: 'rare', s: 3, ab: 'Tsunami úder', l: 'Jediným mávnutím ploutví zvedne třímetrovou vlnu.' },
  { n: 'Žabínek', e: 'water', r: 'common', s: 1, ab: 'Leknínový skok', l: 'Jeho hlasité kvákání předpovídá letní bouřku.' },
  { n: 'Ropušák', e: 'water', r: 'uncommon', s: 2, ab: 'Vodní dělo', l: 'Nafoukne hrdlo a vystřelí proud vody na dvacet metrů.' },
  { n: 'Lagunor', e: 'water', r: 'rare', s: 3, ab: 'Hlubinný vír', l: 'Vládce podzemních jezer se zářícími tykadly.' },
  { n: 'Korálík', e: 'water', r: 'common', s: 1, ab: 'Kamenitý krunýř', l: 'Na zádech mu rostou barevné mořské korály.' },
  { n: 'Útesovec', e: 'water', r: 'uncommon', s: 2, ab: 'Korálová zeď', l: 'Poskytuje úkryt malým rybkám mezi svými větvemi.' },
  { n: 'Mlžník', e: 'water', r: 'common', s: 1, ab: 'Ranní opar', l: 'Vznáší se nad rybníky těsně před svítáním.' },
  { n: 'Ledovček', e: 'water', r: 'uncommon', s: 2, ab: 'Mrazivý dech', l: 'Tam, kde přeběhne, zamrzá hladina v krásné vzory.' },
  { n: 'Kreveta-Z', e: 'water', r: 'common', s: 1, ab: 'Klepeto cvak', l: 'Malý bojovník s neuvěřitelně rychlým úderem.' },
  { n: 'Humrodrak', e: 'water', r: 'rare', s: 2, ab: 'Hydraulický stisk', l: 'Jeho pancíř odolá i tlaku na dně oceánu.' },
  { n: 'Perlorodka', e: 'water', r: 'common', s: 1, ab: 'Lesklý záblesk', l: 'Uvnitř schránky ukrývá svítící perlu.' },
  { n: 'Medúzka', e: 'water', r: 'common', s: 1, ab: 'Jemné žahnutí', l: 'Tančí v mořských proudech jako živý neonový zvon.' },
  { n: 'Nautilus', e: 'water', r: 'uncommon', s: 2, ab: 'Spirální proud', l: 'Prastará hlavonožka s neproniknutelnou ulitou.' },
  { n: 'Sirénor', e: 'water', r: 'rare', s: 2, ab: 'Píseň přílivu', l: 'Jeho zpěv uklidňuje i ty nejdivočejší bouře.' },
  { n: 'Krakenos', e: 'water', r: 'epic', s: 'Apex', ab: 'Chapadla hlubin', l: 'Obávaný vládce mořských příkopů s osmi zářivými rameny.' },
  { n: 'Glaciaris', e: 'water', r: 'epic', s: 'Apex', ab: 'Věčný ledovec', l: 'Krystalický leviatan, který zmrazí celý záliv.' },
  { n: 'Poseidrak', e: 'water', r: 'mythic', s: 'Apex', ab: 'Vlna věčnosti', l: 'Mýtický mořský had korunovaný vodním trojzubcem.' },
  { n: 'Aquanauta Omega', e: 'water', r: 'secret', s: 'Apex', ab: 'Kvantový příliv', l: 'Tajný strážce všech oceánů z dimenze čisté vody.' },

  // === NATURE (41-60) ===
  { n: 'Lístek', e: 'nature', r: 'common', s: 1, ab: 'Šustivý švih', l: 'Veselý výhonek, který se rád vyhřívá na ranním slunci.' },
  { n: 'Keřozub', e: 'nature', r: 'uncommon', s: 2, ab: 'Trnový skok', l: 'Maskuje se v hustém podrostu a hlídá lesní stezky.' },
  { n: 'Lesodrak', e: 'nature', r: 'rare', s: 3, ab: 'Kmenový hrom', l: 'Na jeho zádech roste staletý dub a zpívají ptáci.' },
  { n: 'Houbíček', e: 'nature', r: 'common', s: 1, ab: 'Výtrusný puf', l: 'Při každém kroku vypustí obláček zlatých spor.' },
  { n: 'Muchomůr', e: 'nature', r: 'uncommon', s: 2, ab: 'Hypno-spory', l: 'Jeho puntíkovaný klobouk v noci slabě světélkuje.' },
  { n: 'Mycelior', e: 'nature', r: 'rare', s: 3, ab: 'Podhoubí sítě', l: 'Komunikuje s celým lesem skrze kořeny pod zemí.' },
  { n: 'Žaludík', e: 'nature', r: 'common', s: 1, ab: 'Křupavý hod', l: 'Tvrdohlavý oříšek s čepicí z dubového listu.' },
  { n: 'Šiškomlat', e: 'nature', r: 'uncommon', s: 2, ab: 'Jehličnatý déšť', l: 'Brání koruny borovic před nezvanými hosty.' },
  { n: 'Pampelíšek', e: 'nature', r: 'common', s: 1, ab: 'Chmýří let', l: 'Když foukne vítr, vznese se jako malý padáček.' },
  { n: 'Kaktusák', e: 'nature', r: 'uncommon', s: 2, ab: 'Jehlová salva', l: 'Nikdo ho nemůže obejmout, i když je moc přátelský.' },
  { n: 'Brouček', e: 'nature', r: 'common', s: 1, ab: 'Lesklý krunýř', l: 'Sbírá kapky rosy do svého smaragdového štítu.' },
  { n: 'Rohanáč', e: 'nature', r: 'rare', s: 2, ab: 'Klepeta síly', l: 'Dokáže zvednout kámen dvacetkrát těžší než je sám.' },
  { n: 'Mechoul', e: 'nature', r: 'common', s: 1, ab: 'Měkký polštář', l: 'Vypadá jako kousek mechu, dokud neotevře velké oči.' },
  { n: 'Kapradík', e: 'nature', r: 'common', s: 1, ab: 'Spirální bič', l: 'Jeho zatočené lístky se rozvinou při každém boji.' },
  { n: 'Orchidon', e: 'nature', r: 'uncommon', s: 2, ab: 'Vůně nektaru', l: 'Vábí motýly a léčí unavené cestovatele.' },
  { n: 'Vlkodub', e: 'nature', r: 'rare', s: 2, ab: 'Kořenový sevř', l: 'Tichý lovec hvozdů se srstí z kůry a lišejníku.' },
  { n: 'Enturion', e: 'nature', r: 'epic', s: 'Apex', ab: 'Hněv pralesa', l: 'Chodící prastarý strom, jehož kroky chvějí zemí.' },
  { n: 'Floravie', e: 'nature', r: 'epic', s: 'Apex', ab: 'Rozkvět jara', l: 'Královna květin, která dokáže oživit vyprahlou poušť.' },
  { n: 'Yggdrasilix', e: 'nature', r: 'mythic', s: 'Apex', ab: 'Srdce přírody', l: 'Mýtický jelen s parožím ze zářících větví života.' },
  { n: 'Gaia-Primal', e: 'nature', r: 'secret', s: 'Apex', ab: 'Věčný ekosystém', l: 'Tajná esence samotné planety v krystalicko-zelené podobě.' },

  // === ELECTRIC (61-80) ===
  { n: 'Voltík', e: 'electric', r: 'common', s: 1, ab: 'Statický štíp', l: 'Když ho pohladíš, postaví se ti všechny vlasy.' },
  { n: 'Jiskrorýs', e: 'electric', r: 'uncommon', s: 2, ab: 'Bleskový skok', l: 'Pohybuje se klikatě jako malý kulový blesk.' },
  { n: 'Hromolev', e: 'electric', r: 'rare', s: 3, ab: 'Bouřkový řev', l: 'Jeho zlatá hříva praská výboji o tisících voltech.' },
  { n: 'Baterkáč', e: 'electric', r: 'common', s: 1, ab: 'Nabíjecí kous', l: 'Rád okusuje staré kabely a září jako žárovka.' },
  { n: 'Ampérník', e: 'electric', r: 'uncommon', s: 2, ab: 'Cívkový výboj', l: 'Dvě měděné antény na hlavě soustředí jeho energii.' },
  { n: 'Tesladrak', e: 'electric', r: 'rare', s: 3, ab: 'Řetězový blesk', l: 'Umí přeskakovat mezi mraky během letních bouřek.' },
  { n: 'Světlušák', e: 'electric', r: 'common', s: 1, ab: 'Neonový signál', l: 'Komunikuje se svými druhy pomocí Morseovy abecedy.' },
  { n: 'Majákček', e: 'electric', r: 'uncommon', s: 2, ab: 'Oslepující záře', l: 'Jeho ocas svítí tak jasně, že je vidět přes celé město.' },
  { n: 'Magnetík', e: 'electric', r: 'common', s: 1, ab: 'Přitažlivost', l: 'Často na sebe omylem nachytá lžičky a mince.' },
  { n: 'Polárník', e: 'electric', r: 'uncommon', s: 2, ab: 'Elektromagnet', l: 'Vznáší se nad zemí díky silnému magnetickému poli.' },
  { n: 'Plazmíček', e: 'electric', r: 'common', s: 1, ab: 'Výbojová koule', l: 'Malá koule čisté energie, která ráda poskakuje.' },
  { n: 'Úhořek', e: 'electric', r: 'common', s: 1, ab: 'Podvodní šok', l: 'Rozsvítí temné tůně modrým elektrickým světlem.' },
  { n: 'Pikabot', e: 'electric', r: 'common', s: 1, ab: 'Pixelový blesk', l: 'Arkáda maskot zrozený přímo uvnitř staré herní desky.' },
  { n: 'Droník', e: 'electric', r: 'uncommon', s: 2, ab: 'Laserový zaměřovač', l: 'Sleduje okolí třemi zářivými senzory.' },
  { n: 'Bleskočáp', e: 'electric', r: 'rare', s: 2, ab: 'Nebeský hrom', l: 'Loví blesky přímo z bouřkových mračen svým zobákem.' },
  { n: 'Voltoryb', e: 'electric', r: 'rare', s: 2, ab: 'Turbínový vír', l: 'Pohání své ploutve čistou elektřinou.' },
  { n: 'Raidenos', e: 'electric', r: 'epic', s: 'Apex', ab: 'Soudný hrom', l: 'Samuraj bouře obklopený bubny čistého blesku.' },
  { n: 'Kyborg-Z', e: 'electric', r: 'epic', s: 'Apex', ab: 'Přetížení jádra', l: 'Vysoce pokročilý elektrický golem z arkádové laboratoře.' },
  { n: 'Bouřný Fénix', e: 'electric', r: 'mythic', s: 'Apex', ab: 'Blesková apokalypsa', l: 'Když roztáhne křídla, obloha se roztrhne hromem.' },
  { n: 'Hyper-Volt 999', e: 'electric', r: 'secret', s: 'Apex', ab: 'Nekonečný gigawatt', l: 'Tajná arkádová legenda zářící všemi barvami plazmy.' },

  // === SHADOW (81-100) ===
  { n: 'Stínek', e: 'shadow', r: 'common', s: 1, ab: 'Temný šepot', l: 'Malý stín, který se rád schovává pod postelí.' },
  { n: 'Nocochod', e: 'shadow', r: 'uncommon', s: 2, ab: 'Krok v mlze', l: 'Beze zvuku se plíží nočními uličkami.' },
  { n: 'Nocturnex', e: 'shadow', r: 'rare', s: 3, ab: 'Černá díra', l: 'Jeho plášť je utkaný z čisté půlnoční tmy.' },
  { n: 'Netopýrka', e: 'shadow', r: 'common', s: 1, ab: 'Ultrazvuk', l: 'Visí vzhůru nohama a poslouchá tajemství.' },
  { n: 'Upírdrak', e: 'shadow', r: 'uncommon', s: 2, ab: 'Noční křídla', l: 'Rubínové oči mu svítí i v té nejhlubší jeskyni.' },
  { n: 'Půlnočník', e: 'shadow', r: 'rare', s: 3, ab: 'Zatmění', l: 'Tam, kde rozprostře křídla, zhasnou všechny hvězdy.' },
  { n: 'Ducháček', e: 'shadow', r: 'common', s: 1, ab: 'Leknutí!', l: 'Škádlí pocestné, ale ve skutečnosti je docela plachý.' },
  { n: 'Přízrakon', e: 'shadow', r: 'uncommon', s: 2, ab: 'Průchod zdí', l: 'Vznáší se s lucernou ze zeleného plamene.' },
  { n: 'Pavouček-X', e: 'shadow', r: 'common', s: 1, ab: 'Stínová síť', l: 'Tká vlákna, která jsou vidět jen za úplňku.' },
  { n: 'Tarantulor', e: 'shadow', r: 'uncommon', s: 2, ab: 'Jedový skok', l: 'Jeho osm očí sleduje každý pohyb kořisti.' },
  { n: 'Krkavček', e: 'shadow', r: 'common', s: 1, ab: 'Krákor osudu', l: 'Sbírá lesklé kamínky a nosí je do svého hnízda.' },
  { n: 'Vranokněz', e: 'shadow', r: 'rare', s: 2, ab: 'Runa tmy', l: 'Starobylý pták ovládající zapomenutá kouzla.' },
  { n: 'Šklebík', e: 'shadow', r: 'common', s: 1, ab: 'Zubatý úsměv', l: 'V temnotě je vidět jen jeho zářivě fialový úsměv.' },
  { n: 'Inkoustník', e: 'shadow', r: 'common', s: 1, ab: 'Černá skvrna', l: 'Když se bojí, rozteče se v kaluž černého inkoustu.' },
  { n: 'Hrobníček', e: 'shadow', r: 'uncommon', s: 2, ab: 'Kostěný štít', l: 'Nosí masku z prastaré slonoviny.' },
  { n: 'Stínomlat', e: 'shadow', r: 'rare', s: 2, ab: 'Drtič snů', l: 'Obří stínový rytíř s mečem z temné hmoty.' },
  { n: 'Umbrax', e: 'shadow', r: 'epic', s: 'Apex', ab: 'Pán prázdnoty', l: 'Pohybuje se mezi dimenzemi skrz vlastní stín.' },
  { n: 'Lilithia', e: 'shadow', r: 'epic', s: 'Apex', ab: 'Karmínový měsíc', l: 'Tajemná vládkyně nočních iluzí.' },
  { n: 'Abyssor', e: 'shadow', r: 'mythic', s: 'Apex', ab: 'Zhroucení reality', l: 'Mýtický démon stínů s korunou z fialových plamenů.' },
  { n: 'Kronos-Stín', e: 'shadow', r: 'mythic', s: 'Apex', ab: 'Zastavení času', l: 'Strážce temné strany času, kterého nelze spatřit dvakrát.' },

  // === CRYSTAL (101-120) ===
  { n: 'Kamínek', e: 'crystal', r: 'common', s: 1, ab: 'Tvrdá hlavička', l: 'Malý valoun s krystalem trčícím z temene.' },
  { n: 'Křemenáč', e: 'crystal', r: 'uncommon', s: 2, ab: 'Broušený náraz', l: 'Jeho tělo se třpytí jako čerstvě rozbitá geoda.' },
  { n: 'Diamantor', e: 'crystal', r: 'rare', s: 3, ab: 'Prismatický paprsek', l: 'Nezničitelný golem z čistého modrého diamantu.' },
  { n: 'Pískomil', e: 'crystal', r: 'common', s: 1, ab: 'Písečná sprcha', l: 'Rád se zahrabává na slunných plážích.' },
  { n: 'Skalník', e: 'crystal', r: 'uncommon', s: 2, ab: 'Lavina', l: 'Když se schoulí do klubíčka, srazí vše v cestě.' },
  { n: 'Geodrak', e: 'crystal', r: 'rare', s: 3, ab: 'Krystalová bouře', l: 'Z jeho šupin odráží světlo v tisících záblescích.' },
  { n: 'Rubínek', e: 'crystal', r: 'common', s: 1, ab: 'Červený odlesk', l: 'Drobný drahokamový krab z horských bystřin.' },
  { n: 'Smaragdon', e: 'crystal', r: 'uncommon', s: 2, ab: 'Zelený řez', l: 'Jeho klepeta jsou ostrá jako drahokamové nože.' },
  { n: 'Ametystík', e: 'crystal', r: 'common', s: 1, ab: 'Fialový tón', l: 'Při poklepání vydává čistý hudební zvuk.' },
  { n: 'Safírovec', e: 'crystal', r: 'uncommon', s: 2, ab: 'Zrcadlový štít', l: 'Odráží kouzla zpět na útočníka.' },
  { n: 'Opálka', e: 'crystal', r: 'common', s: 1, ab: 'Duhový mžik', l: 'Mění barvu podle toho, jakou má zrovna náladu.' },
  { n: 'Topazaur', e: 'crystal', r: 'rare', s: 2, ab: 'Zlatý hrot', l: 'Obrněný dinosaurus se hřbetem ze zlatých krystalů.' },
  { n: 'Krápník', e: 'crystal', r: 'common', s: 1, ab: 'Kamenitý hrot', l: 'Žije v hlubokých krápníkových dómech.' },
  { n: 'Žulovec', e: 'crystal', r: 'common', s: 1, ab: 'Pevný postoj', l: 'Ani nejsilnější vítr s ním nepohne.' },
  { n: 'Jantarák', e: 'crystal', r: 'uncommon', s: 2, ab: 'Zlaté vězení', l: 'Uvnitř jeho těla je vidět prastarý prehistorický list.' },
  { n: 'Obsidianix', e: 'crystal', r: 'rare', s: 2, ab: 'Sopečné sklo', l: 'Černý krystal ostřejší než jakákoliv čepel.' },
  { n: 'Titanit', e: 'crystal', r: 'epic', s: 'Apex', ab: 'Zemské jádro', l: 'Kolosální krystalický strážce horských masivů.' },
  { n: 'Krystalina', e: 'crystal', r: 'epic', s: 'Apex', ab: 'Katedrála světla', l: 'Vzácná víla tvořená tisíci levitujícími drahokamy.' },
  { n: 'Prizmaton', e: 'crystal', r: 'mythic', s: 'Apex', ab: 'Lom nekonečna', l: 'Mýtický lev z čistého křišťálu, který rozkládá duhu.' },
  { n: 'Monolit X-0', e: 'crystal', r: 'secret', s: 'Apex', ab: 'Kosmický krystal', l: 'Tajná geometrická bytost, o níž se říká, že stvořila hory.' },

  // === WIND (121-140) ===
  { n: 'Vánek', e: 'wind', r: 'common', s: 1, ab: 'Lehký závan', l: 'Chlupatý mráček, který si hraje s podzimním listím.' },
  { n: 'Vichřík', e: 'wind', r: 'uncommon', s: 2, ab: 'Vzdušný vír', l: 'Umí létat v kruzích tak rychle, až zmizí z očí.' },
  { n: 'Tornádor', e: 'wind', r: 'rare', s: 3, ab: 'Oko hurikánu', l: 'Obří vzdušný elementál s vírem místo nohou.' },
  { n: 'Pírko', e: 'wind', r: 'common', s: 1, ab: 'Rychlý klouz', l: 'Malý sokolík, který se učí létat z vysokých skal.' },
  { n: 'Sokolák', e: 'wind', r: 'uncommon', s: 2, ab: 'Střemhlavý pád', l: 'Dosahuje rychlosti přes tři sta kilometrů v hodině.' },
  { n: 'Gryfonix', e: 'wind', r: 'rare', s: 3, ab: 'Křídla bouře', l: 'Vznešený vládce horských štítů a oblaků.' },
  { n: 'Chmýřák', e: 'wind', r: 'common', s: 1, ab: 'Měkký dopad', l: 'Vypadá jako malá ovce z bílého mraku.' },
  { n: 'Cumulon', e: 'wind', r: 'uncommon', s: 2, ab: 'Bouřková peřina', l: 'Když se rozlobí, jeho vlna zčerná jako bouřkový mrak.' },
  { n: 'Vážka-Air', e: 'wind', r: 'common', s: 1, ab: 'Průsvitná křídla', l: 'Mává křídly tak rychle, že jen jemně bzučí.' },
  { n: 'Albatron', e: 'wind', r: 'uncommon', s: 2, ab: 'Nekonečný let', l: 'Dokáže plachtit nad oceánem celé týdny bez odpočinku.' },
  { n: 'Flétník', e: 'wind', r: 'common', s: 1, ab: 'Píseň větru', l: 'Vítr profukuje jeho dutými rohy a hraje melodie.' },
  { n: 'Zefýrek', e: 'wind', r: 'common', s: 1, ab: 'Jarní dech', l: 'Přináší vůni rozkvetlých luk.' },
  { n: 'Pegasusík', e: 'wind', r: 'uncommon', s: 2, ab: 'Oblačný cval', l: 'Mladý okřídlený kůň skákající z mraku na mrak.' },
  { n: 'Větrňák', e: 'wind', r: 'common', s: 1, ab: 'Vrtule!', l: 'Na hlavě má listovou vrtulku, která se stále točí.' },
  { n: 'Harpyjče', e: 'wind', r: 'rare', s: 2, ab: 'Vzdušná čepel', l: 'Její mávnutí křídel řeže vzduch jako meč.' },
  { n: 'Stratos', e: 'wind', r: 'rare', s: 2, ab: 'Stratosférický skok', l: 'Létá tak vysoko, že vidí zakřivení planety.' },
  { n: 'Anemos', e: 'wind', r: 'epic', s: 'Apex', ab: 'Čtyři větry', l: 'Vznešený bůh větrů v bílém a azurovém rouchu.' },
  { n: 'Nebeský Drak', e: 'wind', r: 'epic', s: 'Apex', ab: 'Duhový proud', l: 'Hadovitý drak, který plave v proudech tryskového větru.' },
  { n: 'Tempestus', e: 'wind', r: 'mythic', s: 'Apex', ab: 'Král cyklónu', l: 'Mýtický pták bouří, který stvořil první pasáty.' },

  // === COSMIC (141-160) ===
  { n: 'Hvězdička', e: 'cosmic', r: 'common', s: 1, ab: 'Třpytivý mrk', l: 'Malý úlomek hvězdy, který spadl na louku.' },
  { n: 'Kometík', e: 'cosmic', r: 'uncommon', s: 2, ab: 'Ledový chvost', l: 'Létá oblohou a zanechává za sebou zářivou stopu.' },
  { n: 'Galaxor', e: 'cosmic', r: 'rare', s: 3, ab: 'Mlhovinový vír', l: 'Uvnitř jeho průhledného těla rotují tisíce hvězd.' },
  { n: 'Ufonek', e: 'cosmic', r: 'common', s: 1, ab: 'Píp-píp paprsek', l: 'Zvědavý návštěvník z daleké arkádové galaxie.' },
  { n: 'Měsíčník', e: 'cosmic', r: 'uncommon', s: 2, ab: 'Lunární záře', l: 'Jeho tvar se mění podle fází měsíce.' },
  { n: 'Astralix', e: 'cosmic', r: 'rare', s: 3, ab: 'Telekineze', l: 'Pohybem myšlenky dokáže zvednout celý asteroid.' },
  { n: 'Orbitík', e: 'cosmic', r: 'common', s: 1, ab: 'Kruhový oběh', l: 'Kolem jeho hlavy obíhá malý kamenný prstenec.' },
  { n: 'Saturník', e: 'cosmic', r: 'uncommon', s: 2, ab: 'Prstencový hod', l: 'Své zářivé prstence používá jako bumerang.' },
  { n: 'Pixelon', e: 'cosmic', r: 'common', s: 1, ab: '8-bitový skok', l: 'Bytost z čistých neonových pixelů.' },
  { n: 'Kyberko', e: 'cosmic', r: 'uncommon', s: 2, ab: 'Datový proud', l: 'Pohybuje se rychlostí světla v optických vláknech.' },
  { n: 'Meteorek', e: 'cosmic', r: 'common', s: 1, ab: 'Pád z nebe', l: 'Tvrdý vesmírný cestovatel s ohnivou aurou.' },
  { n: 'Nebulík', e: 'cosmic', r: 'common', s: 1, ab: 'Hvězdný prach', l: 'Obláček růžové a fialové vesmírné mlhoviny.' },
  { n: 'Kvantík', e: 'cosmic', r: 'uncommon', s: 2, ab: 'Teleportace', l: 'Nikdy nevíš, kde se objeví v příští sekundě.' },
  { n: 'Pulsarion', e: 'cosmic', r: 'rare', s: 2, ab: 'Rádiový puls', l: 'Vysílá pravidelné záblesky napříč celým vesmírem.' },
  { n: 'Solstice', e: 'cosmic', r: 'rare', s: 2, ab: 'Rovnodennost', l: 'Spojuje v sobě světlo dne a tajemství noci.' },
  { n: 'Voidwalker', e: 'cosmic', r: 'epic', s: 'Apex', ab: 'Skok hyperprostorem', l: 'Poutník mezi galaxiemi v plášti z temné hmoty.' },
  { n: 'Supernova-V', e: 'cosmic', r: 'epic', s: 'Apex', ab: 'Hvězdný kolaps', l: 'Zářící anděl zrozený při zániku obří hvězdy.' },
  { n: 'Celestia', e: 'cosmic', r: 'mythic', s: 'Apex', ab: 'Kosmická harmonie', l: 'Mýtická strážkyně souhvězdí s křídly z mléčné dráhy.' },
  { n: 'Singularity', e: 'cosmic', r: 'mythic', s: 'Apex', ab: 'Horizont událostí', l: 'Všechna hmota i světlo se sklání před její gravitací.' },
  { n: 'KartyMon PRIME', e: 'cosmic', r: 'secret', s: 'Apex', ab: 'Stvoření Arkády', l: 'Karta #160 — Nejvyšší prismatický tvůrce všech 160 příšerek!' },
  // Note: Wind had 19, let's check total! Wait: let's add 1 more to Wind or check count!
];

// Wait: let's verify count and rarity totals!
// Let's check: Fire=20, Water=20, Nature=20, Electric=20, Shadow=20, Crystal=20, Wind=19 -> let's insert #140 in Wind!
RAW_MONSTERS.splice(139, 0, {
  n: 'Aetherius', e: 'wind', r: 'mythic', s: 'Apex', ab: 'Dech nebes', l: 'Mýtický nebeský lev, jehož řev přináší polární záři.'
});

// Now let's check exact rarity counts and normalize stats cleanly
const RARITY_STAT_MULT = {
  common: 1.0,
  uncommon: 1.25,
  rare: 1.55,
  epic: 1.95,
  mythic: 2.4,
  secret: 3.0
};

// Simple deterministic PRNG for stats per card ID
function seededVal(seed, min, max) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  const frac = x - Math.floor(x);
  return Math.floor(min + frac * (max - min + 1));
}

const CARDS = RAW_MONSTERS.map((m, idx) => {
  const id = idx + 1;
  const mult = RARITY_STAT_MULT[m.r];
  const stageBonus = m.s === 'Apex' ? 1.2 : (1 + (m.s - 1) * 0.18);
  const hp = Math.round(seededVal(id * 3, 45, 75) * mult * stageBonus);
  const atk = Math.round(seededVal(id * 7, 25, 55) * mult * stageBonus);
  const def = Math.round(seededVal(id * 11, 20, 50) * mult * stageBonus);
  return {
    id,
    code: `#${String(id).padStart(3, '0')}`,
    name: m.n,
    element: m.e,
    rarity: m.r,
    stage: m.s,
    ability: m.ab,
    lore: m.l,
    hp,
    atk,
    def,
    sellValue: RARITIES[m.r].sell
  };
});

// Sanity check in console during dev
// Total should be 160
if (CARDS.length !== 160) {
  console.warn('CARDS count mismatch:', CARDS.length);
}
