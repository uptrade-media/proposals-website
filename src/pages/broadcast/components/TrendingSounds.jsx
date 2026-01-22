// src/pages/broadcast/components/TrendingSounds.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Search,
  TrendingUp,
  Clock,
  Heart,
  Plus,
  Check,
  ChevronDown,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Filter,
  Loader2,
  Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import { PlatformIcon } from './PlatformIcon';
import { toast } from 'sonner';

// Mock data for trending sounds
const MOCK_SOUNDS = [
  {
    id: '1',
    name: 'original sound - vibey.audio',
    artist: 'vibey.audio',
    duration: 15,
    uses: 1200000,
    platform: 'tiktok',
    category: 'trending',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: true,
    saved: false,
  },
  {
    id: '2',
    name: 'Espresso - Sabrina Carpenter',
    artist: 'Sabrina Carpenter',
    duration: 30,
    uses: 890000,
    platform: 'instagram',
    category: 'pop',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: true,
    saved: true,
  },
  {
    id: '3',
    name: 'Birds of a Feather',
    artist: 'Billie Eilish',
    duration: 25,
    uses: 650000,
    platform: 'both',
    category: 'indie',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: true,
    saved: false,
  },
  {
    id: '4',
    name: 'Not Like Us - Kendrick Lamar',
    artist: 'Kendrick Lamar',
    duration: 20,
    uses: 2100000,
    platform: 'tiktok',
    category: 'hiphop',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: true,
    saved: false,
  },
  {
    id: '5',
    name: 'Million Dollar Baby',
    artist: 'Tommy Richman',
    duration: 15,
    uses: 1500000,
    platform: 'both',
    category: 'trending',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: true,
    saved: true,
  },
  {
    id: '6',
    name: 'Good Luck, Babe!',
    artist: 'Chappell Roan',
    duration: 20,
    uses: 980000,
    platform: 'instagram',
    category: 'pop',
    previewUrl: null,
    coverImage: 'https://via.placeholder.com/80',
    trending: false,
    saved: false,
  },
];

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'pop', label: 'Pop', icon: Music2 },
  { id: 'hiphop', label: 'Hip Hop', icon: Music },
  { id: 'indie', label: 'Indie', icon: Music },
  { id: 'electronic', label: 'Electronic', icon: Music },
  { id: 'saved', label: 'Saved', icon: Heart },
];

const PLATFORMS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram Reels' },
  { id: 'youtube', label: 'YouTube Shorts' },
];

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

function SoundCard({
  sound,
  isPlaying,
  onPlay,
  onPause,
  onSelect,
  onSave,
  isSelected,
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg border p-4 transition-all',
        isSelected
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-secondary)]'
      )}
    >
      {/* Album Art / Play Button */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
        <img
          src={sound.coverImage}
          alt={sound.name}
          className="h-full w-full object-cover"
        />
        <button
          onClick={() => (isPlaying ? onPause() : onPlay(sound))}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-white" fill="white" />
          ) : (
            <Play className="h-6 w-6 text-white" fill="white" />
          )}
        </button>
      </div>

      {/* Sound Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className="font-medium text-[var(--text-primary)] truncate">
            {sound.name}
          </h4>
          {sound.trending && (
            <Badge
              variant="secondary"
              className="flex-shrink-0 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Trending
            </Badge>
          )}
        </div>
        <p className="text-sm text-[var(--text-tertiary)] truncate">{sound.artist}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {sound.duration}s
          </span>
          <span className="flex items-center gap-1">
            <Music className="h-3 w-3" />
            {formatNumber(sound.uses)} uses
          </span>
          <div className="flex items-center gap-1">
            {(sound.platform === 'tiktok' || sound.platform === 'both') && (
              <PlatformIcon platform="tiktok" size={12} />
            )}
            {(sound.platform === 'instagram' || sound.platform === 'both') && (
              <PlatformIcon platform="instagram" size={12} />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSave(sound)}
          className={cn(
            'h-9 w-9',
            sound.saved
              ? 'text-red-500 hover:text-red-600'
              : 'text-[var(--text-tertiary)] hover:text-red-500'
          )}
        >
          <Heart className={cn('h-5 w-5', sound.saved && 'fill-current')} />
        </Button>
        <Button
          onClick={() => onSelect(sound)}
          disabled={isSelected}
          className={cn(
            'h-9',
            isSelected
              ? 'bg-[var(--brand-primary)] text-white'
              : 'bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white'
          )}
        >
          {isSelected ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              Selected
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" />
              Use
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function AudioPlayer({ sound, isPlaying, onClose }) {
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + (100 / (sound.duration * 10));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, sound?.duration]);

  if (!sound) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center gap-4 p-4">
        {/* Sound Info */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded bg-[var(--surface-secondary)]">
            <img
              src={sound.coverImage}
              alt={sound.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">
              {sound.name}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">{sound.artist}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 px-4">
          <div className="h-1 w-full rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>{Math.floor((progress / 100) * sound.duration)}s</span>
            <span>{sound.duration}s</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8 text-[var(--text-tertiary)]"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={([v]) => setVolume(v)}
            max={100}
            step={1}
            className="w-24"
          />
        </div>

        {/* Close */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-[var(--text-tertiary)]"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export function TrendingSounds({ open, onClose, onSelect }) {
  const [sounds, setSounds] = useState(MOCK_SOUNDS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [playingSound, setPlayingSound] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);

  // Filter sounds
  const filteredSounds = sounds.filter((sound) => {
    const matchesSearch =
      sound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sound.artist.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform =
      selectedPlatform === 'all' ||
      sound.platform === selectedPlatform ||
      sound.platform === 'both';
    
    const matchesCategory =
      selectedCategory === 'saved'
        ? sound.saved
        : sound.category === selectedCategory || selectedCategory === 'trending' && sound.trending;

    return matchesSearch && matchesPlatform && matchesCategory;
  });

  const handlePlay = (sound) => {
    setPlayingSound(sound);
    // In real implementation, would actually play audio
  };

  const handlePause = () => {
    setPlayingSound(null);
  };

  const handleSave = (sound) => {
    setSounds((prev) =>
      prev.map((s) =>
        s.id === sound.id ? { ...s, saved: !s.saved } : s
      )
    );
    toast.success(sound.saved ? 'Removed from saved' : 'Added to saved');
  };

  const handleSelect = (sound) => {
    setSelectedSound(sound);
    onSelect?.(sound);
    toast.success(`Selected: ${sound.name}`);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col bg-[var(--glass-bg)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Music className="h-5 w-5 text-[var(--brand-primary)]" />
              Trending Sounds
            </DialogTitle>
            <DialogDescription className="text-[var(--text-tertiary)]">
              Discover trending audio for your Reels and TikToks
            </DialogDescription>
          </DialogHeader>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search sounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--surface-secondary)] border-[var(--glass-border)]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[var(--glass-border)] text-[var(--text-secondary)]"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {PLATFORMS.find((p) => p.id === selectedPlatform)?.label}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {PLATFORMS.map((platform) => (
                  <DropdownMenuItem
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={cn(
                      selectedPlatform === platform.id && 'bg-[var(--surface-secondary)]'
                    )}
                  >
                    {platform.id !== 'all' && (
                      <PlatformIcon platform={platform.id} size={16} className="mr-2" />
                    )}
                    {platform.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'flex-shrink-0 border-[var(--glass-border)]',
                    selectedCategory === category.id
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'text-[var(--text-secondary)]'
                  )}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {/* AI Suggestions */}
          <div className="rounded-lg bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-secondary)]/10 border border-[var(--brand-primary)]/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
              <h4 className="font-medium text-[var(--text-primary)]">AI Suggested</h4>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-3">
              Based on your audience and content style, these sounds could boost engagement:
            </p>
            <div className="flex gap-2 overflow-x-auto">
              {sounds.slice(0, 3).map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => handleSelect(sound)}
                  className="flex items-center gap-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <Music className="h-3 w-3 text-[var(--brand-primary)]" />
                  <span className="truncate max-w-[120px]">{sound.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : filteredSounds.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <Music className="mb-3 h-12 w-12 text-[var(--text-tertiary)]" />
                <p className="text-[var(--text-secondary)]">No sounds found</p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSounds.map((sound) => (
                  <SoundCard
                    key={sound.id}
                    sound={sound}
                    isPlaying={playingSound?.id === sound.id}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSelect={handleSelect}
                    onSave={handleSave}
                    isSelected={selectedSound?.id === sound.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Audio Player */}
      {playingSound && (
        <AudioPlayer
          sound={playingSound}
          isPlaying={!!playingSound}
          onClose={handlePause}
        />
      )}
    </>
  );
}

export default TrendingSounds;
