export interface ReplyBrief {
  id: string;
  display_name: string;
  role: "learner" | "creator" | "ai";
  content: string;
}

export interface DiscussionMessage {
  id: string;
  course_id: string;
  user_id: string | null;
  role: "learner" | "creator" | "ai";
  display_name: string;
  content: string;
  reply_to_id: string | null;
  reply_preview: ReplyBrief | null;
  created_at: string;
}

export interface DiscussionPage {
  items: DiscussionMessage[];
  has_more: boolean;
}

export interface DiscussionMessageCreate {
  content: string;
  reply_to_id?: string | null;
}
