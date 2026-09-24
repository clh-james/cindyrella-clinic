import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    // Exclude the unauthorized page itself and dashboard overview
    if (request.nextUrl.pathname !== '/admin/unauthorized' && request.nextUrl.pathname !== '/admin') {
      
      const routePermissions: Record<string, string> = {
        '/admin/pos': 'pos.view',
        '/admin/appointments': 'appointments.view',
        '/admin/customers': 'customers.view',
        '/admin/services': 'services.view',
        '/admin/inventory': 'inventory.view',
        '/admin/promos': 'promos.view',
        '/admin/gallery': 'gallery.view',
        '/admin/staff': 'staff.view',
        '/admin/settings': 'settings.view',
      };

      // Find if current path requires a permission
      let requiredPermission = null;
      for (const [route, perm] of Object.entries(routePermissions)) {
        if (request.nextUrl.pathname.startsWith(route)) {
          requiredPermission = perm;
          break;
        }
      }

      if (requiredPermission) {
        const { data: hasPerm } = await supabase.rpc('has_permission', {
          p_user_id: user.id,
          p_permission_key: requiredPermission
        });
        
        if (!hasPerm) {
          return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
