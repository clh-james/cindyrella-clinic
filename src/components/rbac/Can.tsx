"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all permission keys for this user
      const { data, error } = await supabase
        .from('staff')
        .select(`
          role_id,
          roles (
            role_permissions (
              permissions ( key )
            )
          )
        `)
        .eq('id', user.id)
        .single();

      const rolesData = data?.roles as unknown as { role_permissions: { permissions?: { key: string } }[] };
      if (!error && rolesData?.role_permissions) {
        const keys = rolesData.role_permissions
          .map((rp: { permissions?: { key: string } }) => rp.permissions?.key)
          .filter(Boolean) as string[];
        setPermissions(keys);
      }
      setLoading(false);
    }
    
    loadPermissions();
  }, []);

  return { permissions, loading, hasPermission: (key: string) => permissions.includes(key) };
}

export function Can({ 
  permission, 
  children, 
  fallback = null 
}: { 
  permission: string, 
  children: React.ReactNode, 
  fallback?: React.ReactNode 
}) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null; // Or a skeleton if preferred
  if (hasPermission(permission)) return <>{children}</>;
  return <>{fallback}</>;
}
