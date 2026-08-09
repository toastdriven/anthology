/**
 * Runtime validation schemas (Zod) for data crossing untrusted boundaries —
 * primarily persisted JSON loaded from disk by `JSONIndex`/`JSONDocumentStore`.
 *
 * These mirror the plain TypeScript types in `types.ts`. TypeScript types are
 * erased at compile time and provide zero runtime guarantees; anything read
 * back from `Bun.file(...).json()` is `any` in practice, no matter what it's
 * annotated as. These schemas are the actual enforcement — `types.ts` stays
 * the compile-time source of truth for shapes, and `z.infer<...>` is used
 * below to keep the two from drifting apart silently.
 */
import { z } from "zod";
import type {
  Document,
  DocId,
  Vector,
} from "./types";

export const DocIdSchema = z.string();

export const DocumentSchema = z.object({
  id: DocIdSchema,
  content: z.string(),
  contentType: z.string().optional(),
});

export const VectorSchema = z.object({
  id: DocIdSchema,
  originalWord: z.string(),
  location: z.number(),
});

export const SerializedDocumentsSchema = z.record(DocIdSchema, DocumentSchema);

export const SerializedIndexSchema = z.record(z.string(), z.array(VectorSchema));

// Compile-time cross-checks: fails to compile if these schemas drift from the
// hand-written types in `types.ts`.
type _AssertDocument = z.infer<typeof DocumentSchema> extends Document ? true : never;
type _AssertVector = z.infer<typeof VectorSchema> extends Vector ? true : never;
const _assertDocument: _AssertDocument = true;
const _assertVector: _AssertVector = true;
