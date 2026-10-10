/**
 * Helper to resolve avatar image URLs for local uploads and external URLs
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('data:')) {
    return avatarPath;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const serverOrigin = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return `${serverOrigin}${cleanPath}`;
};
