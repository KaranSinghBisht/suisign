// frontend/src/components/RichTextEditor.tsx

import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Focus from "@tiptap/extension-focus";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

type PlusMenuState = {
  top: number;
  visible: boolean;
  open: boolean;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className = "",
}) => {
  const [plusMenu, setPlusMenu] = React.useState<PlusMenuState>({
    top: 0,
    visible: false,
    open: false,
  });

  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      Focus.configure({
        className: "has-focus",
        mode: "all",
      }),
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // NOTE: .tiptap is used in CSS below
        class:
          "tiptap prose prose-invert prose-sm max-w-none focus:outline-none pl-10",
      },
    },
  });

  // Keep editor in sync if parent changes `value` (e.g. AI draft, template, etc.)
  React.useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    if (!value && current !== "") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  // Update + menu position & visibility when selection moves
  React.useEffect(() => {
    if (!editor || readOnly) return;

    const updatePlusMenu = () => {
      if (!editor) return;

      const { state, view } = editor;

      // Only show the plus when focused and on a caret (not range selection)
      if (!editor.isFocused || !state.selection.empty) {
        setPlusMenu((prev) => ({
          ...prev,
          visible: false,
          open: false,
        }));
        return;
      }

      const { from } = state.selection;
      const $from = state.doc.resolve(from);
      const parent = $from.parent;

      const isEmptyBlock =
        parent.isTextblock && parent.textContent.length === 0;

      if (!isEmptyBlock) {
        setPlusMenu((prev) => ({
          ...prev,
          visible: false,
          open: false,
        }));
        return;
      }

      const coords = view.coordsAtPos(from);
      const editorRect = view.dom.getBoundingClientRect();
      const top = coords.top - editorRect.top;

      setPlusMenu((prev) => ({
        ...prev,
        top,
        visible: true,
      }));
    };

    updatePlusMenu();
    editor.on("selectionUpdate", updatePlusMenu);
    editor.on("transaction", updatePlusMenu);
    editor.on("focus", updatePlusMenu);

    return () => {
      editor.off("selectionUpdate", updatePlusMenu);
      editor.off("transaction", updatePlusMenu);
      editor.off("focus", updatePlusMenu);
    };
  }, [editor, readOnly]);

  if (!editor) return null;

  const buttonBase =
    "px-2 py-1 text-[11px] rounded-md border border-slate-700/70 text-slate-200 hover:bg-slate-800/80";

  const headingLabel = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : "Text";

  const applyHeading = (level: 0 | 1 | 2 | 3) => {
    const chain = editor.chain().focus();
    if (level === 0) {
      chain.setParagraph().run();
    } else {
      chain.setHeading({ level }).run();
    }
    setIsHeadingMenuOpen(false);
  };

  const applyBlockFromPlus = (type: string) => {
    const chain = editor.chain().focus();

    switch (type) {
      case "paragraph":
        chain.setParagraph().run();
        break;
      case "h1":
        chain.setHeading({ level: 1 }).run();
        break;
      case "h2":
        chain.setHeading({ level: 2 }).run();
        break;
      case "bullet":
        chain.toggleBulletList().run();
        break;
      case "ordered":
        chain.toggleOrderedList().run();
        break;
      case "hr":
        chain.setHorizontalRule().run();
        break;
      default:
        break;
    }

    setPlusMenu((prev) => ({ ...prev, open: false }));
  };

  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-900/70 flex flex-col ${className}`}
    >
      {/* Fixed toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${buttonBase} ${
              editor.isActive("bold") ? "bg-slate-800" : ""
            }`}
          >
            <span className="font-semibold">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${buttonBase} ${
              editor.isActive("italic") ? "bg-slate-800" : ""
            }`}
          >
            <span className="italic">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${buttonBase} ${
              editor.isActive("bulletList") ? "bg-slate-800" : ""
            }`}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${buttonBase} ${
              editor.isActive("orderedList") ? "bg-slate-800" : ""
            }`}
          >
            1. List
          </button>

          {/* Heading dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setIsHeadingMenuOpen((prev) => !prev)
              }
              className={`${buttonBase} flex items-center gap-1 ${
                editor.isActive("heading") ? "bg-slate-800" : ""
              }`}
            >
              <span>{headingLabel}</span>
              <span className="text-[9px] opacity-80">▾</span>
            </button>
            {isHeadingMenuOpen && (
              <div className="absolute left-0 mt-1 min-w-[90px] rounded-md border border-slate-700 bg-slate-900 shadow-lg z-30">
                <button
                  type="button"
                  onClick={() => applyHeading(0)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => applyHeading(1)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                >
                  Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => applyHeading(2)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                >
                  Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => applyHeading(3)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                >
                  Heading 3
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={buttonBase}
          >
            ━
          </button>
        </div>
      )}

      {/* Editor + plus menu */}
      <div className="relative px-3 py-3 min-h-[200px]">
        {!readOnly && plusMenu.visible && (
          <div
            className="absolute left-2 -ml-1 z-20"
            style={{ top: plusMenu.top - 14 }} // nudge to roughly center on line
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={() =>
                setPlusMenu((prev) => ({
                  ...prev,
                  open: !prev.open,
                }))
              }
              className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 shadow-sm text-slate-200 flex items-center justify-center hover:bg-slate-800"
            >
              +
            </button>

            {plusMenu.open && (
              <div className="mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl p-3 space-y-2">
                <p className="text-[11px] text-slate-400 mb-1">
                  Blocks
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBlockFromPlus("paragraph")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Text</div>
                  <div className="text-[11px] text-slate-400">
                    Just start writing…
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBlockFromPlus("h1")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Heading 1</div>
                  <div className="text-[11px] text-slate-400">
                    Big section title
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBlockFromPlus("h2")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Heading 2</div>
                  <div className="text-[11px] text-slate-400">
                    Sub-section title
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBlockFromPlus("bullet")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Bulleted list</div>
                  <div className="text-[11px] text-slate-400">
                    Great for terms or steps
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyBlockFromPlus("ordered")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Numbered list</div>
                  <div className="text-[11px] text-slate-400">
                    Use for ordered steps
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyBlockFromPlus("hr")}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-100"
                >
                  <div className="font-semibold">Divider</div>
                  <div className="text-[11px] text-slate-400">
                    Separate sections
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
