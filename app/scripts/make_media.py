"""Generate the seed catalogue: original, procedurally synthesised music,
abstract SVG cover art and media/catalog.json. Everything is made here, so
the clone ships no licensed content.

Usage: python3 scripts/make_media.py [--out media]
Needs numpy and ffmpeg (for mp3 encoding).
"""
import argparse
import json
import os
import random
import shutil
import subprocess
import wave

import numpy as np

SR = 22050

# Invented artists. Names, genres and bios are original to this project.
ARTISTS = [
    ("Harbor Lights", "Lo-fi", "Late-night beats made on a cheap keyboard and an old tape deck.",
     [("Rain on Tin", "album"), ("Window Seat", "ep")]),
    ("Neon Atlas", "Synthwave", "Driving arpeggios for long highways that do not exist.",
     [("Grid Runner", "album"), ("Afterglow", "single")]),
    ("Quiet Fjord", "Ambient", "Slow pads and wide spaces for reading, sleeping and thinking.",
     [("Cold Water", "album"), ("Moss", "ep")]),
    ("Velvet Circuit", "House", "Four on the floor, warm chords, nothing to prove.",
     [("Basement Hours", "album")]),
    ("Pixel Moth", "Chiptune", "Square waves and bad decisions, recorded in a single afternoon.",
     [("Extra Life", "album"), ("Boss Room", "single")]),
    ("Juniper Static", "Downtempo", "Unhurried grooves for the hour after the party.",
     [("Slow Orbit", "album")]),
    ("Copper Kites", "Lo-fi", "Two friends, one sampler, too much coffee.",
     [("Sunday Errands", "ep")]),
    ("Glass Meridian", "Ambient", "Field recordings that were never recorded, synthesised instead.",
     [("Horizon Lines", "album")]),
]

WORDS_A = ["Paper", "Silver", "Hollow", "Golden", "Quiet", "Electric", "Midnight", "Northern",
           "Velvet", "Static", "Amber", "Lunar", "Distant", "Little", "Broken", "Open", "Soft",
           "Faded", "Crystal", "Summer", "Winter", "Rusty", "Wild", "Slow"]
WORDS_B = ["Streets", "Signals", "Harbour", "Machines", "Gardens", "Rooms", "Lanterns", "Rivers",
           "Engines", "Letters", "Clouds", "Satellites", "Tides", "Hallways", "Fields", "Mirrors",
           "Bicycles", "Postcards", "Echoes", "Windows", "Dreams", "Stations", "Bridges", "Kites"]

GENRES = {
    "Lo-fi":     dict(bpm=(72, 86), scale=[0, 3, 5, 7, 10], wave="tri", drums="boombap", swing=0.12, hue=(20, 45)),
    "Synthwave": dict(bpm=(96, 112), scale=[0, 2, 3, 5, 7, 8, 10], wave="saw", drums="four", swing=0.0, hue=(280, 330)),
    "Ambient":   dict(bpm=(60, 70), scale=[0, 2, 4, 7, 9], wave="sine", drums=None, swing=0.0, hue=(170, 210)),
    "House":     dict(bpm=(120, 126), scale=[0, 2, 3, 5, 7, 9, 10], wave="saw", drums="four", swing=0.0, hue=(330, 360)),
    "Chiptune":  dict(bpm=(130, 150), scale=[0, 2, 4, 5, 7, 9, 11], wave="square", drums="chip", swing=0.0, hue=(90, 140)),
    "Downtempo": dict(bpm=(84, 96), scale=[0, 2, 3, 5, 7, 8, 10], wave="tri", drums="boombap", swing=0.08, hue=(210, 250)),
}
PROGRESSIONS = [[0, 5, 3, 4], [0, 3, 4, 4], [0, 4, 5, 3], [5, 3, 0, 4], [0, 0, 3, 5]]


def osc(kind, freq, n, phase=0.0):
    t = (np.arange(n) / SR) * freq + phase
    frac = t % 1.0
    if kind == "sine":
        return np.sin(2 * np.pi * t)
    if kind == "square":
        return np.where(frac < 0.5, 0.6, -0.6)
    if kind == "saw":
        return (2 * frac - 1) * 0.7
    return (2 * np.abs(2 * frac - 1) - 1)  # triangle


def env(n, a=0.01, r=0.2):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    na, nr = min(na, n), min(nr, n)
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, alpha):
    # one-pole low-pass, vectorised via cumulative filtering in chunks
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 4096):
        chunk = x[i:i + 4096]
        out = np.empty_like(chunk)
        for j, v in enumerate(chunk):
            acc += alpha * (v - acc)
            out[j] = acc
        y[i:i + 4096] = out
    return y


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def make_track(genre, seed, seconds):
    g = GENRES[genre]
    rng = random.Random(seed)
    bpm = rng.uniform(*g["bpm"])
    beat = 60.0 / bpm
    bar = beat * 4
    bars = max(4, int(seconds / bar))
    total = int(bars * bar * SR) + SR
    mix = np.zeros(total)
    root = rng.choice([45, 47, 48, 50, 52, 53])  # A2..F3
    scale = g["scale"]
    prog = rng.choice(PROGRESSIONS)

    def deg(d, octave=0):
        return root + scale[d % len(scale)] + 12 * (d // len(scale) + octave)

    for b in range(bars):
        chord_root = prog[b % len(prog)]
        start = int(b * bar * SR)
        n = int(bar * SR)
        # pad chord
        pad = np.zeros(n)
        for k in (0, 2, 4):
            f = midi(deg(chord_root + k, 1))
            pad += osc(g["wave"] if genre != "Chiptune" else "square", f, n) * 0.08
            pad += osc("sine", f * 1.003, n) * 0.06
        mix[start:start + n] += pad * env(n, 0.3 if genre == "Ambient" else 0.05, 0.3)
        # bass on beats
        for q in range(4 if genre != "Ambient" else 1):
            bs = start + int(q * beat * SR)
            bn = int(beat * SR * (0.9 if genre != "Ambient" else 3.8))
            f = midi(deg(chord_root, -1))
            mix[bs:bs + bn] += osc("tri" if genre != "Chiptune" else "square", f, bn) * 0.22 * env(bn, 0.01, 0.15)
        # melody / arpeggio
        if genre != "Ambient" or rng.random() < 0.5:
            steps = 8 if genre in ("Lo-fi", "Downtempo", "Ambient") else 16
            step = bar / steps
            for s in range(steps):
                if rng.random() < (0.55 if steps == 8 else 0.7):
                    off = step * s
                    if s % 2 == 1:
                        off += step * g["swing"]
                    ms = start + int(off * SR)
                    mn = int(step * SR * 0.95)
                    note = deg(chord_root + rng.choice([0, 2, 4, 5, 7]), 2)
                    w = "square" if genre == "Chiptune" else ("sine" if genre == "Ambient" else g["wave"])
                    mix[ms:ms + mn] += osc(w, midi(note), mn) * 0.09 * env(mn, 0.005, 0.08)
        # drums
        d = g["drums"]
        if d and b >= 1:
            for q in range(4):
                ks = start + int(q * beat * SR)
                kick = d == "four" or (d in ("boombap", "chip") and q in (0, 2))
                if kick:
                    kn = int(0.18 * SR)
                    t = np.arange(kn) / SR
                    f = 110 * np.exp(-t * 25) + 45
                    mix[ks:ks + kn] += np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 * np.exp(-t * 18)
                if q in (1, 3):
                    sn = int(0.12 * SR)
                    noise = np.random.default_rng(seed + b * 4 + q).standard_normal(sn)
                    mix[ks:ks + sn] += noise * 0.12 * np.exp(-np.arange(sn) / SR * 30)
                # hats on off-beats
                hs = ks + int(beat * SR / 2)
                hn = int(0.04 * SR)
                noise = np.random.default_rng(seed * 7 + b * 4 + q).standard_normal(hn)
                mix[hs:hs + hn] += np.diff(np.concatenate([[0], noise])) * 0.05 * np.exp(-np.arange(hn) / SR * 80)

    mix = mix[: int(bars * bar * SR)]
    if genre in ("Lo-fi", "Downtempo"):
        mix = lowpass(mix, 0.35)
        mix += np.random.default_rng(seed).standard_normal(len(mix)) * 0.004  # vinyl hiss
    fade = int(2.0 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 0.85
    return mix


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def cover_svg(seed, hue_range, shape):
    rng = random.Random(seed)
    h1 = rng.uniform(*hue_range) % 360
    h2 = (h1 + rng.uniform(30, 80)) % 360
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">',
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="hsl({h1:.0f},65%,48%)"/>'
        f'<stop offset="1" stop-color="hsl({h2:.0f},55%,22%)"/></linearGradient></defs>',
        '<rect width="300" height="300" fill="url(#g)"/>',
    ]
    for i in range(rng.randint(3, 7)):
        x, y = rng.uniform(0, 300), rng.uniform(0, 300)
        op = rng.uniform(0.12, 0.4)
        light = rng.choice([85, 70, 15])
        if shape == "circle":
            parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rng.uniform(20, 120):.0f}" fill="hsl({h2:.0f},60%,{light}%)" opacity="{op:.2f}"/>')
        elif shape == "lines":
            parts.append(f'<rect x="0" y="{y:.0f}" width="300" height="{rng.uniform(4, 30):.0f}" fill="hsl({h1:.0f},70%,{light}%)" opacity="{op:.2f}"/>')
        else:
            pts = " ".join(f"{rng.uniform(0, 300):.0f},{rng.uniform(0, 300):.0f}" for _ in range(3))
            parts.append(f'<polygon points="{pts}" fill="hsl({h2:.0f},50%,{light}%)" opacity="{op:.2f}"/>')
    parts.append("</svg>")
    return "".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="media")
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required")
    out = args.out
    for sub in ("audio", "covers", "artists"):
        os.makedirs(os.path.join(out, sub), exist_ok=True)

    rng = random.Random(2026)
    catalog = {"artists": []}
    seed = 1000
    year = 2019
    for ai, (name, genre, bio, albums) in enumerate(ARTISTS):
        aid = f"ar{ai + 1:02d}"
        hue = GENRES[genre]["hue"]
        with open(os.path.join(out, "artists", f"{aid}.svg"), "w") as f:
            f.write(cover_svg(seed + 77, hue, "circle"))
        artist = {"id": aid, "name": name, "genre": genre, "bio": bio,
                  "image": f"/media/artists/{aid}.svg", "albums": []}
        for bi, (title, kind) in enumerate(albums):
            alid = f"{aid}al{bi + 1}"
            with open(os.path.join(out, "covers", f"{alid}.svg"), "w") as f:
                f.write(cover_svg(seed + bi * 13, hue, rng.choice(["circle", "lines", "poly"])))
            ntracks = {"album": 5, "ep": 3, "single": 1}[kind]
            release = f"{year + (ai + bi) % 7}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"
            album = {"id": alid, "title": title, "type": kind, "release_date": release,
                     "cover": f"/media/covers/{alid}.svg", "tracks": []}
            used = set()
            for ti in range(ntracks):
                if kind == "single" and ti == 0:
                    ttitle = title
                else:
                    while True:
                        ttitle = f"{rng.choice(WORDS_A)} {rng.choice(WORDS_B)}"
                        if ttitle not in used:
                            break
                used.add(ttitle)
                tid = f"{alid}t{ti + 1}"
                seconds = rng.uniform(32, 70)
                seed += 1
                x = make_track(genre, seed, seconds)
                wav = os.path.join(out, "audio", f"{tid}.wav")
                mp3 = os.path.join(out, "audio", f"{tid}.mp3")
                write_wav(wav, x)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ac", "1", "-b:a", "96k", mp3], check=True)
                os.remove(wav)
                album["tracks"].append({"id": tid, "title": ttitle, "track_number": ti + 1,
                                        "duration_ms": int(len(x) / SR * 1000), "audio": f"/media/audio/{tid}.mp3"})
                print(f"  {name} / {title} / {ttitle}  ({len(x) / SR:.0f}s)")
            artist["albums"].append(album)
        catalog["artists"].append(artist)
        seed += 100
    with open(os.path.join(out, "catalog.json"), "w") as f:
        json.dump(catalog, f, indent=1)
    print("wrote", os.path.join(out, "catalog.json"))


if __name__ == "__main__":
    main()
