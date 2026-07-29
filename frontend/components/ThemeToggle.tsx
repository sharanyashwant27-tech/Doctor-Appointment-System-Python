import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '@context/ThemeContext';

/** Dark/light toggle — persists via ThemeModeProvider localStorage. */
export default function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  return (
    <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
      <IconButton color="inherit" onClick={toggleMode} aria-label="toggle theme">
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
