import { useState, useRef, useEffect, useCallback } from 'react'
import type { PartialBlock } from '@blocknote/core'
import { updateNote, logNoteActivityThrottled } from '@/lib/notes'

interface UseNoteAutoSaveReturn {
    saveStatus: 'saved' | 'saving' | 'error' | ''
    updateContent: (content: PartialBlock[]) => void
    updateTitle: (title: string) => void
    initRefs: (title: string, content: any) => void
}

export function useNoteAutoSave(
    noteId: string | undefined,
    orgId: string | undefined,
    userId: string | undefined
): UseNoteAutoSaveReturn {
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | ''>('')
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestContent = useRef<PartialBlock[] | null>(null)
    const latestTitle = useRef<string>('')
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            if (saveTimeout.current) clearTimeout(saveTimeout.current)
            if (statusTimeout.current) clearTimeout(statusTimeout.current)
        }
    }, [noteId])

    const triggerSave = useCallback(() => {
        if (!noteId) return
        setSaveStatus('saving')
        if (saveTimeout.current) clearTimeout(saveTimeout.current)

        saveTimeout.current = setTimeout(async () => {
            try {
                await updateNote(noteId, {
                    title: latestTitle.current,
                    content: latestContent.current,
                })
                if (orgId && userId) {
                    logNoteActivityThrottled(orgId, userId, noteId, latestTitle.current || 'Untitled Note', 'note_edited').catch(console.error)
                }
                if (mountedRef.current) {
                    setSaveStatus('saved')
                    if (statusTimeout.current) clearTimeout(statusTimeout.current)
                    statusTimeout.current = setTimeout(() => {
                        if (mountedRef.current) setSaveStatus('')
                    }, 2000)
                }
            } catch (err) {
                console.error('Failed to save note', err)
                if (mountedRef.current) setSaveStatus('error')
            }
        }, 1000)
    }, [noteId, orgId, userId])

    const updateContent = useCallback((content: PartialBlock[]) => {
        latestContent.current = content
        triggerSave()
    }, [triggerSave])

    const updateTitle = useCallback((title: string) => {
        latestTitle.current = title
        triggerSave()
    }, [triggerSave])

    const initRefs = useCallback((title: string, content: any) => {
        latestTitle.current = title
        latestContent.current = content
    }, [])

    return { saveStatus, updateContent, updateTitle, initRefs }
}
