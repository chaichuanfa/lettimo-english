# Current animation

The rejected custom Lottie characters are retired. The site uses Microsoft's
Fluent animated Parrot, MIT licensed; source attribution and license are in
assets/mascots/fluent/. The original APNG here is the visual preview/source.

Production: 72 untouched artwork frames × 42 ms, packed into a 488 KB WebP atlas.
Canvas renders each frame with fixed coordinates; no bones, morphing, or CSS
rotation. A cached atlas is shared across instances. Playback finishes once,
with pause/resume/replay, offscreen and hidden-tab suspension, reduced-motion
support, and a static poster if the atlas cannot load.

Validation: npm run check passed (39 unit tests, 44 browser tests). Additional
browser checks passed for pause, resume, end state, replay, offscreen suspension,
reduced motion, atlas-load failure, and 390 px mobile layout. Screenshots are in
output/playwright/fluent-home-{desktop,mobile}.png.

A video-generation approach was inspected in ElevenLabs Creative Studio but
could not start because the connected account requires a paid video plan. No
video was generated. The shipped animation is existing Microsoft artwork, not
AI-generated artwork or an original custom mascot.
