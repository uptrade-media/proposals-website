// src/pages/broadcast/components/PlatformIcon.jsx
import React from 'react';
import { cn } from '@/lib/utils';

// Platform brand colors
const PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  gbp: '#4285F4',
  tiktok: '#000000',
  youtube: '#FF0000',
  snapchat: '#FFFC00',
};

// SVG paths for each platform
const PLATFORM_PATHS = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  gbp: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  snapchat: 'M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.076-.375-.09-.84-.194-1.440-.194-.525 0-1.029.06-1.485.104l-.15.015c-.585.06-1.096.119-1.485.119-.39 0-.898-.06-1.485-.119l-.15-.015a16.4 16.4 0 0 0-1.485-.104c-.6 0-1.065.105-1.440.194a3.46 3.46 0 0 1-.538.076h-.03c-.284 0-.479-.134-.555-.405a6.052 6.052 0 0 1-.134-.553c-.045-.195-.105-.479-.165-.57-1.872-.283-2.905-.702-3.145-1.271a.55.55 0 0 1-.045-.225c-.015-.239.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.344.209-.644.119-.869-.194-.449-.883-.675-1.333-.81a4.96 4.96 0 0 1-.344-.119c-.823-.33-1.228-.72-1.213-1.168 0-.359.285-.689.734-.838.15-.06.328-.09.509-.09.12 0 .299.016.464.104.375.18.733.285 1.033.301.198 0 .326-.045.401-.09a8.04 8.04 0 0 1-.033-.57c-.104-1.628-.229-3.654.299-4.847C7.859 1.069 11.215.793 12.205.793h.001z',
};

export function PlatformIcon({ 
  platform, 
  className, 
  size = 16,
  withBackground = false,
  showLabel = false,
}) {
  const color = PLATFORM_COLORS[platform] || '#6B7280';
  const path = PLATFORM_PATHS[platform];

  if (!path) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-full bg-[var(--surface-secondary)]', className)}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {platform?.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={{ width: size, height: size }}
    >
      <path d={path} />
    </svg>
  );

  if (withBackground) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          showLabel ? 'gap-2 px-2 py-1' : 'p-1.5'
        )}
        style={{ backgroundColor: `${color}15` }}
      >
        {icon}
        {showLabel && (
          <span className="text-sm font-medium capitalize" style={{ color }}>
            {platform === 'gbp' ? 'Google Business' : platform}
          </span>
        )}
      </div>
    );
  }

  if (showLabel) {
    return (
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm capitalize text-[var(--text-secondary)]">
          {platform === 'gbp' ? 'Google Business' : platform}
        </span>
      </div>
    );
  }

  return icon;
}

// Platform badge for connection status
export function PlatformBadge({ platform, status, className }) {
  const color = PLATFORM_COLORS[platform] || '#6B7280';
  
  const statusColors = {
    active: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
    expired: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    revoked: 'bg-red-500/20 text-red-500 border-red-500/30',
    error: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5',
        statusColors[status] || 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--glass-border)]',
        className
      )}
    >
      <PlatformIcon platform={platform} size={16} />
      <span className="text-sm font-medium capitalize">
        {platform === 'gbp' ? 'Google' : platform}
      </span>
      <span className="text-xs capitalize">({status})</span>
    </div>
  );
}

// Platform selector for multi-select
export function PlatformSelector({ 
  platforms, 
  selected, 
  onChange, 
  disabled = [],
  className,
}) {
  const togglePlatform = (platform) => {
    if (disabled.includes(platform)) return;
    
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {platforms.map((platform) => {
        const isSelected = selected.includes(platform);
        const isDisabled = disabled.includes(platform);
        const color = PLATFORM_COLORS[platform];

        return (
          <button
            key={platform}
            type="button"
            onClick={() => togglePlatform(platform)}
            disabled={isDisabled}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
              isSelected
                ? 'border-transparent text-white'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]',
              isDisabled && 'cursor-not-allowed opacity-50'
            )}
            style={{
              backgroundColor: isSelected ? color : undefined,
            }}
          >
            <PlatformIcon 
              platform={platform} 
              size={14} 
              className={isSelected ? 'brightness-0 invert' : ''} 
            />
            <span className="capitalize">
              {platform === 'gbp' ? 'Google' : platform}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PlatformIcon;
