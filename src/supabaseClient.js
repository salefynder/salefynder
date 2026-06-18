import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gzoqehooamrudcevfybf.supabase.co'
const supabaseKey = 'sb_publishable_3xhPUfoa2u_EKG5je44FTA_2P-m6LC4'

export const supabase = createClient(supabaseUrl, supabaseKey)