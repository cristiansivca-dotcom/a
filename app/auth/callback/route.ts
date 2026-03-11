import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrlFromHeaders } from '@/lib/url'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    const host = request.headers.get('host')
    const baseUrl = getBaseUrlFromHeaders(host)

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${baseUrl}${next}`)
        }
    }

    return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_failed`)
}
