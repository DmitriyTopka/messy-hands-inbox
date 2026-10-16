const fs = require('fs');
const path = require('path');

const ENGINE = '/Users/sirenamc/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-sfx/tools';
const audio = require(ENGINE);

const PROJECT_ASSETS_SFX = '/Users/sirenamc/Новая папка 2/contests_2026-10/X_specs/SpecsLens/Assets/GeneratedSFX';
fs.mkdirSync(PROJECT_ASSETS_SFX, { recursive: true });

const TARGET_SECONDS = 0.9;

// Soft two-note arrival chime: quiet, gentle, non-intrusive. Trimmed so the
// reverb tail does not linger over the user's work.
function render() {
    const bell = audio.sfx_presets.uiNotify();
    const wet = audio.mix_bus.applyFx(bell, { hpf: 180, lpf: 5200, reverb: 'smallRoom', gain: 0.55 });
    const n = Math.floor(TARGET_SECONDS * audio.SAMPLE_RATE);
    const cut = (ch) => {
        const out = ch.slice(0, n);
        audio.fadeOut(out, 0.12);
        return out;
    };
    return wet.left ? { left: cut(wet.left), right: cut(wet.right) } : cut(wet);
}

const result = render();
audio.mix_bus.masterChain(result, { normalize: 'peak' });
audio.WavBuilder.write(result, path.join(PROJECT_ASSETS_SFX, 'MessageChime.wav'));
