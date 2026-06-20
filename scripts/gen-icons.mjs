import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/favicon.svg')

const targets = [
  { size: 64, out: 'public/pwa-64x64.png' },
  { size: 192, out: 'public/pwa-192x192.png' },
  { size: 512, out: 'public/pwa-512x512.png' },
  { size: 180, out: 'public/apple-touch-icon.png' },
  { size: 512, out: 'public/maskable-icon-512x512.png', padded: true },
]

for (const t of targets) {
  let pipeline = sharp(svg, { density: 384 })
  if (t.padded) {
    const inner = Math.round(t.size * 0.7)
    const resized = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
    pipeline = sharp({
      create: { width: t.size, height: t.size, channels: 4, background: '#f0fdf4' },
    }).composite([{ input: resized, gravity: 'center' }])
  } else {
    pipeline = pipeline.resize(t.size, t.size)
  }
  await pipeline.png().toFile(t.out)
  console.log('wrote', t.out)
}
