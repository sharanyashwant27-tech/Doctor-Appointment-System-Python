import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@context/ThemeContext';

/** Dark/light toggle — persists via ThemeModeProvider localStorage. */
export default function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, toggleMode } = useThemeMode();
  return (
    <Tooltip title={mode === 'light' ? t('theme.darkMode') : t('theme.lightMode')}>
      <IconButton color="inherit" onClick={toggleMode} aria-label={t('theme.toggleAria')}>
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
