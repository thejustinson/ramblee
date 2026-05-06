import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use 303 See Other to ensure the browser follows the redirect with a GET request
  return NextResponse.redirect(new URL('/', request.url), 303)
}
