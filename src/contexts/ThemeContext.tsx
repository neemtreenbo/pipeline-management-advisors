import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggleTheme: () => {},
})

const DARK_VARS: Record<string, string> = {
    '--background': '0 0% 7%',
    '--foreground': '0 0% 95%',
    '--card': '0 0% 10%',
    '--card-foreground': '0 0% 95%',
    '--popover': '0 0% 12%',
    '--popover-foreground': '0 0% 95%',
    '--primary': '0 0% 95%',
    '--primary-foreground': '0 0% 7%',
    '--secondary': '0 0% 15%',
    '--secondary-foreground': '0 0% 95%',
    '--muted': '0 0% 15%',
    '--muted-foreground': '0 0% 58%',
    '--accent': '211 100% 50.2%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '2 100% 61%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 20%',
    '--input': '0 0% 20%',
    '--ring': '211 100% 50.2%',
    '--success': '142 67% 50%',
    '--warning': '38 100% 52%',
}

const LIGHT_VARS: Record<string, string> = {
    '--background': '0 0% 100%',
    '--foreground': '0 0% 6.7%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 6.7%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 6.7%',
    '--primary': '0 0% 6.7%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 97.3%',
    '--secondary-foreground': '0 0% 6.7%',
    '--muted': '0 0% 97.3%',
    '--muted-foreground': '0 0% 42%',
    '--accent': '211 100% 50.2%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '2 100% 61%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 89.8%',
    '--input': '0 0% 89.8%',
    '--ring': '211 100% 50.2%',
    '--success': '142 67% 50%',
    '--warning': '38 100% 52%',
}

function applyTheme(theme: Theme) {
    const root = document.documentElement
    const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value)
    }
    if (theme === 'dark') {
        root.classList.add('dark')
    } else {
        root.classList.remove('dark')
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme') as Theme | null
        if (stored === 'light' || stored === 'dark') return stored
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    useEffect(() => {
        applyTheme(theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    function toggleTheme() {
        setTheme(t => (t === 'light' ? 'dark' : 'light'))
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
