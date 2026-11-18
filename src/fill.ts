import { generateHTML } from '@tiptap/html';
import { extensions } from './extensions';
import { Doc, fillDoc, Row } from './lib';

// Values are inserted as text nodes (never HTML), so user input cannot inject markup.
export const renderHtml = (doc: Doc, row: Row | null): string => generateHTML(fillDoc(doc, row) as any, extensions);
