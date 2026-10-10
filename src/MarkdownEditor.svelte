<script lang="ts" module>
  import { EditorView, minimalSetup } from "codemirror";
  import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
  import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
  import { languages } from "@codemirror/language-data";
  import { tags } from "@lezer/highlight";

  const theme = EditorView.theme(
    {
      "&": {
        color: "var(--text)",
        backgroundColor: "var(--inset)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        fontSize: "13px",
        height: "100%",
      },
      "&.cm-focused": {
        outline: "2px solid var(--link)",
        outlineOffset: "-1px",
      },
      ".cm-scroller": {
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        lineHeight: "1.6",
        overflow: "auto",
      },
      ".cm-content": {
        padding: "12px",
        caretColor: "var(--text)",
      },
      ".cm-line": {
        padding: "0",
      },
      ".cm-cursor": {
        borderLeftColor: "var(--text)",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
        {
          backgroundColor: "var(--selection)",
        },
    },
    { dark: true },
  );

  const highlighting = HighlightStyle.define([
    { tag: tags.heading, fontWeight: "600", color: "#fff" },
    { tag: tags.strong, fontWeight: "600" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { tag: [tags.link, tags.url], color: "var(--link)" },
    { tag: tags.monospace, color: "#dba878" },
    {
      tag: [
        tags.processingInstruction,
        tags.contentSeparator,
        tags.quote,
        tags.comment,
        tags.meta,
      ],
      color: "var(--muted)",
    },
    { tag: [tags.keyword, tags.operatorKeyword], color: "#e08a7a" },
    { tag: [tags.string, tags.special(tags.string)], color: "#a8c98a" },
    { tag: [tags.number, tags.bool, tags.atom, tags.null], color: "#dba878" },
    { tag: [tags.typeName, tags.className, tags.tagName], color: "#8cc5d6" },
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: "var(--link)",
    },
  ]);
</script>

<script lang="ts">
  let {
    value,
    labelledby,
    onchange,
  }: {
    value: string;
    labelledby: string;
    onchange: (value: string) => void;
  } = $props();

  let view: EditorView | undefined;

  // CodeMirror keeps its own copy of the text. Edits flow out through onchange;
  // this pushes value back in only when it changed from somewhere else.
  $effect(() => {
    const next = value;

    if (view && next !== view.state.doc.toString())
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      });
  });

  function mount(parent: HTMLElement) {
    const editor = new EditorView({
      parent,
      doc: value,
      extensions: [
        minimalSetup,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(highlighting),
        theme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-labelledby": labelledby,
          spellcheck: "true",
        }),
        EditorView.updateListener.of((update) => {
          const text = update.state.doc.toString();
          if (update.docChanged && text !== value) onchange(text);
        }),
      ],
    });
    view = editor;

    return {
      destroy() {
        view = undefined;
        editor.destroy();
      },
    };
  }
</script>

<div use:mount></div>

<style>
  div {
    height: 100%;
  }
</style>
