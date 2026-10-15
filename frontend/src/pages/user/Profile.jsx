import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Shield, Save, CheckCircle2, Camera, Trash2, Upload, AlertCircle, Loader2 } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuthContext } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { getAvatarUrl } from '../../utils/avatar';

const Profile = () => {
  const { user, setUser } = useAuthContext();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [role] = useState(user?.role || 'user');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Image size must be less than 5 MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await authApi.uploadAvatar(formData);
      const newAvatar = response.data.avatar;
      setAvatar(newAvatar);

      // Update global auth user so navbar and app update immediately
      if (setUser) {
        setUser((prev) => ({ ...prev, avatar: newAvatar }));
      }

      showFeedback('success', 'Profile picture updated successfully!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatar) return;

    setUploading(true);
    try {
      await authApi.removeAvatar();
      setAvatar('');
      if (setUser) {
        setUser((prev) => ({ ...prev, avatar: '' }));
      }
      showFeedback('success', 'Profile picture removed.');
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to remove picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await authApi.updateProfile({ name, email });
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          name: response.data.user?.name || name,
          email: response.data.user?.email || email,
        }));
      }
      showFeedback('success', 'Profile information saved successfully!');
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const avatarDisplayUrl = getAvatarUrl(avatar);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <User size={16} />
          <span>Account & Security</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          User Profile & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal details, profile picture, and workspace credentials.
        </p>
      </div>

      {feedback.message && (
        <div
          role="alert"
          className={`flex items-center gap-2.5 rounded-xl p-4 text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Profile Avatar Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs text-center flex flex-col items-center justify-between">
          <div className="w-full flex flex-col items-center">
            {/* Avatar container with hover upload overlay */}
            <div className="relative group mx-auto mb-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-indigo-50 dark:border-indigo-950/60 shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt={name}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-4xl font-black">{name.charAt(0).toUpperCase() || 'U'}</span>
                )}

                {/* Uploading Spinner */}
                {uploading && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white">
                    <Loader2 size={28} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Action Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change profile picture"
                className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Camera size={18} />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name || 'User'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{email}</p>

            <div className="mt-3">
              <Badge variant={role === 'admin' ? 'indigo' : 'purple'} icon={Shield}>
                Role: {role.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 w-full space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-50"
            >
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload New Photo'}
            </button>

            {avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove Photo
              </button>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">JPG, PNG, or WEBP up to 5 MB</p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Personal Information
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Update your account details and display name.
              </p>
            </div>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={User}
              required
              placeholder="e.g. Jane Doe"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              required
              placeholder="e.g. jane@company.com"
            />

            <div className="rounded-xl bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Account Access Level</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your authorization tier determines system permissions and features.
                  </p>
                </div>
                <span className="rounded-lg bg-indigo-100 dark:bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} leftIcon={Save}>
                {saving ? 'Saving Changes…' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
