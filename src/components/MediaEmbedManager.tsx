import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaEmbed {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  caption?: string;
}

interface MediaEmbedProps {
  embeds: MediaEmbed[];
  onAdd: (embed: MediaEmbed) => void;
  onRemove: (id: string) => void;
}

export default function MediaEmbedManager({ embeds, onAdd, onRemove }: MediaEmbedProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'gif'>('image');

  const handleAdd = () => {
    if (!url.trim()) return;
    
    onAdd({
      id: Date.now().toString(),
      type,
      url: url.trim(),
      caption: caption.trim() || undefined,
    });
    
    setUrl('');
    setCaption('');
    setOpen(false);
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getEmbedUrl = (url: string, type: string) => {
    if (type === 'video' && isYouTubeUrl(url)) {
      // Convert YouTube URL to embed format
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    return url;
  };

  return (
    <div className="space-y-4">
      {/* Add Media Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Add Media
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Media to Note</DialogTitle>
            <DialogDescription>Embed images, videos, or GIFs into your note.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              {(['image', 'video', 'gif'] as const).map((t) => (
                <Button
                  key={t}
                  variant={type === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setType(t)}
                  className="flex-1 capitalize"
                >
                  {t === 'video' ? <Video className="h-4 w-4 mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                  {t}
                </Button>
              ))}
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {type === 'video' ? 'YouTube URL or Video URL' : `${type.charAt(0).toUpperCase() + type.slice(1)} URL`}
              </label>
              <Input
                placeholder={
                  type === 'video'
                    ? 'https://youtube.com/watch?v=... or direct video URL'
                    : 'https://example.com/image.jpg'
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {/* Caption Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Caption (optional)</label>
              <Input
                placeholder="Add a description..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Preview */}
            {url && (
              <div className="border border-border rounded-lg p-3 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                {type === 'image' || type === 'gif' ? (
                  <img src={url} alt="Preview" className="max-w-full max-h-48 rounded" onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                  }} />
                ) : (
                  <iframe
                    width="100%"
                    height="200"
                    src={getEmbedUrl(url, type)}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded"
                  />
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Media</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Gallery */}
      {embeds.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Media in this note ({embeds.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {embeds.map((embed) => (
              <div key={embed.id} className="border border-border rounded-lg overflow-hidden bg-muted/30">
                {embed.type === 'image' || embed.type === 'gif' ? (
                  <div className="relative group">
                    <img src={embed.url} alt={embed.caption} className="w-full h-32 object-cover" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemove(embed.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative group bg-black/10 aspect-video flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemove(embed.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {embed.caption && (
                  <p className="text-xs text-muted-foreground p-2 border-t border-border">{embed.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
