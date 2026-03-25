#!/usr/bin/env python3
"""Generate AX Media logo concepts via Fal AI ideogram-v2 — best for typography."""

import json, requests
from pathlib import Path

API_KEY = "53e108a1-4772-4942-b23d-4546a08b4604:0133f34378135065112069db1dd8fc13"
OUT_DIR = Path(__file__).parent.parent / "public" / "logo-gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "Authorization": f"Key {API_KEY}",
    "Content-Type": "application/json",
}

CONCEPTS = [
    {
        "id": "v2-01",
        "prompt": (
            "Pure typographic logo. Black background. The two letters A X "
            "in enormous bold condensed sans-serif, white. "
            "A sharp thin red line cuts horizontally under the letters. "
            "Below the line the word MEDIA in small caps with wide tracking. "
            "Nothing else. No humans, no objects, no illustrations. "
            "Only letters and one line. Ultra minimal. Like Celine or Bottega Veneta logo."
        ),
    },
    {
        "id": "v2-02",
        "prompt": (
            "Minimalist brand logo on pure black. A solid white square. "
            "Inside the square the letters A X in bold black helvetica, left-aligned. "
            "To the right of the square the word MEDIA in white thin caps, "
            "with extreme letter spacing. That is the entire logo. "
            "No illustrations, no people, no symbols. Only geometry and type. "
            "Premium, clean, commanding. Like a luxury fashion house logo."
        ),
    },
    {
        "id": "v2-03",
        "prompt": (
            "Logo design. Black canvas. Giant letter A in white on the left. "
            "Giant letter X in bright red #FF2D55 on the right, "
            "the two letters slightly overlap. "
            "Small dot separator then the word MEDIA in grey micro-caps. "
            "Psychedelic minimalism. The contrast between white and red feels electric. "
            "No illustrations. Pure letters only. Web3 luxury brand."
        ),
    },
    {
        "id": "v2-04",
        "prompt": (
            "Wordmark logo on black. The letters A X M E D I A arranged in one line. "
            "AX is bold and large, MEDIA is thin and small but same height as X. "
            "A vertical red line separates AX from MEDIA. "
            "All white except the red divider line. "
            "Reminiscent of Supreme or Palace brand typography. "
            "No people, no icons, pure type only."
        ),
    },
]


def generate(concept):
    print(f"  Generating {concept['id']}...", flush=True)
    payload = {
        "prompt": concept["prompt"],
        "aspect_ratio": "1:1",
        "expand_prompt": False,
        "style_type": "Design",
        "num_images": 1,
    }
    r = requests.post(
        "https://fal.run/fal-ai/ideogram/v2",
        headers=HEADERS,
        json=payload,
        timeout=120,
    )
    if r.status_code != 200:
        print(f"    ✗ {r.status_code}: {r.text[:300]}")
        return None

    data = r.json()
    images = data.get("images", [])
    if not images:
        print(f"    ✗ No images: {data}")
        return None

    url = images[0]["url"]
    img_r = requests.get(url, timeout=60)
    out_path = OUT_DIR / f"{concept['id']}.jpg"
    out_path.write_bytes(img_r.content)
    print(f"    ✓ {out_path.name}")
    return f"/logo-gen/{concept['id']}.jpg"


if __name__ == "__main__":
    print("🎨 AX Media logos via ideogram-v2...\n")
    results = []
    for c in CONCEPTS:
        path = generate(c)
        if path:
            results.append({"id": c["id"], "path": path})

    manifest = OUT_DIR / "manifest_v2.json"
    manifest.write_text(json.dumps(results, indent=2))
    print(f"\n✅ {len(results)}/{len(CONCEPTS)} generated")
