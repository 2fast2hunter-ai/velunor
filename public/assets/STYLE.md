# Velunor Art-Style: Stylized Fantasy (final)
- Look: polierte Stylized-Fantasy-Illustration, handgemalte Texturen, Supercell-artig, satte Farben, kräftiges Rim-Light, klare Silhouetten.
- Proportionen: Chibi (großer Kopf, große glänzende Augen, freundlicher Ausdruck), Ganzkörper, 3/4-Ansicht.
- Gebäude: isometrische 3/4-Ansicht, Stein/Holz, rote/blaue Akzente, kleiner Sockel.
- Farben: Typfarben aus data/types.json dominieren je Monster (fire orange-rot, water blau, plant grün, earth braun/sand).
- Erzeugung: Grok-Bot-Bildgenerator auf schlichtem grauem Hintergrund -> rembg (isnet-general-use) freigestellt -> zugeschnitten, quadratisch mit 4 % Rand.
- Größen: monsters/mXX.png und buildings/<id>.png 512x512, zusätzlich *_256.png. Transparenter Hintergrund.
- Prompt-Basis: "polished stylized fantasy game art, hand-painted textures, Supercell-like style, rim light, cute chibi proportions, full body, centered, plain light grey background, no text".
- Rahmen (frames/) und Icons (icons/) sind vorerst noch die prozeduralen PIL-Versionen (gen.py).
