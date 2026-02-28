import { useState, useEffect } from 'react';
import { BookOpen, Type, FileText, Shuffle, Keyboard, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  type: string;
  content: string;
  translation: string | null;
  is_public: boolean;
}

interface MaterialSelectorProps {
  telegramUserId: string;
  onSelect: (content: string, materialId?: string) => void;
  selectedContent: string;
}

export function MaterialSelector({ telegramUserId, onSelect, selectedContent }: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignedMaterials, setAssignedMaterials] = useState<Material[]>([]);
  const [customText, setCustomText] = useState('');
  const [activeTab, setActiveTab] = useState('assigned');
  const [isLoading, setIsLoading] = useState(true);
  const [randomFilter, setRandomFilter] = useState<'all' | 'word' | 'text'>('all');

  useEffect(() => {
    loadMaterials();
  }, [telegramUserId]);

  const loadMaterials = async () => {
    try {
      setIsLoading(true);

      const response = await api.getMaterials();
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.public || []);

        // Assigned materials come from student tasks
        const assigned = (data.assigned || []).map((task: any) => ({
          id: task.id,
          type: task.task_type || 'text',
          content: task.task_text,
          translation: null,
          is_public: false
        }));
        setAssignedMaterials(assigned);
      }
    } catch (err) {
      console.error('Error loading materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomSelect = () => {
    const allMaterials = [...materials, ...assignedMaterials];
    const filtered =
      randomFilter === 'all'
        ? allMaterials
        : allMaterials.filter((m) => m.type === (randomFilter === 'word' ? 'word' : 'text'));

    if (filtered.length > 0) {
      const random = filtered[Math.floor(Math.random() * filtered.length)];
      onSelect(random.content, random.id);
    }
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onSelect(customText.trim());
      setCustomText('');
    }
  };

  const MaterialCard = ({ material, isSelected }: { material: Material; isSelected: boolean }) => (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => onSelect(material.content, material.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {material.type === 'word' ? (
                <Type className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-secondary" />
              )}
              <Badge variant="outline" className="text-xs">
                {material.type === 'word' ? 'So\'z' : 'Matn'}
              </Badge>
            </div>
            <p className="font-medium text-sm truncate">{material.content}</p>
            {material.translation && (
              <p className="text-xs text-muted-foreground truncate">{material.translation}</p>
            )}
          </div>
          {isSelected && (
            <Check className="h-5 w-5 text-primary shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned" className="text-xs">
            <BookOpen className="h-4 w-4 mr-1" />
            Topshiriqlar
            {assignedMaterials.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {assignedMaterials.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            Kutubxona
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <Keyboard className="h-4 w-4 mr-1" />
            O'zim yozaman
          </TabsTrigger>
        </TabsList>

        {/* Assigned Materials */}
        <TabsContent value="assigned" className="space-y-3">
          {assignedMaterials.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  O'qituvchi sizga hali topshiriq yubormagan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {assignedMaterials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  isSelected={selectedContent === material.content}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Public Library */}
        <TabsContent value="library" className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <Button variant="outline" size="sm" onClick={handleRandomSelect}>
              <Shuffle className="h-4 w-4 mr-1" />
              Tasodifiy
            </Button>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={randomFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRandomFilter('all')}
              >
                Hammasi
              </Button>
              <Button
                type="button"
                size="sm"
                variant={randomFilter === 'word' ? 'default' : 'outline'}
                onClick={() => setRandomFilter('word')}
              >
                So'z
              </Button>
              <Button
                type="button"
                size="sm"
                variant={randomFilter === 'text' ? 'default' : 'outline'}
                onClick={() => setRandomFilter('text')}
              >
                Matn
              </Button>
            </div>
          </div>

          {materials.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Hali materiallar yo'q
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  isSelected={selectedContent === material.content}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Custom Input */}
        <TabsContent value="custom" className="space-y-3">
          <div>
            <Textarea
              placeholder="Inglizcha matn kiriting..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Xohlagan matnni kiriting va test qiling
            </p>
          </div>
          <Button
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            Tanlash
          </Button>
        </TabsContent>
      </Tabs>

      {/* Selected Content Preview */}
      {selectedContent && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Tanlangan matn:</p>
            <p className="font-medium text-sm">{selectedContent}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
