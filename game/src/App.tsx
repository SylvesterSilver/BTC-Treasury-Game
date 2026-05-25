import { useState } from 'react';
import { EraSelect } from './components/EraSelect';
import { ConfigScreen } from './components/ConfigScreen';
import { GameScreen } from './components/GameScreen';
import type { Era } from './data/eras';
import type { GameConfig } from './data/gameConfig';

type Screen = 'menu' | 'config' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  const handleEraSelect = (era: Era) => {
    setSelectedEra(era);
    setScreen('config');
  };

  const handleConfigStart = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  const handleExitToConfig = () => {
    setScreen('config');
  };

  const handleExitToMenu = () => {
    setScreen('menu');
    setSelectedEra(null);
    setGameConfig(null);
  };

  if (screen === 'game' && gameConfig) {
    return (
      <GameScreen
        config={gameConfig}
        onExitToMenu={handleExitToMenu}
        onExitToConfig={handleExitToConfig}
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

  return <EraSelect onSelect={handleEraSelect} />;
}

export default App;
