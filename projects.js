/**
 * Seznam projektů pro web provasek.xyz
 * Pro přidání nového projektu stačí zkopírovat jeden blok a upravit údaje.
 */
const PROJECTS = [
    {
        id: "alchymie-pisku",
        title: "Alchymie Písku",
        category: "games",
        badge: "⚗️ Fyzikální Sandbox",
        badgeType: "featured",
        icon: "⚗️",
        description: "Interaktivní 2D fyzikální a chemický sandbox (Falling Sand) s 18 prvky — písek, voda, láva, kyselina, olej, střelný prach, elektřina, semínka i sklo s reálnými reakcemi a předpřipravenými scénami.",
        tags: ["HTML5 Canvas", "JavaScript", "Buněčný automat", "Fyzika"],
        playUrl: "/projects/alchymie-pisku/",
        githubUrl: "https://github.com/provasek/alchymie-pisku",
        featured: true
    },
    {
        id: "aetheris",
        title: "Aetheris: Orbitální Kolonie",
        category: "games",
        badge: "🚀 Mobilní Tycoon",
        badgeType: "featured",
        icon: "🛰️",
        description: "Polonekonečný vesmírný těžební tycoon (PWA) s interaktivní 2D stanicí, autonomními drony, výzkumem, 15 achievementy, procedurální ambientní hudbou a prestižním systémem.",
        tags: ["HTML5 Canvas", "PWA", "Web Audio API", "Tycoon"],
        playUrl: "/projects/aetheris/",
        githubUrl: "https://github.com/provasek/aetheris",
        featured: true
    },
    {
        id: "jarvis",
        title: "J.A.R.V.I.S. // Mark VII OS",
        category: "ai",
        badge: "⚡ Sci-Fi HUD",
        badgeType: "ai",
        icon: "🤖",
        description: "Futuristické holografické rozhraní Iron Mana s animovaným Arc Reactorem v reálném čase, kinetickými zvukovými efekty Web Audio, Stark protokoly (Defense Shield, House Party) a hlasovým rozhraním.",
        tags: ["Canvas HUD", "Web Audio API", "Google Gemini", "Stark Industries"],
        playUrl: "/projects/jarvis/",
        githubUrl: "https://github.com/provasek/jarvis",
        featured: true
    },
    {
        id: "polytropia",
        title: "Polytropia: Civilizace Hvězd",
        category: "games",
        badge: "⭐ 4X Hra",
        badgeType: "featured",
        icon: "👑",
        description: "Kompletní tahová 4X strategická hra běžící přímo v prohlížeči. Buduj impérium, verbuj vojska, objevuj kontinenty a technologie. Nabízí hru proti chytré AI i lokální multiplayer pro více hráčů.",
        tags: ["Phaser 3", "JavaScript", "HTML5 Canvas", "4X Strategie"],
        playUrl: "/projects/polytropia/",
        githubUrl: "https://github.com/provasek/web",
        featured: true
    },
    {
        id: "space-invaders",
        title: "Space Invaders",
        category: "games",
        badge: "Arkáda",
        badgeType: "standard",
        icon: "👾",
        description: "Reimplementace legendární arkádové vesmírné střílečky. Chraň Zemi před vlnami mimozemských nájezdníků v dynamické retro hratelnosti.",
        tags: ["JavaScript", "Game Dev", "Retro Arcade"],
        playUrl: null,
        githubUrl: "https://github.com/provasek/space-invaders",
        featured: false
    },
    {
        id: "indicke-zeleznice",
        title: "Predikce zpoždění indických železnic",
        category: "ai",
        badge: "Machine Learning",
        badgeType: "ai",
        icon: "🚆",
        description: "Semestrální projekt zaměřený na analýzu velkých dat a trénování vícevrstvého perceptronu (MLP) pro předpovídání zpoždění vlakových spojů na indické železniční síti.",
        tags: ["Python", "MLP", "Neuronové sítě", "Data Science"],
        playUrl: null,
        githubUrl: "https://github.com/provasek/predikce-zpozdeni-indickych-zeleznic",
        featured: false
    },
    {
        id: "language-recognizer",
        title: "Language Recognizer",
        category: "ai",
        badge: "NLP",
        badgeType: "ai",
        icon: "🌍",
        description: "Systém pro automatické rozpoznávání a klasifikaci přirozeného jazyka ze zadaného textu pomocí metod zpracování přirozeného jazyka.",
        tags: ["Python", "NLP", "Text Processing", "Klasifikace"],
        playUrl: null,
        githubUrl: "https://github.com/provasek/language-recognizer",
        featured: false
    }
];
