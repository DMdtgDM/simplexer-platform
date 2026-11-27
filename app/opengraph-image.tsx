import { ImageResponse } from 'next/og';

export const alt = 'Simplexer — Home Tutors & Lessons in Ethiopia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Default share card, used whenever a page has no image of its own.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1E3A8A',
          padding: '64px',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-2px' }}>
          Simplexer
        </div>
        <div style={{ marginTop: 16, fontSize: 42, fontWeight: 600, color: '#F59E0B' }}>
          Home Tutors & Lessons in Ethiopia
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
          Learning &amp; tutoring for Ethiopia — Amharic / English
        </div>
      </div>
    ),
    { ...size }
  );
}
