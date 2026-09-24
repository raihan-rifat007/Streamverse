export interface Channel {
  id: string;
  name: string;
  category: ChannelCategory;
  logo: string;
  url: string;
  stream?: string;
  featured?: boolean;
  country?: string;
  language?: string;
  isHls?: boolean;
  isCustom?: boolean;
  isBlocked?: boolean;
  isFeatured?: boolean;
  referrer?: string;
  origin?: string;
  status?: 'online' | 'unstable' | 'offline';
}

export type ChannelCategory =
  | 'all'
  | 'news'
  | 'entertainment'
  | 'kids'
  | 'sports'
  | 'documentary'
  | 'music'
  | 'general'
  | 'movies'
  | 'religious'
  | 'shop'
  | 'cooking';

export interface CategoryItem {
  id: ChannelCategory;
  label: string;
  icon: string;
}

export interface ChannelListResponse {
  channels: Channel[];
  total: number;
  page?: number;
  totalPages?: number;
}

export interface AdminStats {
  totalChannels: number;
  onlineChannels: number;
  customChannels: number;
  blockedChannels: number;
  featuredChannels: number;
  cacheHitRate?: number;
  cacheKeys?: number;
  uptime?: number;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  channelCount: number;
  addedAt: string;
  lastSynced?: string;
}

export interface AdminChannel extends Channel {
  createdAt?: string;
  updatedAt?: string;
}

export type Theme = 'dark' | 'light';

export interface QualityLevel {
  index: number;
  label: string;
  bitrate?: number;
}
