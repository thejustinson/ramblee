import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { PrivyClient } from '@privy-io/server-auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && sessionData?.session) {
      // Successfully authenticated
      const user = sessionData.session.user
      
      // Check for wallet address
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single()
        
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback to login on error or missing code
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
