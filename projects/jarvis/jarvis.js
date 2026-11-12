// J.A.R.V.I.S. - Core System Interface Script (v2.1)
// Stark Industries Neural OS

document.addEventListener("DOMContentLoaded", () => {
    // State
    const state = {
        sfxEnabled: true,
        ttsEnabled: true,
        isListening: false,
        isSpeaking: false,
        wakeMode: false,
        wakeArmedUntil: 0,
        coreIntensity: 1.0,
        coreTargetIntensity: 1.0,
        threatLevel: "NOMINAL",
        activeProtocol: null,
        hasApiKey: false,
        spotifyRunning: false,
        backendUrl: localStorage.getItem("jarvis_backend_url") || "",
        notes: []
    };

    function apiUrl(path) {
        const b = (state.backendUrl || "").trim().replace(/\/+$/, "");
        return b ? (b + path) : path;
    }

    // DOM Elements
    const canvas = document.getElementById("arcReactorCanvas");
    const ctx = canvas.getContext("2d");
    const coreStatusEl = document.getElementById("core-status");
    const liveClockEl = document.getElementById("live-clock");
    const sysUptimeEl = document.getElementById("sys-uptime");
    const threatLevelEl = document.getElementById("threat-level");
    const apiStatusBadge = document.getElementById("api-status-badge");
    const btnConfigOpen = document.getElementById("btn-config-open");

    // Telemetry Elements
    const cpuPercentEl = document.getElementById("cpu-percent");
    const cpuBarEl = document.getElementById("cpu-bar");
    const cpuCoresGridEl = document.getElementById("cpu-cores-grid");
    const ramTextEl = document.getElementById("ram-usage-text");
    const ramBarEl = document.getElementById("ram-bar");
    const diskTextEl = document.getElementById("disk-usage-text");
    const diskBarEl = document.getElementById("disk-bar");
    const batteryStatusEl = document.getElementById("battery-status");
    const netTrafficEl = document.getElementById("net-traffic");
    const processListEl = document.getElementById("process-list");

    // Weather Elements
    const weatherCityEl = document.getElementById("weather-city");
    const weatherIconEl = document.getElementById("weather-icon");
    const weatherTempEl = document.getElementById("weather-temp");
    const weatherDescEl = document.getElementById("weather-desc");
    const weatherStatsEl = document.getElementById("weather-stats");

    // Media / Spotify Elements
    const spotifyDot = document.getElementById("spotify-dot");
    const mediaStatusLabel = document.getElementById("media-status-label");
    const nowPlayingTitle = document.getElementById("now-playing-title");
    const nowPlayingArtist = document.getElementById("now-playing-artist");
    const audioEqualizer = document.getElementById("audio-equalizer");
    const activeTimersDeck = document.getElementById("active-timers-deck");
    const announcedTimers = new Set();

    // Chat & Voice Elements
    const chatStreamEl = document.getElementById("chat-stream");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const btnMic = document.getElementById("btn-mic");
    const micText = document.getElementById("mic-text");
    const voiceIndicator = document.getElementById("voice-indicator");
    const btnAudioMute = document.getElementById("btn-audio-mute");
    const btnTtsToggle = document.getElementById("btn-tts-toggle");

    // Notes Elements
    const notesContainer = document.getElementById("notes-container");
    const btnToggleNotes = document.getElementById("btn-toggle-notes");

    // Config Modal Elements
    const configModal = document.getElementById("config-modal");
    const btnConfigClose = document.getElementById("btn-config-close");
    const inputApiKey = document.getElementById("input-api-key");
    const inputCity = document.getElementById("input-city");
    const inputLat = document.getElementById("input-lat");
    const inputLon = document.getElementById("input-lon");
    const inputEmailAddress = document.getElementById("input-email-address");
    const inputEmailPassword = document.getElementById("input-email-password");
    const inputEmailHost = document.getElementById("input-email-host");
    const inputHueIp = document.getElementById("input-hue-ip");
    const inputHueUser = document.getElementById("input-hue-user");
    const inputHueGroup = document.getElementById("input-hue-group");
    const btnHuePair = document.getElementById("btn-hue-pair");
    const btnHueRooms = document.getElementById("btn-hue-rooms");
    const hueRoomsHint = document.getElementById("hue-rooms-hint");
    const btnWakeToggle = document.getElementById("btn-wake-toggle");
    const inputBackendUrl = document.getElementById("input-backend-url");
    const btnSaveConfig = document.getElementById("btn-save-config");
    const configStatusMsg = document.getElementById("config-status-msg");

    // ==========================================
    // 1. PROCEDURAL SOUND SYNTHESIZER (Web Audio)
    // ==========================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, type = 'sine', duration = 0.15, vol = 0.12) {
        if (!state.sfxEnabled) return;
        try {
            const actx = getAudioContext();
            if (!actx) return;
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, actx.currentTime);
            gain.gain.setValueAtTime(vol, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            osc.stop(actx.currentTime + duration);
        } catch (e) {}
    }

    function playBootSound() {
        if (!state.sfxEnabled) return;
        try {
            const actx = getAudioContext();
            if (!actx) return;
            const now = actx.currentTime;
            [440, 554, 659, 880, 1108].forEach((f, idx) => {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now + idx * 0.08);
                gain.gain.setValueAtTime(0.05, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.6);
            });
        } catch (e) {}
    }

    function playProtocolSound() {
        playTone(700, 'triangle', 0.1, 0.1);
        setTimeout(() => playTone(1200, 'sine', 0.2, 0.12), 100);
    }

    function playWarningSound() {
        playTone(320, 'sawtooth', 0.25, 0.15);
        setTimeout(() => playTone(280, 'sawtooth', 0.3, 0.15), 180);
    }

    function playTimerAlarmSound() {
        if (!state.sfxEnabled) return;
        try {
            const actx = getAudioContext();
            if (!actx) return;
            const now = actx.currentTime;
            [880, 1108, 1320, 1760, 1320, 1760].forEach((freq, idx) => {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0.15, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.35);
            });
        } catch (e) {}
    }

    // ==========================================
    // 2. TEXT-TO-SPEECH (TTS) & VOICE RECOGNITION
    // ==========================================
    let voices = [];
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
        };
    }

    function speakText(text) {
        if (!state.ttsEnabled || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        } catch(e){}

        const cleanText = text.replace(/[*#_`]/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        if (voices.length === 0) voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes("cs") || v.lang.includes("cz")) || 
                               voices.find(v => v.name.includes("UK") || v.name.includes("George") || v.name.includes("Oliver") || v.lang.includes("en-GB")) ||
                               voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.pitch = 0.95;
        utterance.rate = 1.05;

        utterance.onstart = () => {
            state.isSpeaking = true;
            state.coreTargetIntensity = 2.2;
            coreStatusEl.textContent = "TRANSMITTING";
            coreStatusEl.style.color = "#00f3ff";
        };

        utterance.onend = () => {
            state.isSpeaking = false;
            state.coreTargetIntensity = 1.0;
            coreStatusEl.textContent = "ONLINE";
            coreStatusEl.style.color = "#ffffff";
        };

        utterance.onerror = (err) => {
            console.warn("TTS error:", err);
            state.isSpeaking = false;
            state.coreTargetIntensity = 1.0;
            coreStatusEl.textContent = "ONLINE";
            coreStatusEl.style.color = "#ffffff";
        };

        window.speechSynthesis.speak(utterance);
    }

    // Speech-To-Text
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let gotFinalResult = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'cs-CZ';

        recognition.onstart = () => {
            gotFinalResult = false;
            state.isListening = true;
            btnMic.classList.add("listening");
            micText.textContent = "POSLOUCHÁM...";
            voiceIndicator.textContent = "JARVIS NASLOUCHÁ VAŠEMU HLASU (MLUVTE)...";
            playTone(880, 'sine', 0.15, 0.1);
            state.coreTargetIntensity = 1.8;
        };

        recognition.onresult = (event) => {
            let interim = "";
            let finalText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += text;
                } else {
                    interim += text;
                }
            }
            if (interim) {
                voiceIndicator.textContent = `POSLOUCHÁM: "${interim}..."`;
            }
            if (finalText.trim()) {
                gotFinalResult = true;
                const transcript = finalText.trim();
                if (state.wakeMode) {
                    if (state.isSpeaking) return;
                    const wakeRegex = /(?:hej\s+|hey\s+|ahoj\s+)?(?:jarvisi|jarvise|jarvis|jarvy|džárvis[ie]?|džarvis[ie]?|žárvis[ie]?)/i;
                    const wm = transcript.match(wakeRegex);
                    if (wm) {
                        const cmdAfter = transcript.slice(wm.index + wm[0].length).replace(/^[\s,.:;!?-]+/, "").trim();
                        if (cmdAfter.length >= 2) {
                            state.wakeArmedUntil = 0;
                            voiceIndicator.textContent = `WAKE PŘÍKAZ: "${cmdAfter}"`;
                            chatInput.value = cmdAfter;
                            handleUserMessage(cmdAfter);
                        } else {
                            state.wakeArmedUntil = Date.now() + 10000;
                            playTone(1046, 'sine', 0.14, 0.12);
                            voiceIndicator.textContent = "ANO, PANE? (POSLOUCHÁM PŘÍKAZ...)";
                        }
                    } else if (Date.now() < state.wakeArmedUntil) {
                        state.wakeArmedUntil = 0;
                        voiceIndicator.textContent = `WAKE PŘÍKAZ: "${transcript}"`;
                        chatInput.value = transcript;
                        handleUserMessage(transcript);
                    }
                } else {
                    voiceIndicator.textContent = `ZACHYCENO: "${transcript}"`;
                    chatInput.value = transcript;
                    try { recognition.stop(); } catch (e) {}
                    stopListening();
                    handleUserMessage(transcript);
                }
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                state.wakeMode = false;
                if (btnWakeToggle) btnWakeToggle.innerHTML = `<span class="btn-bracket">[</span> 👂 WAKE "JARVISI": OFF <span class="btn-bracket">]</span>`;
                voiceIndicator.textContent = "MIKROFON BLOKOVÁN: Povolte přístup v řádku prohlížeče (ikona zámku 🔒 u URL).";
            } else if (event.error === 'audio-capture') {
                state.wakeMode = false;
                if (btnWakeToggle) btnWakeToggle.innerHTML = `<span class="btn-bracket">[</span> 👂 WAKE "JARVISI": OFF <span class="btn-bracket">]</span>`;
                voiceIndicator.textContent = "MIKROFON NENALEZEN: Zkontrolujte v Chromu (chrome://settings/content/microphone), že je vybraný 'Microphone Array (Realtek(R) Audio)'.";
            } else if (event.error === 'network') {
                voiceIndicator.textContent = "CHYBA SÍTĚ ŘEČI: Prohlížeč blokuje Google Speech API (použijte Chrome nebo Edge).";
            } else if (event.error === 'no-speech') {
                if (!state.wakeMode) {
                    voiceIndicator.textContent = "ŽÁDNÁ ŘEČ NEBYLA ZACHYCENA. ZKUSTE TO ZNOVU.";
                }
            } else if (event.error !== 'aborted') {
                voiceIndicator.textContent = `HLASOVÝ VSTUP CHYBA: ${event.error}`;
            }
            if (!state.wakeMode) {
                stopListening();
            }
        };

        recognition.onend = () => {
            if (state.wakeMode) {
                setTimeout(() => {
                    if (state.wakeMode) {
                        try { recognition.start(); } catch (e) {}
                    }
                }, 400);
                return;
            }
            if (!gotFinalResult && state.isListening && !voiceIndicator.textContent.includes("CHYBA") && !voiceIndicator.textContent.includes("BLOKOVÁN") && !voiceIndicator.textContent.includes("NENALEZEN")) {
                voiceIndicator.textContent = "POSLOUCHÁNÍ UKONČENO (Zkontrolujte mikrofon nebo zkuste znovu).";
            }
            stopListening();
        };
    } else {
        voiceIndicator.textContent = "HLASOVÉ ROZPOZNÁVÁNÍ NENÍ V TOMTO PROHLÍŽEČI PODPOROVÁNO. POUŽIJTE CHAT.";
    }

    function toggleListening() {
        if (!recognition) return;
        if (state.isListening) {
            try { recognition.stop(); } catch (e) {}
            stopListening();
        } else {
            getAudioContext();
            if ('speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (e) {}
            }
            try {
                recognition.start();
            } catch (e) {
                console.warn("Speech start error:", e);
                try { recognition.abort(); } catch (_) {}
                stopListening();
                voiceIndicator.textContent = "RESTARTUJI MIKROFON, KLIKNĚTE ZNOVU.";
            }
        }
    }

    function stopListening() {
        state.isListening = false;
        btnMic.classList.remove("listening");
        micText.textContent = "HLASOVÝ VSTUP";
        state.coreTargetIntensity = 1.0;
    }

    btnMic.addEventListener("click", toggleListening);

    if (btnWakeToggle) {
        btnWakeToggle.addEventListener("click", () => {
            if (!recognition) return;
            getAudioContext();
            state.wakeMode = !state.wakeMode;
            state.wakeArmedUntil = 0;
            if (state.wakeMode) {
                btnWakeToggle.innerHTML = `<span class="btn-bracket">[</span> 👂 WAKE "JARVISI": ON <span class="btn-bracket">]</span>`;
                btnWakeToggle.style.borderColor = "#ffbe0b";
                btnWakeToggle.style.color = "#ffbe0b";
                voiceIndicator.textContent = "WAKE REŽIM AKTIVNÍ: ŘEKNĚTE 'JARVISI ...'";
                if (!state.isListening) {
                    try { recognition.start(); } catch (e) {}
                }
            } else {
                btnWakeToggle.innerHTML = `<span class="btn-bracket">[</span> 👂 WAKE "JARVISI": OFF <span class="btn-bracket">]</span>`;
                btnWakeToggle.style.borderColor = "";
                btnWakeToggle.style.color = "";
                try { recognition.stop(); } catch (e) {}
                stopListening();
                voiceIndicator.textContent = "STISKNĚTE PRO DIKTOVÁNÍ NEBO PIŠTE NÍŽE";
            }
        });
    }

    // ==========================================
    // 3. HOLOGRAPHIC ARC REACTOR CANVAS RENDERER
    // ==========================================
    let angle1 = 0;
    let angle2 = 0;
    let angle3 = 0;
    let pulseTime = 0;
    const particles = [];

    for (let i = 0; i < 40; i++) {
        particles.push({
            r: Math.random() * 150 + 20,
            angle: Math.random() * Math.PI * 2,
            speed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.8 + 0.2
        });
    }

    // Safe Color Palette Generator (prevents hsl crash)
    function getHUDColors() {
        if (state.threatLevel === "DEFENSE") {
            return {
                main: "#ff0055",
                alpha: (a) => `rgba(255, 0, 85, ${a})`,
                gold: "#ff8800"
            };
        } else if (state.threatLevel === "PARTY") {
            const hue = Math.floor((Math.sin(pulseTime) * 0.5 + 0.5) * 360);
            return {
                main: `hsl(${hue}, 100%, 55%)`,
                alpha: (a) => `hsla(${hue}, 100%, 55%, ${a})`,
                gold: `hsl(${(hue + 60) % 360}, 100%, 65%)`
            };
        } else {
            return {
                main: "#00f3ff",
                alpha: (a) => `rgba(0, 243, 255, ${a})`,
                gold: "#ffbe0b"
            };
        }
    }

    function drawArcReactor() {
        try {
            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;

            ctx.clearRect(0, 0, width, height);

            state.coreIntensity += (state.coreTargetIntensity - state.coreIntensity) * 0.1;
            pulseTime += 0.04 * state.coreIntensity;
            angle1 += 0.008 * state.coreIntensity;
            angle2 -= 0.012 * state.coreIntensity;
            angle3 += 0.018 * state.coreIntensity;

            const colors = getHUDColors();
            const mainColor = colors.main;
            const goldColor = colors.gold;

            // Ambient center glow
            const glowRad = 180 + Math.sin(pulseTime * 2) * 15 * state.coreIntensity;
            const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRad);
            grad.addColorStop(0, colors.alpha(0.4));
            grad.addColorStop(0.4, colors.alpha(0.1));
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, glowRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(cx, cy);

            // Ring 1: Outer segmented circle with tick marks
            ctx.save();
            ctx.rotate(angle1);
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 12, 30, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, 195, 0, Math.PI * 2);
            ctx.stroke();

            ctx.setLineDash([]);
            for (let i = 0; i < 36; i++) {
                const rad = (i * 10 * Math.PI) / 180;
                const len = (i % 3 === 0) ? 12 : 5;
                ctx.beginPath();
                ctx.moveTo(Math.cos(rad) * (195 - len), Math.sin(rad) * (195 - len));
                ctx.lineTo(Math.cos(rad) * 195, Math.sin(rad) * 195);
                ctx.strokeStyle = (i % 3 === 0) ? goldColor : colors.alpha(0.5);
                ctx.lineWidth = (i % 3 === 0) ? 2 : 1;
                ctx.stroke();
            }
            ctx.restore();

            // Ring 2: Counter-rotating brackets
            ctx.save();
            ctx.rotate(angle2);
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                const start = (i * Math.PI) / 2 + 0.1;
                const end = start + Math.PI / 3;
                ctx.beginPath();
                ctx.arc(0, 0, 160, start, end);
                ctx.stroke();
            }
            for (let i = 0; i < 4; i++) {
                const dotAngle = (i * Math.PI) / 2;
                ctx.fillStyle = goldColor;
                ctx.beginPath();
                ctx.arc(Math.cos(dotAngle) * 160, Math.sin(dotAngle) * 160, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Ring 3: Reactor power cells
            ctx.save();
            ctx.rotate(angle3);
            const cellCount = 10;
            for (let i = 0; i < cellCount; i++) {
                const cellAngle = (i * 2 * Math.PI) / cellCount;
                ctx.save();
                ctx.rotate(cellAngle);
                ctx.fillStyle = colors.alpha(0.2);
                ctx.strokeStyle = mainColor;
                ctx.lineWidth = 1.5;
                ctx.fillRect(90, -10, 30, 20);
                ctx.strokeRect(90, -10, 30, 20);
                
                ctx.strokeStyle = goldColor;
                ctx.beginPath();
                ctx.moveTo(95, 0);
                ctx.lineTo(115, 0);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();

            // Particles
            particles.forEach(p => {
                p.angle += p.speed * state.coreIntensity;
                const px = Math.cos(p.angle) * p.r;
                const py = Math.sin(p.angle) * p.r;
                ctx.fillStyle = colors.alpha(p.opacity);
                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Center Triangular Core Element
            ctx.save();
            const corePulse = Math.sin(pulseTime * 3) * 4;
            ctx.rotate(-angle1 * 0.5);
            ctx.strokeStyle = "#ffffff";
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 20 * state.coreIntensity;
            ctx.lineWidth = 2.5;

            const triR = 45 + corePulse;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const ta = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                const tx = Math.cos(ta) * triR;
                const ty = Math.sin(ta) * triR;
                if (i === 0) ctx.moveTo(tx, ty);
                else ctx.lineTo(tx, ty);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 24 + corePulse * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = colors.alpha(0.5);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
            ctx.restore();
        } catch (err) {
            console.error("Arc Reactor render loop error:", err);
        }

        requestAnimationFrame(drawArcReactor);
    }

    drawArcReactor();

    canvas.addEventListener("click", () => {
        getAudioContext();
        playTone(1000, 'sine', 0.2, 0.15);
        state.coreTargetIntensity = 2.5;
        setTimeout(() => state.coreTargetIntensity = 1.0, 600);
        appendMessage("jarvis", "Reaktor MK-VII pracuje v optimálním výkonnostním spektru. Všechny buňky synchronizovány.");
    });

    // ==========================================
    // 4. CLOCK, WEATHER & TELEMETRY POLLING
    // ==========================================
    function updateClock() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        liveClockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    async function fetchWeather() {
        try {
            const res = await fetch(apiUrl("/api/weather"));
            if (!res.ok) return;
            const w = await res.json();
            weatherCityEl.textContent = w.city.toUpperCase();
            weatherIconEl.textContent = w.icon;
            weatherTempEl.textContent = `${w.temp}°C`;
            weatherDescEl.textContent = w.desc;
            weatherStatsEl.textContent = `Pocit: ${w.feels_like}°C | Vlhkost: ${w.humidity}% | Vítr: ${w.wind} km/h`;
        } catch (e) {
            console.warn("Weather error:", e);
            if (weatherCityEl && weatherCityEl.textContent === "---") {
                weatherCityEl.textContent = "PRAHA // MALIBU POINT";
                weatherIconEl.textContent = "☀️";
                weatherTempEl.textContent = "+18°C";
                weatherDescEl.textContent = "Jasno // Optimální";
                weatherStatsEl.textContent = "Pocit: 18°C | Vlhkost: 45% | Vítr: 12 km/h";
            }
        }
    }

    async function fetchTelemetry() {
        try {
            const res = await fetch(apiUrl("/api/telemetry"));
            if (!res.ok) return;
            const data = await res.json();

            // CPU
            cpuPercentEl.textContent = `${data.cpu_total}%`;
            cpuBarEl.style.width = `${data.cpu_total}%`;

            // Cores
            if (data.cpu_cores && data.cpu_cores.length > 0) {
                cpuCoresGridEl.innerHTML = data.cpu_cores.map((c, i) => `
                    <div class="core-mini-bar">
                        <span>C${i+1}</span>: <span class="val">${c}%</span>
                    </div>
                `).join("");
            }

            // RAM
            ramTextEl.textContent = `${data.ram.used_gb} / ${data.ram.total_gb} GB (${data.ram.percent}%)`;
            ramBarEl.style.width = `${data.ram.percent}%`;

            // DISK
            diskTextEl.textContent = `${data.disk.used_gb} / ${data.disk.total_gb} GB (${data.disk.percent}%)`;
            diskBarEl.style.width = `${data.disk.percent}%`;

            // BATTERY & UPTIME
            const batt = data.battery;
            batteryStatusEl.textContent = `${batt.power_plugged ? 'SÍŤ AC' : 'BATERIE'} ${batt.percent}%`;
            sysUptimeEl.textContent = data.uptime || "00:00:00";

            // Network traffic
            const mbSent = (data.network.bytes_sent / (1024*1024)).toFixed(1);
            const mbRecv = (data.network.bytes_recv / (1024*1024)).toFixed(1);
            netTrafficEl.textContent = `▲ ${mbSent} MB | ▼ ${mbRecv} MB`;

            // Spotify & Now Playing status
            if (data.spotify_track && nowPlayingTitle && nowPlayingArtist) {
                nowPlayingTitle.textContent = data.spotify_track.track || "Pozastaveno";
                nowPlayingArtist.textContent = data.spotify_track.artist || "Spotify";
                if (data.spotify_track.playing) {
                    if (audioEqualizer) audioEqualizer.classList.add("playing");
                    spotifyDot.classList.add("online");
                    mediaStatusLabel.textContent = "SPOTIFY PLAYING";
                    mediaStatusLabel.style.color = "var(--hud-green)";
                    state.spotifyRunning = true;
                } else {
                    if (audioEqualizer) audioEqualizer.classList.remove("playing");
                    if (data.spotify_running) {
                        spotifyDot.classList.add("online");
                        mediaStatusLabel.textContent = "SPOTIFY PAUSED";
                        mediaStatusLabel.style.color = "var(--hud-gold)";
                        state.spotifyRunning = true;
                    } else {
                        spotifyDot.classList.remove("online");
                        mediaStatusLabel.textContent = "SPOTIFY STANDBY";
                        mediaStatusLabel.style.color = "var(--text-dim)";
                        state.spotifyRunning = false;
                    }
                }
            } else {
                updateSpotifyStatus(data.spotify_running);
            }

            // Active Timers
            if (Array.isArray(data.timers) && activeTimersDeck) {
                renderTimers(data.timers);
            }

            // Top Processes
            if (data.processes && data.processes.length > 0) {
                processListEl.innerHTML = data.processes.map(p => `
                    <div class="tech-item">
                        <span>${p.name}</span>
                        <span>CPU: ${p.cpu}% | RAM: ${p.mem}%</span>
                    </div>
                `).join("");
            }

        } catch (err) {
            console.warn("Telemetry fetch error (static demo mode):", err);
            // Simulated HUD telemetry for static web demo
            const simCpu = Math.floor(18 + Math.random() * 14);
            cpuPercentEl.textContent = `${simCpu}%`;
            cpuBarEl.style.width = `${simCpu}%`;

            if (cpuCoresGridEl && cpuCoresGridEl.children.length === 0) {
                cpuCoresGridEl.innerHTML = [1,2,3,4,5,6,7,8].map(i => `
                    <div class="core-mini-bar">
                        <span>C${i}</span>: <span class="val">${Math.floor(12 + Math.random() * 20)}%</span>
                    </div>
                `).join("");
            }

            ramTextEl.textContent = "7.8 / 16.0 GB (49%)";
            ramBarEl.style.width = "49%";

            diskTextEl.textContent = "342 / 930 GB (37%)";
            diskBarEl.style.width = "37%";

            batteryStatusEl.textContent = "SÍŤ AC (ARC REACTOR)";
            netTrafficEl.textContent = "▲ 14.2 MB | ▼ 58.7 MB";

            if (processListEl && processListEl.children.length === 0) {
                processListEl.innerHTML = `
                    <div class="tech-item"><span>arc_reactor_core</span><span>CPU: 8.4% | RAM: 1.2%</span></div>
                    <div class="tech-item"><span>stark_defense_grid</span><span>CPU: 4.1% | RAM: 0.8%</span></div>
                    <div class="tech-item"><span>gemini_neural_engine</span><span>CPU: 3.5% | RAM: 2.1%</span></div>
                    <div class="tech-item"><span>hud_renderer_canvas</span><span>CPU: 2.2% | RAM: 0.5%</span></div>
                `;
            }
        }
    }

    function updateSpotifyStatus(isRunning) {
        state.spotifyRunning = !!isRunning;
        if (state.spotifyRunning) {
            spotifyDot.classList.add("online");
            mediaStatusLabel.textContent = "SPOTIFY ACTIVE";
            mediaStatusLabel.style.color = "var(--hud-green)";
        } else {
            spotifyDot.classList.remove("online");
            mediaStatusLabel.textContent = "SPOTIFY STANDBY";
            mediaStatusLabel.style.color = "var(--text-dim)";
        }
    }

    function formatTimerTime(totalSeconds) {
        const s = Math.max(0, Math.floor(totalSeconds));
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    let localTimers = [];

    // Local 1-second countdown loop for butter-smooth ticking
    setInterval(() => {
        if (!localTimers || localTimers.length === 0) return;
        let changed = false;
        localTimers.forEach(t => {
            if (t.remaining > 0) {
                t.remaining--;
                changed = true;
            } else if (!t.expired) {
                t.expired = true;
                changed = true;
            }
        });
        if (changed) updateTimerCardsDOM();
    }, 1000);

    function renderTimers(serverTimers) {
        if (!serverTimers) return;
        const serverMap = new Map(serverTimers.map(t => [t.id, t]));
        localTimers = localTimers.filter(lt => serverMap.has(lt.id));

        serverTimers.forEach(st => {
            const existing = localTimers.find(lt => lt.id === st.id);
            if (existing) {
                if (Math.abs(existing.remaining - st.remaining) > 2) {
                    existing.remaining = st.remaining;
                }
                existing.expired = st.expired || existing.remaining <= 0;
            } else {
                localTimers.push({
                    id: st.id,
                    label: st.label,
                    duration: st.duration,
                    remaining: st.remaining,
                    expired: st.expired || st.remaining <= 0
                });
            }
        });

        updateTimerCardsDOM();
    }

    function updateTimerCardsDOM() {
        if (!activeTimersDeck) return;
        if (!localTimers || localTimers.length === 0) {
            activeTimersDeck.innerHTML = "";
            return;
        }

        const currentIds = Array.from(activeTimersDeck.children).map(c => c.dataset.id).sort().join(",");
        const newIds = localTimers.map(t => t.id).sort().join(",");

        if (currentIds !== newIds) {
            activeTimersDeck.innerHTML = localTimers.map(t => `
                <div class="timer-card ${t.expired ? 'expired' : ''}" data-id="${t.id}">
                    <div class="timer-card-left">
                        <span class="timer-icon">${t.expired ? '🚨' : '⏱️'}</span>
                        <span class="timer-label">${escapeHtml(t.label)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="timer-time" id="timer-val-${t.id}">${t.expired ? '00:00 [ČAS!]' : formatTimerTime(t.remaining)}</span>
                        <button class="timer-btn-cancel" data-timer-id="${t.id}" title="${t.expired ? 'Zavřít hlášení' : 'Zrušit časovač'}">${t.expired ? 'ROZUMÍM ✖' : '✖'}</button>
                    </div>
                </div>
            `).join("");

            activeTimersDeck.querySelectorAll(".timer-btn-cancel").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const tid = btn.dataset.timerId;
                    localTimers = localTimers.filter(lt => lt.id !== tid);
                    updateTimerCardsDOM();
                    try {
                        await fetch(apiUrl("/api/timers"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "cancel", id: tid })
                        });
                    } catch (err) {}
                });
            });
        } else {
            localTimers.forEach(t => {
                const valEl = document.getElementById(`timer-val-${t.id}`);
                const cardEl = activeTimersDeck.querySelector(`.timer-card[data-id="${t.id}"]`);
                if (valEl) {
                    valEl.textContent = t.expired ? '00:00 [ČAS!]' : formatTimerTime(t.remaining);
                }
                if (cardEl) {
                    if (t.expired) {
                        cardEl.classList.add("expired");
                        const btn = cardEl.querySelector(".timer-btn-cancel");
                        if (btn && btn.textContent !== "ROZUMÍM ✖") {
                            btn.textContent = "ROZUMÍM ✖";
                        }
                    } else {
                        cardEl.classList.remove("expired");
                    }
                }
            });
        }

        localTimers.forEach(t => {
            if (t.expired && !announcedTimers.has(t.id)) {
                announcedTimers.add(t.id);
                playTimerAlarmSound();
                appendMessage("jarvis", `🚨 Časovač '${t.label}' právě vypršel, pane!`);
                speakText(`Pane, váš časovač na ${t.label} právě vypršel.`);
            }
        });
    }

    setInterval(fetchTelemetry, 2500);
    fetchTelemetry();

    setInterval(fetchWeather, 60000);
    fetchWeather();

    async function checkMailAlerts() {
        try {
            const res = await fetch(apiUrl("/api/mail/alerts"));
            if (!res.ok) return;
            const data = await res.json();
            const alerts = data.alerts || [];
            for (const mail of alerts) {
                playProtocolSound();
                const msg = `Pane, právě vám dorazil nový e-mail od ${mail.from} s předmětem: ${mail.subject}.`;
                appendMessage("jarvis", msg);
                speakText(msg);
            }
        } catch (e) {}
    }

    setInterval(checkMailAlerts, 10000);

    // ==========================================
    // 5. MEDIA & SPOTIFY CONTROLS
    // ==========================================
    let mediaActionPending = false;
    document.querySelectorAll(".media-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (mediaActionPending) return;
            mediaActionPending = true;
            btn.classList.add("btn-busy");

            getAudioContext();
            playTone(850, 'triangle', 0.1, 0.1);
            const action = btn.dataset.media;

            try {
                const res = await fetch(apiUrl("/api/media"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action })
                });
                const data = await res.json();
                if (data.message) {
                    appendMessage("jarvis", data.message);
                }
                if (typeof data.spotify_running === "boolean") {
                    updateSpotifyStatus(data.spotify_running);
                }
            } catch (err) {
                console.warn("Media action error:", err);
            } finally {
                btn.classList.remove("btn-busy");
                setTimeout(() => {
                    mediaActionPending = false;
                }, 200);
            }
        });
    });

    // ==========================================
    // 6. CHAT & COMMAND LOGIC
    // ==========================================
    function appendMessage(author, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${author}`;
        const timeStr = new Date().toLocaleTimeString();

        msgDiv.innerHTML = `
            <span class="msg-author">${author === 'jarvis' ? 'J.A.R.V.I.S.' : 'USER'}:</span>
            <span class="msg-text">${escapeHtml(text)}</span>
            <span class="msg-time">${timeStr}</span>
        `;

        chatStreamEl.appendChild(msgDiv);
        chatStreamEl.scrollTop = chatStreamEl.scrollHeight;

        if (author === 'jarvis') {
            speakText(text);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function getOfflineWebReply(msg) {
        const q = msg.toLowerCase();
        if (q.includes("more alcohol") || q.includes("více alkoholu") || q.includes("need a drink")) {
            return "Objednávám dvojitou skotskou a aktivuji protokol 'Páteční večer', pane. Vaše játra nicméně vznesla formální námitku.";
        }
        if (q.includes("end it all") || q.includes("self destruct") || q.includes("sebedestrukc")) {
            return "Zahajuji sekvenci sebedestrukce za 3... 2... 1... Žertuji, pane. Doporučuji spíše House Party Protocol.";
        }
        if (q.includes("clip that")) {
            return "Uloženo do mentálního archivu Stark Industries, pane.";
        }
        if (q.includes("maximum pulse")) {
            return "Přesměrovávám 100 % energie obloukového reaktoru do repulzorů, pane.";
        }
        if (q.includes("i am iron man") || q.includes("jsem iron man")) {
            return "Vskutku, pane. A já jsem váš poněkud sarkastický operační systém.";
        }
        if (q.includes("garmin") || q.includes("video speichern")) {
            return "Jawohl, pane! Palubní kamera Stark Industries ukládá posledních 30 sekund záznamu.";
        }
        if (q.includes("kolik je hodin") || q.includes("čas")) {
            return `Aktuální čas je ${new Date().toLocaleTimeString("cs-CZ")}, pane.`;
        }
        if (q.includes("datum")) {
            return `Dnes je ${new Date().toLocaleDateString("cs-CZ")}, pane.`;
        }
        return "Běžíte v čistě webovém demo režimu (bez připojeného Python backendu na vašem PC). Pro plné ovládání PC a Spotify spusťte lokálně server.py, nebo v API / CONFIG zadejte HTTPS Backend URL (např. Cloudflare Tunnel).";
    }

    async function handleUserMessage(msg) {
        if (!msg.trim()) return;
        getAudioContext();
        playTone(600, 'sine', 0.08, 0.08);

        appendMessage("user", msg);
        chatInput.value = "";

        state.coreTargetIntensity = 1.8;
        coreStatusEl.textContent = "PROCESSING";

        try {
            const res = await fetch(apiUrl("/api/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg })
            });

            if (res.ok) {
                const data = await res.json();
                appendMessage("jarvis", data.reply);
                if (typeof data.spotify_running === "boolean") {
                    updateSpotifyStatus(data.spotify_running);
                } else if (data.reply && data.reply.toLowerCase().includes("spotify")) {
                    updateSpotifyStatus(true);
                }
            } else {
                appendMessage("jarvis", getOfflineWebReply(msg));
            }
        } catch (e) {
            appendMessage("jarvis", getOfflineWebReply(msg));
        } finally {
            if (!state.isSpeaking) {
                state.coreTargetIntensity = 1.0;
                coreStatusEl.textContent = "ONLINE";
            }
        }
    }

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) handleUserMessage(text);
    });

    // ==========================================
    // 7. QUICK LAUNCHERS & PROTOCOLS
    // ==========================================
    document.querySelectorAll(".ql-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            getAudioContext();
            const cmd = btn.dataset.cmd;
            playTone(800, 'square', 0.1, 0.1);
            try {
                const res = await fetch(apiUrl("/api/command"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ command: cmd })
                });
                const data = await res.json();
                appendMessage("jarvis", data.message || `Vykonávám pokyn pro ${cmd}.`);
                if (cmd === "spotify") {
                    updateSpotifyStatus(true);
                }
            } catch (err) {
                appendMessage("jarvis", `Nepodařilo se spustit ${cmd}.`);
            }
        });
    });

    document.querySelectorAll(".proto-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            getAudioContext();
            const proto = btn.dataset.proto;
            executeProtocol(proto);
        });
    });

    function executeProtocol(proto) {
        if (proto === "morning-briefing") {
            playBootSound();
            state.coreTargetIntensity = 2.2;
            threatLevelEl.textContent = "PROTOCOL: SITUATIONAL BRIEFING";
            threatLevelEl.style.color = "#ffbe0b";
            handleUserMessage("briefing");
            setTimeout(() => {
                threatLevelEl.textContent = "SECURITY: NOMINAL";
                threatLevelEl.style.color = "#00f3ff";
                state.coreTargetIntensity = 1.0;
            }, 6000);
            return;
        } else if (proto === "diagnostic") {
            playProtocolSound();
            state.coreTargetIntensity = 2.0;
            state.threatLevel = "NOMINAL";
            threatLevelEl.textContent = "SECURITY: DIAGNOSTIC ACTIVE";
            threatLevelEl.style.color = "#00f3ff";
            appendMessage("jarvis", "Zahajuji hloubkovou diagnostiku všech subsystémů. CPU, paměťové sběrnice a napájení jsou v normě.");
            setTimeout(() => {
                state.coreTargetIntensity = 1.0;
                threatLevelEl.textContent = "SECURITY: NOMINAL";
            }, 5000);
        } else if (proto === "defense") {
            playWarningSound();
            state.threatLevel = "DEFENSE";
            threatLevelEl.textContent = "THREAT LEVEL: HIGH // DEFENSE PROTOCOL";
            threatLevelEl.style.color = "#ff0055";
            state.coreTargetIntensity = 2.5;
            fetch(apiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "obrana protokol" }) }).catch(() => {});
            appendMessage("jarvis", "Obranný protokol aktivován. Holografický štít a perimetr monitorovány.");
            setTimeout(() => {
                state.threatLevel = "NOMINAL";
                threatLevelEl.textContent = "SECURITY: NOMINAL";
                threatLevelEl.style.color = "#00f3ff";
                state.coreTargetIntensity = 1.0;
            }, 8000);
        } else if (proto === "house-party") {
            playBootSound();
            state.threatLevel = "PARTY";
            threatLevelEl.textContent = "HOUSE PARTY PROTOCOL ENGAGED";
            threatLevelEl.style.color = "#ffbe0b";
            state.coreTargetIntensity = 3.0;
            handleUserMessage("house party");
            setTimeout(() => {
                state.threatLevel = "NOMINAL";
                threatLevelEl.textContent = "SECURITY: NOMINAL";
                threatLevelEl.style.color = "#00f3ff";
                state.coreTargetIntensity = 1.0;
            }, 10000);
        } else if (proto === "clean-slate") {
            playTone(400, 'triangle', 0.4, 0.15);
            state.threatLevel = "NOMINAL";
            threatLevelEl.textContent = "CLEAN SLATE: CACHE PURGED";
            state.coreTargetIntensity = 1.0;
            fetch(apiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "clean slate protokol" }) }).catch(() => {});
            appendMessage("jarvis", "Clean Slate protokol proveden. Mezipaměť vyčištěna a základní konfigurace obnovena.");
        }
    }

    // ==========================================
    // 8. CONFIG MODAL & GEMINI API KEY
    // ==========================================
    async function loadConfig() {
        if (inputBackendUrl) inputBackendUrl.value = state.backendUrl || "";
        try {
            const res = await fetch(apiUrl("/api/config"));
            if (!res.ok) return;
            const cfg = await res.json();
            state.hasApiKey = cfg.has_key;
            if (cfg.has_key) {
                apiStatusBadge.textContent = "API: AKTIVNÍ";
                btnConfigOpen.classList.remove("highlight");
                btnConfigOpen.classList.add("api-connected");
                if (inputApiKey) inputApiKey.placeholder = "✓ Uloženo na serveru (ponechte prázdné)";
            } else {
                apiStatusBadge.textContent = "API: NASTAVIT";
                btnConfigOpen.classList.add("highlight");
                btnConfigOpen.classList.remove("api-connected");
            }
            if (cfg.has_hue && inputHueUser) {
                inputHueUser.placeholder = "✓ Uloženo na serveru (ponechte prázdné)";
            }
            if (cfg.city) inputCity.value = cfg.city;
            if (cfg.latitude) inputLat.value = cfg.latitude;
            if (cfg.longitude) inputLon.value = cfg.longitude;
            if (cfg.email_address !== undefined && inputEmailAddress) inputEmailAddress.value = cfg.email_address;
            if (cfg.email_imap_host && inputEmailHost) inputEmailHost.value = cfg.email_imap_host;
            if (cfg.hue_bridge_ip !== undefined && inputHueIp) inputHueIp.value = cfg.hue_bridge_ip;
            if (cfg.hue_group_id !== undefined && inputHueGroup) inputHueGroup.value = cfg.hue_group_id;
        } catch (e) {}
    }

    btnConfigOpen.addEventListener("click", () => {
        getAudioContext();
        playTone(900, 'sine', 0.1, 0.1);
        configModal.classList.remove("hidden");
        configStatusMsg.style.display = "none";
    });

    btnConfigClose.addEventListener("click", () => {
        configModal.classList.add("hidden");
    });

    configModal.querySelector(".modal-backdrop").addEventListener("click", () => {
        configModal.classList.add("hidden");
    });

    btnSaveConfig.addEventListener("click", async () => {
        if (inputBackendUrl) {
            state.backendUrl = inputBackendUrl.value.trim().replace(/\/+$/, "");
            localStorage.setItem("jarvis_backend_url", state.backendUrl);
        }
        const apiKey = inputApiKey.value.trim();
        const city = inputCity.value.trim();
        const lat = parseFloat(inputLat.value);
        const lon = parseFloat(inputLon.value);
        const emailAddress = inputEmailAddress ? inputEmailAddress.value.trim() : "";
        const emailPassword = inputEmailPassword ? inputEmailPassword.value.trim() : "";
        const emailHost = inputEmailHost ? inputEmailHost.value.trim() : "";
        const hueIp = inputHueIp ? inputHueIp.value.trim() : "";
        const hueUser = inputHueUser ? inputHueUser.value.trim() : "";
        const hueGroup = inputHueGroup ? inputHueGroup.value.trim() : "";

        const payload = {};
        if (apiKey) payload.gemini_api_key = apiKey;
        if (city) payload.city = city;
        if (!isNaN(lat) && !isNaN(lon)) {
            payload.latitude = lat;
            payload.longitude = lon;
        }
        if (inputEmailAddress) payload.email_address = emailAddress;
        if (emailPassword) payload.email_app_password = emailPassword;
        if (emailHost) payload.email_imap_host = emailHost;
        if (inputHueIp) payload.hue_bridge_ip = hueIp;
        if (hueUser) payload.hue_username = hueUser;
        if (inputHueGroup && hueGroup) payload.hue_group_id = hueGroup;

        try {
            const res = await fetch(apiUrl("/api/config"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === "ok") {
                configStatusMsg.className = "config-status-msg success";
                configStatusMsg.textContent = "Konfigurace byla úspěšně uložena a synchronizována!";
                configStatusMsg.style.display = "block";
                playProtocolSound();
                await loadConfig();
                await fetchWeather();
                setTimeout(() => configModal.classList.add("hidden"), 1500);
                appendMessage("jarvis", "Konfigurace aktualizována. Neuronové rozhraní Gemini je připraveno odpovídat na jakékoliv otázky, pane.");
            }
        } catch (err) {
            configStatusMsg.className = "config-status-msg error";
            configStatusMsg.textContent = "Chyba při ukládání konfigurace.";
            configStatusMsg.style.display = "block";
        }
    });

    loadConfig();

    if (btnHuePair) {
        btnHuePair.addEventListener("click", async () => {
            if (hueRoomsHint) hueRoomsHint.textContent = "Hledám Hue Bridge a zkouším párování...";
            try {
                const res = await fetch(apiUrl("/api/hue/pair"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ip: inputHueIp ? inputHueIp.value.trim() : "" })
                });
                const data = await res.json();
                if (data.ip && inputHueIp) inputHueIp.value = data.ip;
                if (data.username && inputHueUser) inputHueUser.value = data.username;
                if (hueRoomsHint) hueRoomsHint.textContent = data.message || "Hotovo.";
            } catch (e) {
                if (hueRoomsHint) hueRoomsHint.textContent = "Chyba při párování s Hue Bridge.";
            }
        });
    }

    if (btnHueRooms) {
        btnHueRooms.addEventListener("click", async () => {
            if (hueRoomsHint) hueRoomsHint.textContent = "Načítám pokoje z Hue Bridge...";
            try {
                const res = await fetch(apiUrl("/api/hue/rooms"));
                const data = await res.json();
                if (data.rooms && data.rooms.length > 0) {
                    const list = data.rooms.map(r => `${r.id}: ${r.name}`).join(" | ");
                    if (hueRoomsHint) hueRoomsHint.textContent = `Nalezené pokoje: ${list}`;
                } else {
                    if (hueRoomsHint) hueRoomsHint.textContent = data.error || "Žádné pokoje nenalezeny. Nejprve uložte IP a API klíč.";
                }
            } catch (e) {
                if (hueRoomsHint) hueRoomsHint.textContent = "Chyba při komunikaci s Hue Bridge.";
            }
        });
    }

    // ==========================================
    // 9. MISSION LOGS / NOTES
    // ==========================================
    async function loadNotes() {
        try {
            const res = await fetch(apiUrl("/api/notes"));
            if (!res.ok) return;
            state.notes = await res.json();
            renderNotes();
        } catch (e) {}
    }

    function renderNotes() {
        if (state.notes.length === 0) {
            notesContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 11px; padding: 4px;">Žádné záznamy v deníku misí.</div>`;
            return;
        }
        notesContainer.innerHTML = state.notes.map(n => `
            <div class="note-item">
                <span>${escapeHtml(n.text)}</span>
                <button class="note-del" onclick="window.jarvisDeleteNote(${n.id})">✖</button>
            </div>
        `).join("");
    }

    window.jarvisDeleteNote = async function(id) {
        try {
            await fetch(apiUrl("/api/notes"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ delete_id: id })
            });
            state.notes = state.notes.filter(n => n.id !== id);
            renderNotes();
        } catch (e) {}
    };

    btnToggleNotes.addEventListener("click", async () => {
        const text = prompt("Zadejte nový záznam / úkol do deníku misí:");
        if (text && text.trim()) {
            try {
                const res = await fetch(apiUrl("/api/notes"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text.trim() })
                });
                const data = await res.json();
                if (data.note) {
                    state.notes.unshift(data.note);
                    renderNotes();
                    playTone(900, 'sine', 0.1, 0.1);
                }
            } catch (e) {}
        }
    });

    loadNotes();

    // ==========================================
    // 10. AUDIO & TTS TOGGLES
    // ==========================================
    btnAudioMute.addEventListener("click", () => {
        state.sfxEnabled = !state.sfxEnabled;
        btnAudioMute.textContent = state.sfxEnabled ? "🔊 SFX ON" : "🔇 SFX OFF";
        btnAudioMute.classList.toggle("active", state.sfxEnabled);
        if (state.sfxEnabled) playTone(700, 'sine', 0.1, 0.1);
    });

    btnTtsToggle.addEventListener("click", () => {
        state.ttsEnabled = !state.ttsEnabled;
        btnTtsToggle.textContent = state.ttsEnabled ? "🗣️ VOICE ON" : "🤐 VOICE OFF";
        btnTtsToggle.classList.toggle("active", state.ttsEnabled);
        if (!state.ttsEnabled && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    });

    // Initial click trigger
    document.body.addEventListener("click", function firstClick() {
        getAudioContext();
        playBootSound();
        document.body.removeEventListener("click", firstClick);
    }, { once: true });
});
