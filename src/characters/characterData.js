// The Bahraini family. Every character can finish every mission —
// their specialties show up in dialogue and guidance.

export const CHARACTERS = [
  {
    id: 'amal',
    name: 'Amal',
    arabic: 'أمل',
    role: 'The Programmer',
    title: 'Space Programmer & Systems Technician',
    description: 'Loves puzzles and writes the code that keeps the base\'s machines running.',
    color: '#6046C8',
    skin: '#C8956A',
    hair: '#2b1a12',
    feature: 'ribbon',
    featureColor: '#8b5cf6',
    height: 1.0,
    gender: 'female',
    npcSpot: { x: -4.5, z: 11.5, rot: 0.4 },
    talk: [
      'Every machine on this base follows instructions — and instructions are just code!',
      'Tip: if your code doesn\'t work the first time, that\'s normal. Programmers test and try again.',
    ],
  },
  {
    id: 'amer',
    name: 'Amer',
    arabic: 'عامر',
    role: 'The Explorer',
    title: 'Space Explorer',
    description: 'Adventurous and curious — maps craters and drives the robotic rover.',
    color: '#54B8F5',
    skin: '#B9845A',
    hair: '#1f140d',
    feature: 'curly',
    featureColor: '#1f140d',
    height: 0.98,
    gender: 'male',
    npcSpot: { x: -15, z: 12, rot: 2.2 },
    talk: [
      'Did you see Earth up there? Bahrain is somewhere on that blue marble!',
      'The rover is mapping craters for us. Some craters near the poles may hold water ice.',
    ],
  },
  {
    id: 'ahmed',
    name: 'Ahmed',
    arabic: 'أحمد',
    role: 'The Engineer',
    title: 'Lunar Base Engineer',
    description: 'Dad! Keeps the power systems running and the whole family safe.',
    color: '#FFC857',
    skin: '#B57E55',
    hair: '#1a110b',
    feature: 'mustache',
    featureColor: '#1a110b',
    height: 1.16,
    gender: 'male',
    npcSpot: { x: -16.5, z: 1.5, rot: 0.9 },
    talk: [
      'Our base runs on sunlight. Solar panels turn light into electricity.',
      'Safety first, always. A good engineer plans before acting.',
    ],
  },
  {
    id: 'maryam',
    name: 'Maryam',
    arabic: 'مريم',
    role: 'Life Support Specialist',
    title: 'Life Support Specialist',
    description: 'Cheerful and careful — watches our oxygen and food so everyone stays healthy.',
    color: '#FF7894',
    skin: '#C99B70',
    hair: '#3a2214',
    feature: 'bow',
    featureColor: '#FF8A3D',
    height: 0.94,
    gender: 'female',
    npcSpot: { x: 12.5, z: -1.5, rot: -0.6 },
    talk: [
      'There\'s no air to breathe on the Moon, so our habitat makes and stores oxygen for us.',
      'Our greenhouse grows fresh food. Plants need light, water and care!',
    ],
  },
];

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

export const ACCENT_COLORS = [
  { name: 'Bahrain Red', value: '#CE1126' },
  { name: 'Coral Pink', value: '#FF7894' },
  { name: 'Primary Purple', value: '#6046C8' },
  { name: 'Cosmic Blue', value: '#54B8F5' },
  { name: 'Mint Green', value: '#54D6AE' },
  { name: 'Solar Yellow', value: '#FFC857' },
];

export const VISOR_COLORS = [
  { name: 'Solar Gold', value: '#FFC857' },
  { name: 'Cosmic Blue', value: '#54B8F5' },
  { name: 'Nebula Purple', value: '#9b87f5' },
  { name: 'Moon White', value: '#dfe6ff' },
];
