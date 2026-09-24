export const getAvatar = (name: string | null) => {
  if (!name) return '/avatars/1.jpg';
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `/avatars/${(sum % 9) + 1}.jpg`;
};
