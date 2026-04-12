import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Gamepad2, Rocket, Music, Compass, Circle, Sword, Mic, Crosshair, ArrowDownCircle } from 'lucide-react';
import { CosmicDodge } from '@/components/game/CosmicDodge';
import { RhythmSaber } from '@/components/game/RhythmSaber';
import { MazeRunner } from '@/components/game/MazeRunner';
import { TiltBall } from '@/components/game/TiltBall';
import { MonsterSlayer } from '@/components/game/MonsterSlayer';
import { VoiceRunner } from '@/components/game/VoiceRunner';
import { SoundBlaster } from '@/components/game/SoundBlaster';
import { GravityDrop3D } from '@/components/game/GravityDrop3D';
import { TreasureQuest } from '@/components/game/TreasureQuest';
const games = [
  {
    id: 'cosmic-dodge',
    name: 'Cosmic Dodge',
    description: 'Né thiên thạch trong không gian. Dùng phím ← → hoặc chuột!',
    icon: Rocket,
    color: 'from-primary/20 to-secondary/20',
    border: 'border-primary/30',
  },
  {
    id: 'rhythm-saber',
    name: 'Rhythm Saber',
    description: 'Nhấn D F J K theo nhịp block rơi xuống!',
    icon: Music,
    color: 'from-secondary/20 to-accent/20',
    border: 'border-secondary/30',
  },
  {
    id: 'maze-runner',
    name: 'Maze Runner',
    description: 'Tìm đường thoát mê cung. WASD hoặc phím mũi tên!',
    icon: Compass,
    color: 'from-neon-green/10 to-primary/20',
    border: 'border-neon-green/30',
  },
  {
    id: 'tilt-ball',
    name: 'Tilt Ball',
    description: 'Nghiêng MPU6050 hoặc dùng WASD để lăn bóng thu thập coins!',
    icon: Circle,
    color: 'from-primary/20 to-neon-green/10',
    border: 'border-primary/30',
  },
  // {
  //   id: 'monster-slayer',
  //   name: 'Monster Slayer',
  //   description: 'Click hoặc nắm tay (FIST) để chém quái vật! Có âm thanh & wave system.',
  //   icon: Sword,
  //   color: 'from-neon-red/10 to-secondary/20',
  //   border: 'border-neon-red/30',
  // },
  {
    id: 'voice-runner',
    name: 'Voice Runner',
    description: 'Hét vào mic I2S để nhảy qua chướng ngại vật! Hoặc SPACE/↑.',
    icon: Mic,
    color: 'from-accent/20 to-primary/20',
    border: 'border-accent/30',
  },
  // {
  //   id: 'sound-blaster',
  //   name: 'Sound Blaster',
  //   description: 'Ngắm bằng MPU6050, hét vào mic I2S để bắn! Wave & ammo system.',
  //   icon: Crosshair,
  //   color: 'from-neon-red/10 to-neon-green/10',
  //   border: 'border-neon-red/30',
  // },
  // {
  //   id: 'gravity-drop-3d',
  //   name: 'Gravity Drop 3D',
  //   description: 'Game 3D! Nghiêng MPU6050 để rơi xuống các platform thu thập coins.',
  //   icon: ArrowDownCircle,
  //   color: 'from-secondary/20 to-primary/20',
  //   border: 'border-secondary/30',
  // },
    {
    id: 'treasure-quest',
    name: 'Contra Assault',
    description: 'Run & Gun! Bắn quái, né đạn, thu power-up. MPU6050 + Mic! Fullscreen mode.',
    icon: Crosshair,
    color: 'from-neon-red/10 to-secondary/20',
    border: 'border-neon-red/30',
  },
];

export default function MiniGame() {
  const { activeGame, setActiveGame } = useAppStore();

  if (activeGame === 'cosmic-dodge') return <CosmicDodge onBack={() => setActiveGame(null)} />;
  if (activeGame === 'rhythm-saber') return <RhythmSaber onBack={() => setActiveGame(null)} />;
  if (activeGame === 'maze-runner') return <MazeRunner onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tilt-ball') return <TiltBall onBack={() => setActiveGame(null)} />;
  // if (activeGame === 'monster-slayer') return <MonsterSlayer onBack={() => setActiveGame(null)} />;
  if (activeGame === 'voice-runner') return <VoiceRunner onBack={() => setActiveGame(null)} />;
  // if (activeGame === 'sound-blaster') return <SoundBlaster onBack={() => setActiveGame(null)} />;
  // if (activeGame === 'gravity-drop-3d') return <GravityDrop3D onBack={() => setActiveGame(null)} />;
  if (activeGame === 'treasure-quest') return <TreasureQuest onBack={() => setActiveGame(null)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h2 className="font-mono text-xl font-bold neon-text tracking-widest">GAME ARCADE</h2>
        <span className="font-mono text-xs text-muted-foreground ml-2">{games.length} games</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass rounded-xl p-5 ${game.border} border relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform`}
            onClick={() => setActiveGame(game.id)}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative z-10 space-y-3">
              <game.icon className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-mono text-sm font-bold text-foreground">{game.name}</h3>
                <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed">{game.description}</p>
              </div>
              <Button className="font-mono w-full text-xs" variant="default" size="sm">
                PLAY NOW
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
