import { useState, useEffect } from 'react';
import { UserPlus, Search, Users, Hash, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CachedUser {
  id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  last_seen_at: string;
}

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  existingStudentIds: string[];
  onSuccess: () => void;
}

export function AddStudentDialog({ 
  open, 
  onOpenChange, 
  teacherId, 
  existingStudentIds,
  onSuccess 
}: AddStudentDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<CachedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CachedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(u => 
        (u.telegram_username?.toLowerCase().includes(query)) ||
        (u.telegram_first_name?.toLowerCase().includes(query)) ||
        (u.telegram_last_name?.toLowerCase().includes(query)) ||
        u.telegram_user_id.includes(query)
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      // Load from users_cache table
      const { data, error } = await supabase
        .from('users_cache')
        .select('*')
        .order('last_seen_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        // Fallback to auth_codes if users_cache doesn't exist
        const { data: authData } = await supabase
          .from('auth_codes')
          .select('telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, created_at')
          .order('created_at', { ascending: false });
        
        if (authData) {
          // Get unique users
          const uniqueUsers = authData.reduce((acc: CachedUser[], curr) => {
            if (!acc.find(u => u.telegram_user_id === curr.telegram_user_id.toString())) {
              acc.push({
                id: curr.telegram_user_id.toString(),
                telegram_user_id: curr.telegram_user_id.toString(),
                telegram_username: curr.telegram_username,
                telegram_first_name: curr.telegram_first_name,
                telegram_last_name: curr.telegram_last_name,
                last_seen_at: curr.created_at
              });
            }
            return acc;
          }, []);
          setUsers(uniqueUsers.filter(u => !existingStudentIds.includes(u.telegram_user_id)));
        }
        return;
      }

      setUsers((data || []).filter(u => !existingStudentIds.includes(u.telegram_user_id)));
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleAddById = async () => {
    if (!studentId.trim()) return;
    await addStudent(studentId.trim());
  };

  const handleAddByUsername = async () => {
    if (!username.trim()) return;
    
    // Find user by username
    const user = users.find(u => 
      u.telegram_username?.toLowerCase() === username.toLowerCase().replace('@', '')
    );
    
    if (user) {
      await addStudent(user.telegram_user_id);
    } else {
      toast({
        title: "Topilmadi",
        description: "Bu username bilan foydalanuvchi topilmadi",
        variant: "destructive"
      });
    }
  };

  const handleAddFromList = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsLoading(true);
    try {
      const inserts = selectedUsers.map(studentId => ({
        teacher_id: teacherId,
        student_id: studentId
      }));

      const { error } = await supabase
        .from('teacher_students')
        .insert(inserts);

      if (error) throw error;

      toast({ 
        title: "Muvaffaqiyat", 
        description: `${selectedUsers.length} ta o'quvchi qo'shildi` 
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addStudent = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: teacherId,
          student_id: id
        });

      if (error) throw error;

      toast({ title: "Muvaffaqiyat", description: "O'quvchi qo'shildi" });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStudentId('');
    setUsername('');
    setSearchQuery('');
    setSelectedUsers([]);
    setActiveTab('list');
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            O'quvchi qo'shish
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Ro'yxatdan</span>
            </TabsTrigger>
            <TabsTrigger value="id" className="text-xs sm:text-sm">
              <Hash className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">ID bo'yicha</span>
            </TabsTrigger>
            <TabsTrigger value="username" className="text-xs sm:text-sm">
              <AtSign className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Username</span>
            </TabsTrigger>
          </TabsList>

          {/* Select from list */}
          <TabsContent value="list" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ism, username yoki ID bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Foydalanuvchilar topilmadi</p>
                <p className="text-xs">ID yoki username orqali qo'shing</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.telegram_user_id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleUserSelection(user.telegram_user_id)}
                    >
                      <Checkbox 
                        checked={selectedUsers.includes(user.telegram_user_id)}
                        onCheckedChange={() => toggleUserSelection(user.telegram_user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {user.telegram_first_name || 'Foydalanuvchi'} {user.telegram_last_name || ''}
                          </p>
                          {user.telegram_username && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              @{user.telegram_username}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ID: {user.telegram_user_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedUsers.length > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-medium text-primary">{selectedUsers.length}</span> ta tanlandi
              </p>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Bekor
              </Button>
              <Button 
                onClick={handleAddFromList} 
                disabled={selectedUsers.length === 0 || isLoading}
                className="w-full sm:w-auto"
              >
                Qo'shish ({selectedUsers.length})
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Add by ID */}
          <TabsContent value="id" className="space-y-4">
            <div>
              <Label>Telegram User ID</Label>
              <Input 
                placeholder="Masalan: 123456789"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O'quvchi Telegram ID sini kiriting
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Bekor
              </Button>
              <Button onClick={handleAddById} disabled={!studentId.trim() || isLoading} className="w-full sm:w-auto">
                Qo'shish
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Add by username */}
          <TabsContent value="username" className="space-y-4">
            <div>
              <Label>Telegram Username</Label>
              <Input 
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O'quvchi Telegram username ni kiriting
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Bekor
              </Button>
              <Button onClick={handleAddByUsername} disabled={!username.trim() || isLoading} className="w-full sm:w-auto">
                Qo'shish
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}