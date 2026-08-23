import React from 'react';

export const Avatar = ({ user, name, src, size = 'md', className = '' }) => {
  const displayName = user?.full_name || name || 'User';
  const imageSrc = user?.avatar_url || src;

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={displayName}
        className={`rounded-full object-cover ring-2 ring-white dark:ring-slate-900 ${sizes[size]} ${className}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
        }}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-medium shadow-sm ring-2 ring-white dark:ring-slate-900 ${sizes[size]} ${className}`}
    >
      {getInitials(displayName)}
    </div>
  );
};
