import { Box, BoxProps } from '@mui/material';

type MediBookLogoProps = {
  size?: number;
  sx?: BoxProps['sx'];
};

/** MediBook mark — green shield with medical cross + book. */
export default function MediBookLogo({ size = 32, sx }: MediBookLogoProps) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        flexShrink: 0,
        lineHeight: 0,
        ...((sx as object) || {}),
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
        <defs>
          <linearGradient id="mbLogoGrad" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#69F0AE" />
            <stop offset="0.45" stopColor="#00C853" />
            <stop offset="1" stopColor="#00695C" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#mbLogoGrad)" />
        <rect x="8" y="8" width="48" height="48" rx="13" fill="rgba(255,255,255,0.12)" />
        <path
          d="M14 40c6-5 12-7 18-7s12 2 18 7v4c-6-4-12-6-18-6s-12 2-18 6v-4z"
          fill="#E8FBEF"
          opacity="0.95"
        />
        <path d="M32 33v14" stroke="#00695C" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        <rect x="27" y="16" width="10" height="22" rx="3" fill="#FFFFFF" />
        <rect x="21" y="22" width="22" height="10" rx="3" fill="#FFFFFF" />
        <path
          d="M45 18c2.2-2.4 6.2-.4 5.2 2.8-.7 2.2-3.4 4-5.2 5.4-1.8-1.4-4.5-3.2-5.2-5.4-1-3.2 3-5.2 5.2-2.8z"
          fill="#B2FF59"
        />
      </svg>
    </Box>
  );
}
