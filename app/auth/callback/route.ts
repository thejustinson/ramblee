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
        
      if (profile && !profile.wallet_address) {
        try {
          const privy = new PrivyClient(
            process.env.PRIVY_APP_ID || '',
            process.env.PRIVY_APP_SECRET || '',
            {
              walletApi: {
                authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY || ''
              }
            }
          )
          
          // Create a Solana Server Wallet for this user
          const { address, id: walletId } = await privy.walletApi.create({
            chainType: 'solana'
          })
          
          if (address) {
            // Need to save both the public address and the internal Privy Wallet ID 
            // since Server Wallets require their ID for sending transactions later.
            // We should add `privy_wallet_id` to the database schema in the future, 
            // but for now we only update wallet_address as requested.
            await supabase
              .from('profiles')
              .update({ wallet_address: address })
              .eq('id', user.id)
          }
        } catch (err: any) {
          console.error("Failed to provision Privy wallet:", err)
          // Pass the error message to the client so the user can see what failed
          return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent("Wallet Provisioning Failed: " + (err.message || "Unknown error"))}`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback to login on error or missing code
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
