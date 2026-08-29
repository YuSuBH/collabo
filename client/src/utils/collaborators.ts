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

export const getAvailableColor = (usedColors: string[] = []): string => {
  const usedSet = new Set(usedColors.map((c) => c.toLowerCase()));
  const available = CURSOR_COLORS.filter(
    (c) => !usedSet.has(c.toLowerCase())
  );

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]!;
  }

  // If all colors are taken, pick the color with fewest occurrences
  const countMap: Record<string, number> = {};
  CURSOR_COLORS.forEach((c) => {
    countMap[c.toLowerCase()] = 0;
  });
  usedColors.forEach((c) => {
    const lower = c.toLowerCase();
    countMap[lower] = (countMap[lower] || 0) + 1;
  });

  const sorted = [...CURSOR_COLORS].sort(
    (a, b) => (countMap[a.toLowerCase()] || 0) - (countMap[b.toLowerCase()] || 0)
  );
  return sorted[0]!;
};

export const getRandomCollaborator = (usedColors: string[] = []): UserPresence => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = getAvailableColor(usedColors);

  return {
    name: `${adj} ${animal}`,
    color,
  };
};
