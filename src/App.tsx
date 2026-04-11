import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SetupScreen } from './components/SetupScreen';
import { PlayScreen } from './components/PlayScreen';
import { AboutScreen } from './components/AboutScreen';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { defaultGameConfig, STORAGE_KEY } from './gameDefaults';
import type { GameConfig } from './simulation/types';
import type { AppLanguage } from './i18n/storage';
import { getStoredLanguage } from './i18n/storage';
import i18n from './i18n';
import './App.css';

function loadStored(): GameConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameConfig;
  } catch {
    return null;
  }
}

export default function App() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');
  const [draft, setDraft] = useState<GameConfig>(() => loadStored() ?? defaultGameConfig(getStoredLanguage()));
  const [frozenConfig, setFrozenConfig] = useState<GameConfig | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  const start = useCallback(() => {
    setFrozenConfig(JSON.parse(JSON.stringify(draft)) as GameConfig);
    setPlayKey((k) => k + 1);
    setPhase('playing');
  }, [draft]);

  const backToSetup = useCallback(() => setPhase('setup'), []);

  const savePreset = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    alert(t('alerts.savedPreset'));
  };

  const loadPreset = () => {
    const x = loadStored();
    if (x) setDraft(x);
    else alert(t('alerts.nothingSaved'));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kanban-sinergia-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const x = JSON.parse(String(r.result)) as GameConfig;
        if (!x.members || !x.params) throw new Error('invalid');
        setDraft(x);
      } catch {
        alert(t('alerts.invalidJson'));
      }
    };
    r.readAsText(file);
  };

  const applyDefaultScenario = () => {
    setDraft(defaultGameConfig(i18n.language as AppLanguage));
  };

  return (
    <div className="app">
      <nav className="top-nav">
        <span className="brand">{t('nav.brand')}</span>
        <div className="nav-right">
          <LanguageSwitcher />
          <button
            type="button"
            className="btn small secondary"
            onClick={() => setAboutOpen((v) => !v)}
            aria-expanded={aboutOpen}
          >
            {aboutOpen ? t('about.close') : t('nav.about')}
          </button>
          {phase === 'setup' && !aboutOpen && (
            <div className="nav-actions">
              <button type="button" className="btn small secondary" onClick={applyDefaultScenario}>
                {t('nav.defaultScenario')}
              </button>
              <button type="button" className="btn small secondary" onClick={savePreset}>
                {t('nav.savePreset')}
              </button>
              <button type="button" className="btn small secondary" onClick={loadPreset}>
                {t('nav.loadPreset')}
              </button>
              <button type="button" className="btn small secondary" onClick={exportJson}>
                {t('nav.exportJson')}
              </button>
              <label className="btn small secondary file-label">
                {t('nav.importJson')}
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJson(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </nav>

      {aboutOpen ? (
        <AboutScreen onClose={() => setAboutOpen(false)} />
      ) : phase === 'setup' ? (
        <SetupScreen value={draft} onChange={setDraft} onStart={start} />
      ) : frozenConfig ? (
        <PlayScreen key={playKey} config={frozenConfig} onBackToSetup={backToSetup} />
      ) : null}
    </div>
  );
}
