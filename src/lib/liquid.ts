/**
 * Liquid-glass refraction maps.
 *
 * Each glass surface gets an SVG filter whose feImage is a displacement map
 * shaped like that surface: neutral (128,128) in the middle, and a bezel band
 * along the rounded edge where R/G push samples inward. Fed to
 * feDisplacementMap this bends the backdrop at the rim like a thick lens.
 * Chromium is the only engine that accepts `backdrop-filter: url(#svg)`;
 * everywhere else the plain CSS blur in `.glass` is used.
 */

export const MAP_PAD = 24
const RES = 0.5 // maps are drawn at half resolution and stretched

export const supportsLiquidGlass = (() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Chrome\/\d+/.test(ua) && !/Firefox|FxiOS|CriOS|EdgiOS/.test(ua)
})()

const cache = new Map<string, Promise<string>>()

export function displacementMap(w: number, h: number, radius: number, bezel: number) {
  const key = `${w}x${h}r${radius}b${bezel}`
  let hit = cache.get(key)
  if (!hit) {
    hit = drawMap(w, h, radius, bezel)
    cache.set(key, hit)
  }
  return hit
}

function drawMap(w: number, h: number, radius: number, bezel: number) {
  const W = Math.max(2, Math.ceil((w + MAP_PAD * 2) * RES))
  const H = Math.max(2, Math.ceil((h + MAP_PAD * 2) * RES))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const data = img.data

  const hw = w / 2
  const hh = h / 2
  const r = Math.min(radius, hw, hh)

  for (let y = 0; y < H; y++) {
    const py = y / RES - MAP_PAD - hh
    for (let x = 0; x < W; x++) {
      const px = x / RES - MAP_PAD - hw
      // Signed distance to the rounded rectangle (negative inside).
      const qx = Math.abs(px) - (hw - r)
      const qy = Math.abs(py) - (hh - r)
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
      const depth = -outside

      let dx = 0
      let dy = 0
      if (depth > 0 && depth < bezel) {
        let nx: number
        let ny: number
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(qx, qy) || 1
          nx = qx / l
          ny = qy / l
        } else if (qx > qy) {
          nx = 1
          ny = 0
        } else {
          nx = 0
          ny = 1
        }
        nx *= Math.sign(px) || 1
        ny *= Math.sign(py) || 1
        // Circular bezel profile: steepest right at the rim.
        const t = 1 - depth / bezel
        const mag = 1 - Math.sqrt(1 - t * t)
        dx = -nx * mag
        dy = -ny * mag
      }

      const i = (y * W + x) * 4
      data[i] = 128 + dx * 127
      data[i + 1] = 128 + dy * 127
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL()))
  })
}
