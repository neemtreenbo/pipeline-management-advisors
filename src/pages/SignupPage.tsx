import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        })
        setLoading(false)
        if (error) {
            setError(error.message)
        } else {
            setSuccess(true)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-[380px] text-center">
                    <div className="text-2xl mb-6">✉️</div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">Check your email</h1>
                    <p className="text-sm text-muted-foreground mb-8">
                        We sent a confirmation link to <strong className="text-foreground">{email}</strong>.<br />
                        Click it to activate your account.
                    </p>
                    <Button asChild className="w-full">
                        <Link to="/login">Back to Sign In</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-[380px]">
                <div className="text-2xl mb-6">📊</div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">Create your account</h1>
                <p className="text-sm text-muted-foreground mb-8">Start managing your pipeline today</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="text-sm text-destructive bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            type="text"
                            placeholder="Juan dela Cruz"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading} id="signup-submit">
                        {loading ? 'Creating account…' : 'Create Account'}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
