# Texture color space notes
Diffuse maps: texture.colorSpace = THREE.SRGBColorSpace
Normal / Roughness / AO maps: default linear color space
HDRI: loaded via RGBELoader, used as scene.environment AND scene.background


# Assets

/models/scooter.glb — parked Honda Activa, low-poly, ~300 triangles
/models/dog.glb — stray dog, sleeping pose, low-poly
/sprites/aunty_calm.png — Indian aunty on balcony, front-facing, transparent bg, 512x768
/sprites/aunty_shocked.png — same aunty, arms raised, swap on window-break
/hdri/sunset.hdr — warm golden hour sky, use as scene.environment AND scene.background
/textures/ground/ — PBR material for gully floor (diff + nor_gl + rough + ao)
/textures/wall/ — PBR material for building walls (same 4 maps)
/audio/bat_thwack.mp3 — wooden bat hitting ball, 0.3s, play on successful connect (this you have to download it)
/audio/glass_shatter.mp3 — window breaking, play on sixer hitting window (this you have to download it)
/audio/aunty_voice.mp3 — "Hey! Kaun hai?" Indian female, irritated (use only from 0:05 to 0:09)
/audio/dog_bark.mp3 — single short bark (you have to download it)
/audio/six_call.mp3 — "SIX!" commentator yell (you have to download it)
/audio/city_ambience.mp3 — background loop, distant traffic (you have to download it)
