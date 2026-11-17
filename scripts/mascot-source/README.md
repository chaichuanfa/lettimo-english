# Green parrot animation source

`approved-wave.json` preserves the approved green parrot rig and its independent wing, eyelid and tail animation. Creator project: https://creator.lottiefiles.com/?fileId=90abc9ae-6adb-431b-9f80-1dbdb23477d2

Rebuild the five editable, vector-only Lottie clips:

```sh
python3 scripts/build-parrot-animations.py
```

Rebuild their transparent fallback posters as well (optional rendering dependencies):

```sh
uv run --no-project --with 'rlottie-python[full]' python scripts/build-parrot-animations.py --posters
```

Output is `assets/mascots/parrot/`: `wave`, `reading`, `listening`, `teaching`, and `cheer`, each with JSON animation and WebP poster. All clips use a 512 × 512 canvas, 60 fps, and a 4.8-second timeline. The source rig and generator are excluded from the published site.

The website loops clips automatically while visible, with no interactive controls. Offscreen clips and hidden tabs pause. Reduced motion uses a still image without loading the player. The lightweight SVG player supports the paths, masks and gradients used here; expressions and external images are not required. Validate animated path interpolation in the browser; the native poster renderer only receives frozen frame-zero data.

Run `npm test` to verify layer parenting, path morph topology, keyframe continuity and posters. To edit in Lottie Creator, import the generated JSON for the corresponding pose.
