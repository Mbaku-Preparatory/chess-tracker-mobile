"""Generates the board sounds in assets/sounds/. GENERATED files: edit this, not them.

The same generator as the web app's (fixed seed), so both play identical sounds.

Made from scratch (sine partials and filtered noise), so they belong to us
outright. Lichess's familiar set is non-free and its free sets are AGPL or
non-commercial, which is why we do not borrow one.

    python3 scripts/make-sounds.py   # needs numpy
"""

import wave
from pathlib import Path

import numpy as np

RATE = 44_100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"
rng = np.random.default_rng(7)  # fixed seed: regenerating gives identical files


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def knock(freq, length=0.11, decay=55.0, noise=0.35, bright=1.0):
    """A wooden piece set down: a short pitched body plus a click of noise."""
    x = t(length)
    body = (np.sin(2 * np.pi * freq * x) + 0.45 * np.sin(2 * np.pi * freq * 2.71 * x) * bright) * np.exp(-decay * x)
    click = rng.standard_normal(x.size) * np.exp(-260 * x)
    # One-pole low-pass on the click so it reads as wood, not static.
    smoothed = np.empty_like(click)
    acc = 0.0
    for i, v in enumerate(click):
        acc += 0.35 * (v - acc)
        smoothed[i] = acc
    return body + noise * smoothed


def at(signal, offset, total):
    out = np.zeros(int(RATE * total))
    start = int(RATE * offset)
    out[start:start + signal.size] += signal[: out.size - start]
    return out


def chime(freqs, length=0.55):
    x = t(length)
    return sum(np.sin(2 * np.pi * f * x) * np.exp(-6.5 * x) for f in freqs) / len(freqs)


SOUNDS = {
    "move": knock(620),
    "capture": knock(430, length=0.14, decay=42, noise=0.6) + 0.6 * at(knock(760, decay=70), 0.018, 0.14),
    "castle": at(knock(600), 0, 0.2) + at(knock(540), 0.085, 0.2),
    "check": knock(880, decay=38, bright=1.4) + 0.25 * chime([1760], length=0.11),
    "end": chime([523.25, 659.25, 783.99]),
}


def write(name, signal):
    peak = np.max(np.abs(signal)) or 1.0
    pcm = (signal / peak * 0.8 * 32767).astype(np.int16)
    fade = min(200, pcm.size)
    pcm[-fade:] = (pcm[-fade:] * np.linspace(1, 0, fade)).astype(np.int16)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, signal in SOUNDS.items():
        write(name, signal)
        print(f"{name}.wav")
