import { ImageResponse } from 'next/og';

// The link preview for pages without their own picture (home, Our Works):
// a CollabStudio card. Project pages use their cover instead.
// Colours are the design system's (Neutral-9, Fire pastel, warm canvas), written
// out because the image is drawn without the site's CSS.
export const alt = 'CollabStudio · AI Creative Showcase';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 72,
          backgroundColor: '#080808',
          backgroundImage:
            'radial-gradient(circle at 25% 30%, rgba(255,180,157,0.9) 0%, rgba(255,180,157,0) 45%), radial-gradient(circle at 80% 75%, rgba(149,192,244,0.8) 0%, rgba(149,192,244,0) 45%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: '#FFB49D', fontWeight: 700 }}>KULT · CollabStudio</div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>AI Creative Showcase</div>
        <div style={{ fontSize: 32, marginTop: 20, color: '#D8D8D8' }}>Films, characters, key visuals and brand campaigns made with AI.</div>
      </div>
    ),
    size,
  );
}
