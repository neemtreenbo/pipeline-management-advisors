import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
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
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">✉️</div>
                    <h1 className="auth-title">Check your email</h1>
                    <p className="auth-subtitle">
                        A password reset link has been sent to <strong>{email}</strong>.
                    </p>
                    <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem' }}>
                        Back to Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">🔑</div>
                <h1 className="auth-title">Forgot password?</h1>
                <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="auth-switch">
                    Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
