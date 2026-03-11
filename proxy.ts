import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables in proxy')
        return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const isConfirmed = !!user?.email_confirmed_at;
    const isBlocked = !!user?.user_metadata?.blocked;

    // 4. Session Fingerprint Check (Single Session Enforcement)
    const sessionId = request.cookies.get("sb-session-id")?.value;
    const currentSessionId = user?.user_metadata?.current_session_id;

    if (user && sessionId && currentSessionId && sessionId !== currentSessionId) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'concurrent_session')
        return NextResponse.redirect(url)
    }

    // 5. Admin Routes Protection
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Redirect if not logged in
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Redirect if no role assigned (Onboarding) - NEW
        const role = user.user_metadata?.role;
        if (!role) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding/role'
            return NextResponse.redirect(url)
        }

        // Redirect if blocked
        if (isBlocked) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'blocked')
            return NextResponse.redirect(url)
        }

        // Redirect if logged in but email NOT confirmed
        if (!isConfirmed) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'unconfirmed')
            return NextResponse.redirect(url)
        }
    }

    // 2. Case: Accessing login/signup while already authenticated and confirmed (and not blocked)
    if (user && isConfirmed && !isBlocked && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
        const role = user.user_metadata?.role;
        const url = request.nextUrl.clone()
        if (role === 'inventario') {
            url.pathname = '/admin/inventory'
        } else {
            url.pathname = '/admin'
        }
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
