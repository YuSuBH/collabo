export interface UserPresence {
  name: string;
  color: string;
}

export interface Collaborator extends UserPresence {
  clientId: number;
  isCurrentUser: boolean;
}

const ADJECTIVES = [
  'Cyber',
  'Neon',
  'Quantum',
  'Hyper',
  'Cosmic',
  'Solar',
  'Lunar',
  'Pixel',
  'Turbo',
  'Vortex',
  'Shadow',
  'Atomic',
  'Aero',
  'Glitch',
];

const ANIMALS = [
  'Fox',
  'Falcon',
  'Panther',
  'Lynx',
  'Wolf',
  'Hawk',
  'Eagle',
  'Viper',
  'Otter',
  'Panda',
  'Cheetah',
  'Dragon',
  'Tiger',
  'Phoenix',
];

export const CURSOR_COLORS = [
  '#FF4B4B', // Coral Red
  '#00C853', // Emerald Green
  '#2979FF', // Royal Blue
  '#FF6D00', // Amber Orange
  '#AA00FF', // Purple
  '#00B0FF', // Sky Blue
  '#FFD600', // Gold Yellow
  '#E91E63', // Pink
  '#00BFA5', // Teal
  '#651FFF', // Deep Indigo
  '#FF5252', // Crimson
  '#76FF03', // Lime
];

export const getRandomCollaborator = (): UserPresence => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]!;

  return {
    name: `${adj} ${animal}`,
    color,
  };
};
