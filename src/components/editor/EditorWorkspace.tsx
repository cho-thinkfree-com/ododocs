import { Box } from '@mui/material'
import { LinkBubbleMenu, RichTextField, TableBubbleMenu, useRichTextEditorContext } from 'mui-tiptap'
import BlockDragHandle from './BlockDragHandle'
import TableFloatingToolbar from './TableFloatingToolbar'
import { useEffect, useState } from 'react'

interface EditorWorkspaceProps {
  readOnly?: boolean
  initialWidth?: string
}

const EditorWorkspace = ({ readOnly, initialWidth = '950px' }: EditorWorkspaceProps) => {
  const editor = useRichTextEditorContext()
  const [layoutWidth, setLayoutWidth] = useState(initialWidth)

  useEffect(() => {
    if (!editor) return

    const updateWidth = () => {
      const attrs = editor.state.doc.attrs;
      const width = attrs['x-odocs-layoutWidth'];
      // Fallback to initialWidth if attribute is missing (e.g. during initialization)
      setLayoutWidth(width || initialWidth)
    }

    updateWidth()
    editor.on('transaction', updateWidth)
    editor.on('update', updateWidth)

    return () => {
      editor.off('transaction', updateWidth)
      editor.off('update', updateWidth)
    }
  }, [editor, initialWidth])

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: readOnly ? '#f5f5f5' : 'transparent',
      }}
    >
      <RichTextField
        variant='standard'
        RichTextContentProps={{
          sx: readOnly ? {
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflowY: 'auto',
            typography: 'body1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            '& .ProseMirror': {
              width: '100%',
              maxWidth: layoutWidth === '100%' ? 'none' : layoutWidth,
              minHeight: 'calc(100% - 32px)',
              margin: '32px auto 0',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              padding: '48px',
              paddingBottom: '80px', // Extra padding at bottom for better look
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'max-width 0.3s ease-in-out',
            },
          } : {
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflowY: 'auto',
            typography: 'body1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center the editor content
            '& .ProseMirror': {
              width: '100%',
              maxWidth: layoutWidth === '100%' ? 'none' : layoutWidth, // Dynamic width
              minHeight: '100%',
              padding: '48px',
              paddingBottom: '50vh', // Allow scrolling past the end
              boxSizing: 'border-box',
              margin: '0 auto', // Center horizontally
              transition: 'max-width 0.3s ease-in-out',
            },
            // Custom scrollbar styling for "floating" look
            '&::-webkit-scrollbar': {
              width: '8px',
              backgroundColor: 'transparent', // Transparent track
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle thumb
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          px: 0,
          '& .MuiTiptap-RichTextField-content': {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: '100%',
            overflowY: 'auto',
            px: 0,
            py: 0,
          },
          '& .MuiTiptap-RichTextField-paper': {
            px: 0,
          },
          '& .MuiTiptap-MenuBar-root': {
            display: 'none',
          },
        }}
      />
      {!readOnly && (
        <>
          <BlockDragHandle />
          <LinkBubbleMenu />
          <TableBubbleMenu />
          <TableFloatingToolbar />
        </>
      )}
    </Box>
  )
}

export default EditorWorkspace
