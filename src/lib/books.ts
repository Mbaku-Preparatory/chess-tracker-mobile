/**
 * A user's chess books: the GraphQL side (books/schema.py on the backend), as
 * on the web (lib/books.ts there). Uploading and the PGN download are REST, in
 * lib/api.ts, because they carry files.
 *
 * Two kinds: "exercises" (a book typeset in a chess font, read into one
 * position per exercise) and "reader" (any other book, usually a scan: read
 * on the website, over the owner's own PDF).
 */

import graphqlClient from "@/api/graphqlClient";

export type BookStatus = "pending" | "running" | "succeeded" | "failed";
export type BookKind = "exercises" | "reader";

export type Book = {
  publicId: string;
  title: string;
  status: BookStatus;
  error: string;
  kind: BookKind;
  exerciseCount: number;
  verifiedCount: number;
  /** 0..1 while a reader book is read page by page; null when unknown. */
  progress: number | null;
  pageCount: number;
  pagesDone: number;
  diagramCount: number;
  moveCount: number;
  notifyEmail: boolean;
  /** Pages in the whole PDF; pageCount can be fewer (see readInPart). */
  pdfPageCount: number;
  /** Only the first pageCount pages were read: a book from the guest trial. */
  readInPart: boolean;
};

export type BookExerciseSummary = { number: number; white: string; black: string; event: string; verified: boolean };

export type BookDetail = Book & {
  renumbered: [number, number][];
  missingSolutions: number[];
  exercises: BookExerciseSummary[];
};

export type BookExercise = {
  number: number;
  white: string;
  black: string;
  event: string;
  date: string;
  fen: string;
  pgn: string;
  verified: boolean;
  problem: string;
};

const BOOK_FIELDS =
  "publicId title status error kind exerciseCount verifiedCount progress pageCount pagesDone diagramCount moveCount notifyEmail pdfPageCount readInPart";

async function query<T>(text: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await graphqlClient({ data: { query: text, variables } });
  const errors = response.data?.errors;
  if (errors?.length) throw new Error(errors[0].message);
  return response.data.data;
}

export const isConverting = (b: Pick<Book, "status">) => b.status === "pending" || b.status === "running";

export async function myBooks(): Promise<Book[]> {
  return (await query<{ myBooks: Book[] }>(`{ myBooks { ${BOOK_FIELDS} } }`)).myBooks;
}

const DETAIL_FIELDS = `${BOOK_FIELDS} renumbered missingSolutions exercises { number white black event verified }`;

export async function getBook(publicId: string): Promise<BookDetail | null> {
  const data = await query<{ book: BookDetail | null }>(`query($id: String!) { book(publicId: $id) { ${DETAIL_FIELDS} } }`, { id: publicId });
  return data.book;
}

/** One exercise, with what its screen needs about the book around it. */
export type ExerciseWithBook = { exercise: BookExercise | null; title: string; numbers: number[] };

export async function getBookExercise(publicId: string, number: number): Promise<ExerciseWithBook> {
  const data = await query<{ exercise: BookExercise | null; book: { title: string; exercises: { number: number }[] } | null }>(
    `query($id: String!, $n: Int!) {
       exercise: bookExercise(publicId: $id, number: $n) { number white black event date fen pgn verified problem }
       book(publicId: $id) { title exercises { number } } }`,
    { id: publicId, n: number },
  );
  return {
    exercise: data.exercise,
    title: data.book?.title ?? "",
    numbers: data.book?.exercises.map((e) => e.number) ?? [],
  };
}

export async function deleteBook(publicId: string): Promise<boolean> {
  const data = await query<{ deleteBook: { ok: boolean } }>(
    "mutation($id: String!) { deleteBook(publicId: $id) { ok } }",
    { id: publicId },
  );
  return data.deleteBook.ok;
}
