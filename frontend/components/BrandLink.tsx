import { Stack, Typography, TypographyProps } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import MediBookLogo from '@components/MediBookLogo';
import { dashboardPathForUser } from '@/utils/navigation';

type BrandLinkProps = {
  suffix?: string;
  variant?: TypographyProps['variant'];
  sx?: TypographyProps['sx'];
  /** Logo pixel size; auto-scales from typography when omitted */
  logoSize?: number;
};

function logoSizeForVariant(variant: TypographyProps['variant'] | undefined, override?: number): number {
  if (override) return override;
  if (variant === 'h1') return 56;
  if (variant === 'h2') return 48;
  if (variant === 'h3') return 44;
  if (variant === 'h4') return 36;
  if (variant === 'h5') return 32;
  return 28;
}

/**
 * Clickable MediBook brand (logo + name) — role dashboard when signed in, landing for guests.
 */
export default function BrandLink({ suffix, variant = 'h6', sx, logoSize }: BrandLinkProps) {
  const { user } = useAuthContext();
  const to = dashboardPathForUser(user);
  const size = logoSizeForVariant(variant, logoSize);

  return (
    <Stack
      component={RouterLink}
      to={to}
      direction="row"
      alignItems="center"
      spacing={1.25}
      aria-label="MediBook home dashboard"
      sx={{
        color: 'inherit',
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        '&:hover': { opacity: 0.92 },
        '&:hover .mb-brand-text': {
          textDecoration: 'underline',
          textUnderlineOffset: 4,
        },
        ...(sx as object),
      }}
    >
      <MediBookLogo
        size={size}
        sx={{
          filter: 'drop-shadow(0 2px 6px rgba(0, 77, 64, 0.28))',
        }}
      />
      <Typography
        className="mb-brand-text"
        variant={variant}
        component="span"
        sx={{
          fontWeight: 700,
          lineHeight: 1.1,
          color: 'inherit',
        }}
      >
        MediBook{suffix ? ` · ${suffix}` : ''}
      </Typography>
    </Stack>
  );
}
