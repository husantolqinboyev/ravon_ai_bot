import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export function TeachersManagement() {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState('');

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.error('Error loading teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddTeacher = async () => {
    if (!newTeacherId.trim()) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: newTeacherId.trim(),
          role: 'teacher'
        });

      if (error) throw error;

      toast({ title: "Muvaffaqiyat", description: "O'qituvchi qo'shildi" });
      setAddDialogOpen(false);
      setNewTeacherId('');
      loadTeachers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  const handleRemoveTeacher = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "O'chirildi", description: "O'qituvchi roli olib tashlandi" });
      loadTeachers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              O'qituvchilar
            </CardTitle>
            <CardDescription>O'qituvchi rolini boshqaring</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tayinlash
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Yuklanmoqda...
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Hali o'qituvchi yo'q</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div 
                  key={teacher.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">ID: {teacher.user_id}</p>
                      <Badge variant="secondary">O'qituvchi</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tayinlangan: {new Date(teacher.created_at).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveTeacher(teacher.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>O'qituvchi tayinlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Telegram User ID</Label>
              <Input 
                placeholder="Masalan: 123456789"
                value={newTeacherId}
                onChange={(e) => setNewTeacherId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Foydalanuvchi Telegram ID sini kiriting
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Bekor</Button>
            <Button onClick={handleAddTeacher}>Tayinlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
