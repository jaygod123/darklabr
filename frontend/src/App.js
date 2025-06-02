import React, { useState, useEffect } from 'react';
import './App.css';

// Game State Management
const initialGameState = {
  player: {
    x: 0,
    y: 0,
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    strength: 10,
    magic: 10
  },
  currentRoom: null,
  gameStarted: false,
  inCombat: false,
  enemy: null,
  messages: [],
  dungeon: {},
  bossesDefeated: [],
  endlessMode: false,
  endlessDepth: 0,
  totalEnemiesDefeated: 0
};

// Room types and descriptions
const roomTypes = [
  {
    type: 'empty',
    description: 'A dark, empty chamber. Dust motes dance in what little light filters through cracks in the stone.',
    hasEnemy: false,
    weight: 1
  },
  {
    type: 'corridor',
    description: 'A narrow stone corridor stretches before you. The walls are cold and damp to the touch.',
    hasEnemy: false,
    weight: 1
  },
  {
    type: 'chamber',
    description: 'An ancient chamber with crumbling pillars. Strange shadows seem to move in the corners.',
    hasEnemy: true,
    enemyChance: 0.95,
    weight: 5
  },
  {
    type: 'vault',
    description: 'A forgotten vault filled with the echoes of ages past. Something valuable might be hidden here.',
    hasEnemy: true,
    enemyChance: 0.98,
    weight: 4
  },
  {
    type: 'crypt',
    description: 'Ancient burial chambers line the walls. The air is thick with malevolent presence.',
    hasEnemy: true,
    enemyChance: 1.0,
    weight: 3
  },
  {
    type: 'lair',
    description: 'A creature\'s lair scattered with bones and refuse. Danger lurks in every shadow.',
    hasEnemy: true,
    enemyChance: 1.0,
    weight: 2
  }
];

// Basic enemy types
const enemies = [
  { name: 'Shadow', health: 20, damage: 5, description: 'A writhing mass of darkness that seems to absorb light.', exp: 8 },
  { name: 'Skeleton Warrior', health: 30, damage: 8, description: 'Ancient bones held together by dark magic.', exp: 12 },
  { name: 'Cave Rat', health: 10, damage: 3, description: 'A diseased rodent with glowing red eyes.', exp: 5 },
  { name: 'Ghoul', health: 25, damage: 7, description: 'A decomposing creature that hungers for living flesh.', exp: 10 },
  { name: 'Dark Sprite', health: 15, damage: 6, description: 'A malevolent fairy creature crackling with dark energy.', exp: 9 },
  { name: 'Stone Golem', health: 40, damage: 10, description: 'An animated guardian of carved stone and ancient magic.', exp: 18 }
];

// Boss definitions - 5 unique bosses with special mechanics
const bosses = [
  {
    id: 'shadowlord',
    name: 'The Shadow Lord',
    health: 80,
    damage: 15,
    description: 'A towering figure wreathed in living darkness. Its presence chills your very soul.',
    exp: 50,
    encounterText: 'The shadows coalesce into a massive, terrifying form. The Shadow Lord has awakened!',
    defeatText: 'The Shadow Lord dissolves into wisps of darkness, its essence scattered to the void.',
    spawnDistance: 15
  },
  {
    id: 'bonequeen',
    name: 'The Bone Queen',
    health: 120,
    damage: 18,
    description: 'An ancient lich crowned with a diadem of skulls. Necromantic energy crackles around her.',
    exp: 75,
    encounterText: 'The air grows cold as skeletal hands emerge from the ground. The Bone Queen rises!',
    defeatText: 'The Bone Queen\'s crown shatters, and her form crumbles to ancient dust.',
    spawnDistance: 30
  },
  {
    id: 'flamedemon',
    name: 'The Flame Demon',
    health: 150,
    damage: 22,
    description: 'A massive creature of molten rock and hellfire. Its roar shakes the very foundations.',
    exp: 100,
    encounterText: 'The temperature rises drastically as flames burst from cracks in the stone. A Flame Demon emerges!',
    defeatText: 'The Flame Demon\'s fire extinguishes with a thunderous roar, leaving only cooling obsidian.',
    spawnDistance: 50
  },
  {
    id: 'voidkraken',
    name: 'The Void Kraken',
    health: 200,
    damage: 25,
    description: 'An eldritch horror from beyond reality. Its tentacles writhe through dimensions unseen.',
    exp: 150,
    encounterText: 'Reality tears open as something impossible forces its way through. The Void Kraken has arrived!',
    defeatText: 'The Void Kraken retreats through the dimensional rift, sealing the tear behind it.',
    spawnDistance: 75
  },
  {
    id: 'deathlord',
    name: 'The Death Lord',
    health: 300,
    damage: 30,
    description: 'The ultimate master of this dark realm. Death incarnate stands before you.',
    exp: 250,
    encounterText: 'The very air becomes still. Death itself materializes, wielding a scythe that cuts through souls.',
    defeatText: 'The Death Lord nods with respect before fading away. You have proven yourself worthy.',
    spawnDistance: 100
  }
];

function App() {
  const [gameState, setGameState] = useState(initialGameState);

  // Generate a room at coordinates
  const generateRoom = (x, y) => {
    const roomSeed = Math.abs(x * 1000 + y);
    const random = (roomSeed * 9301 + 49297) % 233280 / 233280;
    const distanceFromStart = Math.abs(x) + Math.abs(y);
    
    // Check for boss encounters
    for (const boss of bosses) {
      if (!gameState.bossesDefeated.includes(boss.id) && 
          distanceFromStart === boss.spawnDistance) {
        return {
          x, y,
          type: 'boss_chamber',
          description: `A massive chamber pulses with malevolent energy. Something ancient and powerful dwells here.`,
          hasEnemy: true,
          enemy: { ...boss, health: boss.health, isBoss: true },
          visited: false
        };
      }
    }
    
    // Weighted room selection for normal rooms
    const totalWeight = roomTypes.reduce((sum, room) => sum + room.weight, 0);
    let weightedRandom = random * totalWeight;
    let selectedRoom = roomTypes[0];
    
    for (const roomType of roomTypes) {
      weightedRandom -= roomType.weight;
      if (weightedRandom <= 0) {
        selectedRoom = roomType;
        break;
      }
    }
    
    let hasEnemy = false;
    let enemy = null;
    
    if (selectedRoom.hasEnemy && random < (selectedRoom.enemyChance || 0)) {
      hasEnemy = true;
      const enemyRandom = (random * 3) % 1;
      let enemyType = enemies[Math.floor(enemyRandom * enemies.length)];
      
      // Apply endless mode scaling
      if (gameState.endlessMode) {
        const scalingFactor = 1 + (gameState.endlessDepth * 0.2); // 20% increase per depth level
        enemyType = {
          ...enemyType,
          health: Math.floor(enemyType.health * scalingFactor),
          damage: Math.floor(enemyType.damage * scalingFactor),
          exp: Math.floor(enemyType.exp * scalingFactor)
        };
      }
      
      enemy = { ...enemyType, health: enemyType.health };
    }
    
    return {
      x, y,
      type: selectedRoom.type,
      description: selectedRoom.description,
      hasEnemy,
      enemy,
      visited: false
    };
  };

  // Get or create room
  const getRoom = (x, y) => {
    const key = `${x},${y}`;
    if (!gameState.dungeon[key]) {
      const newDungeon = { ...gameState.dungeon };
      newDungeon[key] = generateRoom(x, y);
      setGameState(prev => ({ ...prev, dungeon: newDungeon }));
      return newDungeon[key];
    }
    return gameState.dungeon[key];
  };

  // Add message to game log
  const addMessage = (message) => {
    setGameState(prev => ({
      ...prev,
      messages: [message, ...prev.messages.slice(0, 9)] // Keep last 10 messages
    }));
  };

  // Start the game
  const startGame = () => {
    const startingRoom = generateRoom(0, 0);
    startingRoom.visited = true;
    
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      currentRoom: startingRoom,
      dungeon: { '0,0': startingRoom }
    }));
    
    addMessage('You awaken in a dark dungeon. The air is thick with ancient dust and forgotten secrets.');
    addMessage('You can move using the directional buttons below.');
  };

  // Move player
  const movePlayer = (direction) => {
    if (gameState.inCombat) {
      addMessage('You cannot move while in combat!');
      return;
    }

    let newX = gameState.player.x;
    let newY = gameState.player.y;

    switch (direction) {
      case 'north': newY += 1; break;
      case 'south': newY -= 1; break;
      case 'east': newX += 1; break;
      case 'west': newX -= 1; break;
      default: return;
    }

    const newRoom = getRoom(newX, newY);
    
    setGameState(prev => {
      const updatedDungeon = { ...prev.dungeon };
      updatedDungeon[`${newX},${newY}`] = { ...newRoom, visited: true };
      
      return {
        ...prev,
        player: { ...prev.player, x: newX, y: newY },
        currentRoom: updatedDungeon[`${newX},${newY}`],
        dungeon: updatedDungeon
      };
    });

    addMessage(`You move ${direction}.`);
    addMessage(newRoom.description);
    
    if (newRoom.hasEnemy && newRoom.enemy) {
      if (newRoom.enemy.isBoss) {
        addMessage(newRoom.enemy.encounterText);
        addMessage(`*** ${newRoom.enemy.name.toUpperCase()} APPEARS! ***`);
      } else {
        addMessage(`A ${newRoom.enemy.name} emerges from the shadows!`);
      }
      addMessage(newRoom.enemy.description);
      setGameState(prev => ({
        ...prev,
        inCombat: true,
        enemy: { ...newRoom.enemy }
      }));
    }
  };

  // Combat system
  const attack = () => {
    if (!gameState.enemy || !gameState.inCombat) return;

    const playerDamage = Math.floor(Math.random() * gameState.player.strength) + 5;
    const enemyHealth = gameState.enemy.health - playerDamage;
    
    addMessage(`You attack the ${gameState.enemy.name} for ${playerDamage} damage.`);
    
    if (enemyHealth <= 0) {
      const isBoss = gameState.enemy.isBoss;
      
      if (isBoss) {
        addMessage(gameState.enemy.defeatText);
        addMessage(`*** ${gameState.enemy.name.toUpperCase()} DEFEATED! ***`);
      } else {
        addMessage(`The ${gameState.enemy.name} falls defeated!`);
      }
      
      const expGained = gameState.enemy.exp || 10;
      addMessage(`You gain ${expGained} experience.`);
      
      const newExp = gameState.player.experience + expGained;
      const expNeeded = gameState.player.level * 30;
      
      let newLevel = gameState.player.level;
      let newStrength = gameState.player.strength;
      let newMagic = gameState.player.magic;
      let newMaxHealth = gameState.player.maxHealth;
      let newHealth = gameState.player.health;
      
      if (newExp >= expNeeded) {
        newLevel += 1;
        newStrength += 2;
        newMagic += 1;
        newMaxHealth += 10;
        newHealth = Math.min(newHealth + 15, newMaxHealth);
        addMessage(`*** LEVEL UP! You are now level ${newLevel}! ***`);
        addMessage(`Strength increased to ${newStrength}, Magic to ${newMagic}!`);
      }
      
      let newBossesDefeated = [...gameState.bossesDefeated];
      let newEndlessMode = gameState.endlessMode;
      let newEndlessDepth = gameState.endlessDepth;
      let newTotalEnemiesDefeated = gameState.totalEnemiesDefeated + 1;
      
      // Handle boss defeat
      if (isBoss) {
        newBossesDefeated.push(gameState.enemy.id);
        
        if (newBossesDefeated.length === bosses.length && !gameState.endlessMode) {
          newEndlessMode = true;
          newEndlessDepth = 1;
          addMessage('*** ALL BOSSES DEFEATED! ***');
          addMessage('*** ENDLESS MODE ACTIVATED! ***');
          addMessage('Enemies will now grow stronger as you progress deeper into the abyss...');
        } else {
          const remaining = bosses.length - newBossesDefeated.length;
          addMessage(`${remaining} boss${remaining !== 1 ? 'es' : ''} remaining.`);
        }
      }
      
      // Increment endless depth every 10 enemies in endless mode
      if (newEndlessMode && newTotalEnemiesDefeated % 10 === 0) {
        newEndlessDepth += 1;
        addMessage(`*** DESCENDED TO DEPTH ${newEndlessDepth}! ***`);
        addMessage('The enemies grow stronger...');
      }
      
      setGameState(prev => ({
        ...prev,
        inCombat: false,
        enemy: null,
        player: { 
          ...prev.player, 
          experience: newExp,
          level: newLevel,
          strength: newStrength,
          magic: newMagic,
          maxHealth: newMaxHealth,
          health: newHealth
        },
        bossesDefeated: newBossesDefeated,
        endlessMode: newEndlessMode,
        endlessDepth: newEndlessDepth,
        totalEnemiesDefeated: newTotalEnemiesDefeated,
        currentRoom: { ...prev.currentRoom, hasEnemy: false, enemy: null }
      }));
      return;
    }

    // Enemy attacks back
    const enemyDamage = Math.floor(Math.random() * gameState.enemy.damage) + 2;
    const playerHealth = gameState.player.health - enemyDamage;
    
    addMessage(`The ${gameState.enemy.name} attacks you for ${enemyDamage} damage.`);
    
    if (playerHealth <= 0) {
      addMessage('You have been defeated! The darkness claims you...');
      setGameState(prev => ({
        ...prev,
        player: { ...prev.player, health: 0 },
        inCombat: false
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        enemy: { ...prev.enemy, health: enemyHealth },
        player: { ...prev.player, health: playerHealth }
      }));
    }
  };

  const flee = () => {
    if (!gameState.inCombat) return;
    
    addMessage('You flee from combat!');
    setGameState(prev => ({
      ...prev,
      inCombat: false,
      enemy: null
    }));
    
    // Move player back to previous safe location
    movePlayer('south');
  };

  return (
    <div className="game-container">
      {!gameState.gameStarted ? (
        <div className="intro-screen">
          <h1 className="game-title">The Dark Labyrinth</h1>
          <p className="game-subtitle">A journey into forgotten depths</p>
          <button onClick={startGame} className="start-button">
            Begin
          </button>
        </div>
      ) : (
        <div className="game-interface">
          {/* Player Status */}
          <div className="player-status">
            <div className="status-item">Health: {gameState.player.health}/{gameState.player.maxHealth}</div>
            <div className="status-item">Level: {gameState.player.level}</div>
            <div className="status-item">Experience: {gameState.player.experience}</div>
            <div className="status-item">Strength: {gameState.player.strength}</div>
            <div className="status-item">Magic: {gameState.player.magic}</div>
            <div className="status-item">Location: ({gameState.player.x}, {gameState.player.y})</div>
          </div>

          {/* Current Room */}
          <div className="room-display">
            {gameState.currentRoom && (
              <div className="room-description">
                {gameState.currentRoom.description}
              </div>
            )}
          </div>

          {/* Combat Interface */}
          {gameState.inCombat && gameState.enemy && (
            <div className="combat-interface">
              <div className="enemy-status">
                <strong>{gameState.enemy.name}</strong> - Health: {gameState.enemy.health}
              </div>
              <div className="combat-actions">
                <button onClick={attack} className="action-button">Attack</button>
                <button onClick={flee} className="action-button">Flee</button>
              </div>
            </div>
          )}

          {/* Movement Controls */}
          {!gameState.inCombat && gameState.player.health > 0 && (
            <div className="movement-controls">
              <div className="movement-row">
                <button onClick={() => movePlayer('north')} className="movement-button">North</button>
              </div>
              <div className="movement-row">
                <button onClick={() => movePlayer('west')} className="movement-button">West</button>
                <button onClick={() => movePlayer('east')} className="movement-button">East</button>
              </div>
              <div className="movement-row">
                <button onClick={() => movePlayer('south')} className="movement-button">South</button>
              </div>
            </div>
          )}

          {/* Game Messages */}
          <div className="message-log">
            {gameState.messages.map((message, index) => (
              <div key={index} className="message">
                {message}
              </div>
            ))}
          </div>

          {/* Game Over */}
          {gameState.player.health <= 0 && (
            <div className="game-over">
              <button onClick={() => window.location.reload()} className="restart-button">
                Begin Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;