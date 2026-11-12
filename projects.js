/**
 * Seznam projektů pro web provasek.xyz
 * Pro přidání nového projektu stačí zkopírovat jeden blok a upravit údaje.
 */
const PROJECTS = [
    {
        id: "polytropia",
        title: "Polytropia: Civilizace Hvězd",
        category: "games",
        badge: "⭐ Hlavní hra",
        badgeType: "featured",
        icon: "👑",
        description: "Kompletní tahová 4X strategická hra běžící přímo v prohlížeči. Buduj impérium, verbuj vojska, objevuj kontinenty a technologie. Nabízí hru proti chytré AI i lokální multiplayer pro více hráčů.",
        tags: ["Phaser 3", "JavaScript", "HTML5 Canvas", "4X Strategie"],
        playUrl: "/projects/polytropia/",
        githubUrl: "https://github.com/provasek/clash-of-fidgets",
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
        playUrl: null, // Zatím bez webové verze (nebo doplň cestu)
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
