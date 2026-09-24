const STYLES = [
  'notionists',
  'lorelei',
  'micah',
  'avataaars',
  'adventurer',
  'open-peeps',
  'personas',
  'miniavs'
];

export const getAvatar = (name: string | null) => {
  const seed = name || 'Guest';
  const encodedSeed = encodeURIComponent(seed);
  
  // Deterministically pick a style based on the name so it stays consistent for the same user
  const sum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const style = STYLES[sum % STYLES.length];

  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}&backgroundColor=transparent`;
};
