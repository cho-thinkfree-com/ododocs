import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import SlashCommandList from '../../components/editor/SlashCommandList'
import type { CommandItem } from '../../components/editor/SlashCommandList'
import {
    TextFields,
    LooksOne,
    LooksTwo,
    Looks3,
    Looks4,
    Looks5,
    FormatListBulleted,
    FormatListNumbered,
    Checklist,
    FormatQuote,
    Code,
    HorizontalRule,
    Info,
    TableChart,
} from '@mui/icons-material'

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
                    props.command({ editor, range })
                },
                allow: ({ state, range }: { state: any; range: any }) => {
                    // Always allow the suggestion if we have a valid range
                    // This prevents it from closing during readonly operations
                    const $from = state.doc.resolve(range.from)
                    const type = state.schema.nodes[this.name]
                    const allow = !!$from.parent.type.contentMatch.matchType(type || state.schema.nodes.paragraph)

                    return allow
                },
            },
        }
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ]
    },
})

export const getSuggestionItems = (query: string): CommandItem[] => {
    if (query.startsWith('?')) {
        return []
    }

    const commands: CommandItem[] = [
        {
            title: 'Text',
            description: 'Just start typing with plain text.',
            icon: <TextFields />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setParagraph().run()
            },
        },
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            icon: <LooksOne />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            icon: <LooksTwo />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            icon: <Looks3 />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
            },
        },
        {
            title: 'Heading 4',
            description: 'Smaller section heading.',
            icon: <Looks4 />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
            },
        },
        {
            title: 'Heading 5',
            description: 'Smallest section heading.',
            icon: <Looks5 />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 5 }).run()
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list.',
            icon: <FormatListBulleted />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run()
            },
        },
        {
            title: 'Ordered List',
            description: 'Create a list with numbering.',
            icon: <FormatListNumbered />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run()
            },
        },
        {
            title: 'Task List',
            description: 'Track tasks with a todo list.',
            icon: <Checklist />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run()
            },
        },
        {
            title: 'Blockquote',
            description: 'Capture a quote.',
            icon: <FormatQuote />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run()
            },
        },
        {
            title: 'Code Block',
            description: 'Capture a code snippet.',
            icon: <Code />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
            },
        },
        {
            title: 'Horizontal Rule',
            description: 'Insert a horizontal divider.',
            icon: <HorizontalRule />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run()
            },
        },
        {
            title: 'Callout',
            description: 'Make writing stand out.',
            icon: <Info />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setCallout('info').run()
            },
        },
        {
            title: 'Table',
            description: 'Insert a 4x4 table.',
            icon: <TableChart />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 5, cols: 4, withHeaderRow: true }).toggleHeaderColumn().run()
            },
        },
    ]

    return commands.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
}

export const renderSuggestion = () => {
    let component: ReactRenderer | null = null
    let popup: any | null = null
    let isDestroying = false

    return {
        onStart: (props: any) => {
            // Clean up any existing instances first
            if (popup?.[0]) {
                popup[0].destroy()
                popup = null
            }
            if (component) {
                component.destroy()
                component = null
            }

            isDestroying = false

            component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
            })

            if (!props.clientRect) {
                return
            }

            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                onHide: () => {
                    // Prevent hiding unless we're actually destroying
                    return isDestroying
                },
            })
        },

        onUpdate: (props: any) => {
            if (isDestroying) return

            component?.updateProps(props)

            if (!props.clientRect) {
                return
            }

            popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect,
            })
        },

        onKeyDown: (props: any) => {
            if (isDestroying) return false

            if (props.event.key === 'Escape') {
                isDestroying = true
                popup?.[0]?.hide()
                return true
            }

            return component?.ref?.onKeyDown(props)
        },

        onExit: () => {
            isDestroying = true

            if (popup?.[0]) {
                popup[0].destroy()
                popup = null
            }
            if (component) {
                component.destroy()
                component = null
            }
        },
    }
}
