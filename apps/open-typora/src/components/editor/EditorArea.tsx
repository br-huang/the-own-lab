import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import '../../styles/editor.css';

const defaultContent = `
<h1>Welcome to Open Typora</h1>
<p>Start writing your markdown here...</p>
<h2>Features (Coming Soon)</h2>
<ul>
  <li>WYSIWYG Markdown editing</li>
  <li>Source code mode toggle</li>
  <li>File management sidebar</li>
  <li>Theme system</li>
  <li>Export to PDF, HTML, and Word</li>
</ul>
<blockquote><p>This is a placeholder editor. Full Markdown integration will be added in Phase 1.</p></blockquote>
`;

export function EditorArea() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultContent,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  });

  return (
    <div className="flex-1 overflow-y-auto bg-(--color-bg-editor)">
      <EditorContent editor={editor} />
    </div>
  );
}
