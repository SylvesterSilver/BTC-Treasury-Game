import { useState } from 'react';
import { EraSelect } from './components/EraSelect';
import { ConfigScreen } from './components/ConfigScreen';
import { BriefingScreen } from './components/BriefingScreen';
import { GameScreen } from './components/GameScreen';
import { ERAS } from './data/eras';
import type { Era } from './data/eras';
import type { GameConfig } from './data/gameConfig';
import type { EngineSnapshot } from './engine/gameEngine';
import { loadGame } from './engine/saveGame';

type Screen = 'menu' | 'config' | 'briefing' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [resumeSnapshot, setResumeSnapshot] = useState<EngineSnapshot | null>(null);

  const handleEraSelect = (era: Era) => {
    setSelectedEra(era);
    setResumeSnapshot(null);
    setScreen('config');
  };

  const handleConfigStart = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('briefing');
  };

  const handleContinueSave = () => {
    const save = loadGame();
    if (!save) return;
    const found = ERAS.find(e => e.id === save.summary.eraId);
    if (!found) return;
    setSelectedEra(found);
    setGameConfig({
      era: found,
      startingCapitalMM: save.snapshot.config.startingCapitalMM,
      startingBTCOverride: save.snapshot.config.startingBTCOverride,
    });
    setResumeSnapshot(save.snapshot);
    setScreen('game');
  };

  const handleExitToConfig = () => {
    setResumeSnapshot(null);
    setScreen('config');
  };

  const handleExitToMenu = () => {
    setScreen('menu');
    setSelectedEra(null);
    setGameConfig(null);
    setResumeSnapshot(null);
  };

  if (screen === 'game' && gameConfig) {
    return (
      <GameScreen
        config={gameConfig}
        snapshot={resumeSnapshot}
        onExitToMenu={handleExitToMenu}
        onExitToConfig={handleExitToConfig}
      />
    );
  }

  if (screen === 'briefing' && gameConfig) {
    return (
      <BriefingScreen
        config={gameConfig}
        onLaunch={() => setScreen('game')}
        onBack={() => setScreen('config')}
      />
    );
  }

  if (screen === 'config' && selectedEra) {
    return (
      <ConfigScreen
        era={selectedEra}
        onStart={handleConfigStart}
        onBack={handleExitToMenu}
      />
    );
  }

  return <EraSelect onSelect={handleEraSelect} onContinue={handleContinueSave} />;
}

export default App;
