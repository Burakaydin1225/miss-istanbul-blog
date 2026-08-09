export const ContentType = {
  BLOG: "BLOG",
  GUIDE: "GUIDE",
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];
