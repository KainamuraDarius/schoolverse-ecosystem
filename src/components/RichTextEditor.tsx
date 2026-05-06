import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import YouTube from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Strikethrough, Heading2, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Image as ImageIcon, Video, Undo2, Redo2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './RichTextEditor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing…',
  className
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      YouTube.configure({
        autoplay: false,
        nocookie: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addVideo = () => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter link URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const MenuButton = ({ icon: Icon, onClick, isActive }: any) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-border bg-muted/30">
        <MenuButton
          icon={Bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        />
        <MenuButton
          icon={Italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        />
        <MenuButton
          icon={Strikethrough}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        />
        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton
          icon={Heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        />
        <MenuButton
          icon={List}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        />
        <MenuButton
          icon={ListOrdered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        />
        <MenuButton
          icon={Quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        />
        <MenuButton
          icon={Code}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
        />
        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton icon={LinkIcon} onClick={addLink} />
        <MenuButton icon={ImageIcon} onClick={addImage} />
        <MenuButton icon={Video} onClick={addVideo} />
        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton
          icon={Undo2}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <MenuButton
          icon={Redo2}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 flex-1 overflow-y-auto focus-within:outline-none"
      />
    </div>
  );
}
