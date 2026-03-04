import { useEffect, useState } from 'react'
import { BlockNoteEditor, type PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

interface BlockNoteEditorProps {
    initialContent?: PartialBlock[] | null
    onChange?: (content: PartialBlock[]) => void
    editable?: boolean
}

export default function Editor({
    initialContent,
    onChange,
    editable = true,
}: BlockNoteEditorProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark')
        setTheme(isDark ? 'dark' : 'light')

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isDarkTheme = document.documentElement.classList.contains('dark')
                    setTheme(isDarkTheme ? 'dark' : 'light')
                }
            })
        })

        observer.observe(document.documentElement, { attributes: true })
        return () => observer.disconnect()
    }, [])

    const editor: BlockNoteEditor = useCreateBlockNote({
        initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    })

    return (
        <div className="w-full h-full max-w-4xl mx-auto blocknote-container">
            <BlockNoteView
                editor={editor}
                theme={theme}
                editable={editable}
                onChange={() => {
                    if (onChange) {
                        onChange(editor.document)
                    }
                }}
            />
        </div>
    )
}
