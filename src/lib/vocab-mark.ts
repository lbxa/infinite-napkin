import { Mark, mergeAttributes } from '@tiptap/core';

export interface VocabMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vocabMark: {
      setVocabMark: (wordId: number) => ReturnType;
      unsetVocabMark: () => ReturnType;
      toggleVocabMark: (wordId: number) => ReturnType;
    };
  }
}

export const VocabMark = Mark.create<VocabMarkOptions>({
  name: 'vocabMark',

  // Prevent the mark from extending when typing at boundaries
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      wordId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-vocab-word-id'),
        renderHTML: (attributes) => {
          if (!attributes.wordId) {
            return {};
          }
          return {
            'data-vocab-word-id': attributes.wordId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-vocab-word-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setVocabMark:
        (wordId: number) =>
        ({ commands }) => {
          return commands.setMark(this.name, { wordId });
        },
      unsetVocabMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      toggleVocabMark:
        (wordId: number) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { wordId });
        },
    };
  },
});

export default VocabMark;


