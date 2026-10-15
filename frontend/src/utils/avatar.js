/**
 * Helper to resolve avatar image URLs for local uploads and external URLs
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('data:')) {
    return avatarPath;
  }
  const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  const serverOrigin = rawApi ? rawApi.replace(/\/api\/?$/, '') : '';
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return serverOrigin ? `${serverOrigin}${cleanPath}` : cleanPath;
};
