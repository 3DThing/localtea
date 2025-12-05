'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
  ActionIcon,
  Group,
  Tooltip,
  Divider,
  Box,
  Menu,
  FileButton,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconSeparator,
  IconLink,
  IconPhoto,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconHighlight,
  IconCode,
  IconClearFormatting,
  IconArrowBackUp,
  IconArrowForwardUp,
} from '@tabler/icons-react';
import { useCallback, useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';

import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

interface MenuBarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
}

function MenuBar({ editor, onImageUpload }: MenuBarProps) {
  const [uploading, setUploading] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL ссылки', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(async (file: File | null) => {
    if (!file || !onImageUpload || !editor) return;

    setUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить изображение',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  }, [editor, onImageUpload]);

  if (!editor) {
    return null;
  }

  return (
    <Box className={styles.menuBar}>
      <LoadingOverlay visible={uploading} loaderProps={{ size: 'sm' }} />
      <Group gap={4} wrap="nowrap">
        {/* Отмена/Возврат */}
        <Tooltip label="Отменить">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Повторить">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <IconArrowForwardUp size={16} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        {/* Заголовки */}
        <Menu shadow="md" width={140}>
          <Menu.Target>
            <Tooltip label="Заголовки">
              <ActionIcon variant="subtle" size="sm">
                <IconH1 size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconH1 size={16} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              c={editor.isActive('heading', { level: 1 }) ? 'teal' : undefined}
            >
              Заголовок 1
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH2 size={16} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              c={editor.isActive('heading', { level: 2 }) ? 'teal' : undefined}
            >
              Заголовок 2
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH3 size={16} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              c={editor.isActive('heading', { level: 3 }) ? 'teal' : undefined}
            >
              Заголовок 3
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Divider orientation="vertical" />

        {/* Форматирование текста */}
        <Tooltip label="Жирный">
          <ActionIcon
            variant={editor.isActive('bold') ? 'filled' : 'subtle'}
            color={editor.isActive('bold') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Курсив">
          <ActionIcon
            variant={editor.isActive('italic') ? 'filled' : 'subtle'}
            color={editor.isActive('italic') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Подчеркивание">
          <ActionIcon
            variant={editor.isActive('underline') ? 'filled' : 'subtle'}
            color={editor.isActive('underline') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <IconUnderline size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Зачеркивание">
          <ActionIcon
            variant={editor.isActive('strike') ? 'filled' : 'subtle'}
            color={editor.isActive('strike') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <IconStrikethrough size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Выделение">
          <ActionIcon
            variant={editor.isActive('highlight') ? 'filled' : 'subtle'}
            color={editor.isActive('highlight') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <IconHighlight size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Код">
          <ActionIcon
            variant={editor.isActive('code') ? 'filled' : 'subtle'}
            color={editor.isActive('code') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <IconCode size={16} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        {/* Выравнивание */}
        <Tooltip label="По левому краю">
          <ActionIcon
            variant={editor.isActive({ textAlign: 'left' }) ? 'filled' : 'subtle'}
            color={editor.isActive({ textAlign: 'left' }) ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <IconAlignLeft size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="По центру">
          <ActionIcon
            variant={editor.isActive({ textAlign: 'center' }) ? 'filled' : 'subtle'}
            color={editor.isActive({ textAlign: 'center' }) ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <IconAlignCenter size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="По правому краю">
          <ActionIcon
            variant={editor.isActive({ textAlign: 'right' }) ? 'filled' : 'subtle'}
            color={editor.isActive({ textAlign: 'right' }) ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <IconAlignRight size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="По ширине">
          <ActionIcon
            variant={editor.isActive({ textAlign: 'justify' }) ? 'filled' : 'subtle'}
            color={editor.isActive({ textAlign: 'justify' }) ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <IconAlignJustified size={16} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        {/* Списки */}
        <Tooltip label="Маркированный список">
          <ActionIcon
            variant={editor.isActive('bulletList') ? 'filled' : 'subtle'}
            color={editor.isActive('bulletList') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconList size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Нумерованный список">
          <ActionIcon
            variant={editor.isActive('orderedList') ? 'filled' : 'subtle'}
            color={editor.isActive('orderedList') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconListNumbers size={16} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        {/* Цитата и разделитель */}
        <Tooltip label="Цитата">
          <ActionIcon
            variant={editor.isActive('blockquote') ? 'filled' : 'subtle'}
            color={editor.isActive('blockquote') ? 'teal' : 'gray'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <IconQuote size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Разделитель">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <IconSeparator size={16} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        {/* Ссылка и изображение */}
        <Tooltip label="Ссылка">
          <ActionIcon
            variant={editor.isActive('link') ? 'filled' : 'subtle'}
            color={editor.isActive('link') ? 'teal' : 'gray'}
            size="sm"
            onClick={setLink}
          >
            <IconLink size={16} />
          </ActionIcon>
        </Tooltip>
        {onImageUpload && (
          <FileButton onChange={handleImageUpload} accept="image/*">
            {(props) => (
              <Tooltip label="Изображение">
                <ActionIcon variant="subtle" size="sm" {...props}>
                  <IconPhoto size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </FileButton>
        )}

        <Divider orientation="vertical" />

        {/* Очистка форматирования */}
        <Tooltip label="Очистить форматирование">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <IconClearFormatting size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}

export function RichTextEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = 'Начните писать...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    immediatelyRender: false,
  });

  // Обновляем контент при изменении prop
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <Box className={styles.container}>
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} className={styles.editorContent} />
    </Box>
  );
}

export default RichTextEditor;
