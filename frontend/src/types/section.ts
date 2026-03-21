/**
 * TypeScript types for sections, lessons, and reference links.
 */
export type LessonType = "video" | "note";

export interface Lesson {
  id: string;
  section_id: string;
  title: string;
  lesson_type: LessonType;
  youtube_url: string | null;
  youtube_title: string | null;
  youtube_thumbnail: string | null;
  youtube_duration: string | null;
  youtube_channel: string | null;
  notes_markdown: string | null;
  reference_links: ReferenceLink[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ReferenceLink {
  id: string;
  lesson_id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string | null;
  position: number;
  created_at: string;
}

export interface ReferenceLinkCreate {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  domain?: string | null;
}

export interface OpenGraphData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string | null;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
  created_at: string;
  updated_at: string;
}

export interface SectionBrief {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface SectionCreate {
  title: string;
  description?: string | null;
}

export interface SectionUpdate {
  title?: string;
  description?: string | null;
}

export interface LessonCreate {
  title: string;
  lesson_type?: LessonType;
}

export interface LessonUpdate {
  title?: string;
  lesson_type?: LessonType;
  youtube_url?: string | null;
  youtube_title?: string | null;
  youtube_thumbnail?: string | null;
  youtube_duration?: string | null;
  youtube_channel?: string | null;
  notes_markdown?: string | null;
}

export interface YouTubeMetadata {
  video_id: string;
  title: string;
  thumbnail_url: string;
  channel_name: string;
}

export interface LessonMove {
  target_section_id: string;
  position: number;
}

export interface ReorderItem {
  id: string;
  position: number;
}
