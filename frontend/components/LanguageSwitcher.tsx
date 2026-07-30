import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppLanguage, changeAppLanguage } from '@/i18n';

type Props = {
  size?: 'small' | 'medium';
  /** Light text for dark hero backgrounds */
  contrast?: 'default' | 'light';
};

export default function LanguageSwitcher({ size = 'small', contrast = 'default' }: Props) {
  const { t, i18n } = useTranslation();
  const current: AppLanguage = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  return (
    <Tooltip title={t('lang.switchAria')}>
      <ToggleButtonGroup
        exclusive
        size={size}
        value={current}
        onChange={(_, value: AppLanguage | null) => {
          if (value) void changeAppLanguage(value);
        }}
        aria-label={t('lang.switchAria')}
        sx={{
          bgcolor: contrast === 'light' ? 'rgba(255,255,255,0.12)' : 'transparent',
          '& .MuiToggleButton-root': {
            color: contrast === 'light' ? '#fff' : 'inherit',
            borderColor: contrast === 'light' ? 'rgba(255,255,255,0.35)' : undefined,
            px: 1,
            py: 0.25,
            textTransform: 'none',
            fontWeight: 600,
            '&.Mui-selected': {
              bgcolor: contrast === 'light' ? 'rgba(255,255,255,0.28)' : undefined,
              color: contrast === 'light' ? '#fff' : undefined,
            },
          },
        }}
      >
        <ToggleButton value="en">{t('lang.en')}</ToggleButton>
        <ToggleButton value="hi">{t('lang.hi')}</ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
