export const getAvatar = (name: string | null) => {
  const seed = name ? encodeURIComponent(name) : 'Guest';
  // Using 'notionists' style for clean, minimal people avatars
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
};
