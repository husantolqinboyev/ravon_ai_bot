 import { useState, useEffect } from 'react';
 import { useAuth } from './useAuth';
 
 type UserRole = 'admin' | 'teacher' | 'user' | null;
 
 interface UseUserRoleReturn {
   role: UserRole;
   isLoading: boolean;
   isAdmin: boolean;
   isTeacher: boolean;
   canAccessTeacher: boolean;
 }
 
 export function useUserRole(): UseUserRoleReturn {
   const { user } = useAuth();
   const [role, setRole] = useState<UserRole>(null);
   const [isLoading, setIsLoading] = useState(true);
 
   useEffect(() => {
     const fetchRole = async () => {
       if (!user?.telegramUserId) {
         setRole(null);
         setIsLoading(false);
         return;
       }
 
       try {
         const response = await fetch(
           `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-user-role`,
           {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
               'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
             },
             body: JSON.stringify({ telegramUserId: user.telegramUserId }),
           }
         );
 
         const data = await response.json();
         
         if (response.ok && data.role) {
           setRole(data.role as UserRole);
         } else {
           setRole('user');
         }
       } catch (error) {
         console.error('Error fetching user role:', error);
         setRole('user');
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchRole();
   }, [user?.telegramUserId]);
 
   return {
     role,
     isLoading,
     isAdmin: role === 'admin',
     isTeacher: role === 'teacher',
     canAccessTeacher: role === 'admin' || role === 'teacher',
   };
 }