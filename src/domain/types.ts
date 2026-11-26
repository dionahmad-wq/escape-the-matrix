import type { z } from 'zod';
import type {
  AnswerOptionSchema,
  CatalogFileSchema,
  CatalogMetaSchema,
  MaterialSchema,
  MediaSchema,
  NumberAnswerSchema,
  QuestionSchema,
  QuestionSourceSchema,
  QuestionTypeSchema,
} from './schema';

export type { CategoryId, CategoryInfo } from './categories';

export type Material = z.infer<typeof MaterialSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuestionSource = z.infer<typeof QuestionSourceSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type AnswerOption = z.infer<typeof AnswerOptionSchema>;
export type NumberAnswer = z.infer<typeof NumberAnswerSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionInput = z.input<typeof QuestionSchema>;
export type CatalogMeta = z.infer<typeof CatalogMetaSchema>;
export type CatalogFile = z.infer<typeof CatalogFileSchema>;
export type CatalogFileInput = z.input<typeof CatalogFileSchema>;
export type Points = Question['points'];
