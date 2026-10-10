// src/hooks/useAuth.js
// Hook that simply forwards the AuthContext values.

import { useAuthContext } from "../context/AuthContext";

// Export a named hook for convenience.
export const useAuth = () => {
  const context = useAuthContext();
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;
