import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { convertDriveUrlToDirect } from '../utils';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Plus, 
  Trash2, 
  Eye, 
  Camera, 
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Cat,
  FolderOpen
} from 'lucide-react';

interface Slide {
  id: string;
  url: string;
  title: string;
  caption: string;
  category: string; // e.g. "Serenity", "Legacy", "Strategic"
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 's1',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
    title: 'Our Orange Companion 🐱🧡',
    caption: 'Tiggs auditing our private ledger balances. Truly the chief financial officer of our hearts.',
    category: 'Family'
  },
  {
    id: 's2',
    url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
    title: 'Cozy Cabin Reflections 🌲',
    caption: 'Fireside discussions of life, love, and our secure path as a family of four.',
    category: 'Vision'
  },
  {
    id: 's3',
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
    title: 'Lifelong Sanctuary Union',
    caption: 'Hand in hand, building a pristine, private sanctuary of tranquility and prosperity.',
    category: 'Union'
  }
];

export default function IntimateSlideshow() {
  const [slides, setSlides] = useState<Slide[]>(() => {
    const saved = localStorage.getItem('wealth_app_slideshow');
    return saved ? JSON.parse(saved) : DEFAULT_SLIDES;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  const savedUser = localStorage.getItem('wealth_app_currentUser');
  const isRachel = savedUser === 'Rachel' || savedUser === 'Big Mami';

  // Form states for adding custom slides
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newCategory, setNewCategory] = useState('Serenity');

  // Bulk sync states
  const [driveFolderUrl, setDriveFolderUrl] = useState(() => {
    return localStorage.getItem('wealth_app_drive_folder') || '';
  });
  const [isSyncingFolder, setIsSyncingFolder] = useState(false);
  const [folderSyncError, setFolderSyncError] = useState<string | null>(null);
  const [folderSyncSuccess, setFolderSyncSuccess] = useState<string | null>(null);

  // Persist folder URL
  useEffect(() => {
    localStorage.setItem('wealth_app_drive_folder', driveFolderUrl);
  }, [driveFolderUrl]);

  // Background polling for Google Drive Folder
  useEffect(() => {
    if (!driveFolderUrl) return;

    const runFolderSync = async () => {
      try {
        let folderId = driveFolderUrl.trim();
        const folderMatches = folderId.match(/\/folders\/([a-zA-Z0-9-_]{25,55})/);
        if (folderMatches) {
          folderId = folderMatches[1];
        }

        const res = await fetch(`/api/proxy-drive-folder?folderId=${encodeURIComponent(folderId)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.slides && data.slides.length > 0) {
          setSlides(prev => {
            const manualSlides = prev.filter(s => !s.id.startsWith('drive-scraped-'));
            const updated = [...manualSlides, ...data.slides];
            localStorage.setItem('wealth_app_slideshow', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn('Background drive sync error:', err);
      }
    };

    // Run initially and then every 30 seconds
    runFolderSync();
    const intervalId = setInterval(runFolderSync, 30000);
    return () => clearInterval(intervalId);
  }, [driveFolderUrl]);

  // Autoplay handler
  useEffect(() => {
    if (!isPlaying || slides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  const handleNext = () => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleSyncFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveFolderUrl) return;
    setIsSyncingFolder(true);
    setFolderSyncError(null);
    setFolderSyncSuccess(null);

    try {
      // Find custom extracted ID from standard Google Drive URL
      let folderId = driveFolderUrl.trim();
      const folderMatches = folderId.match(/\/folders\/([a-zA-Z0-9-_]{25,55})/);
      if (folderMatches) {
        folderId = folderMatches[1];
      }

      const res = await fetch(`/api/proxy-drive-folder?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP Status ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.slides && data.slides.length > 0) {
        const manualSlides = slides.filter(s => !s.id.startsWith('drive-scraped-'));
        const updated = [...manualSlides, ...data.slides];
        setSlides(updated);
        localStorage.setItem('wealth_app_slideshow', JSON.stringify(updated));
        setFolderSyncSuccess(`Secure Dynamic Sync complete! Automatically imported ${data.slides.length} photos.`);
        setCurrentIndex(updated.length - data.slides.length); // focus on first imported image
      } else {
        throw new Error("No readable files detected in the Google Drive folder. Verify it contains valid photos (JPEG, PNG).");
      }
    } catch (err: any) {
      console.error(err);
      setFolderSyncError(err.message || "Failed to scan Google Drive folder settings.");
    } finally {
      setIsSyncingFolder(false);
    }
  };

  const handleAddSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newTitle) return;

    // Detect if they pasted multiple URLs separated by commas, semi-colons, or newlines
    let urls: string[] = [];
    if (newUrl.includes(',') || newUrl.includes('\n') || newUrl.includes(';')) {
      urls = newUrl
        .split(/[\n,;]+/)
        .map(u => u.trim())
        .filter(u => u.length > 5); // Simple loose validation for URLs or Drive elements
    } else {
      urls = [newUrl.trim()];
    }

    if (urls.length === 0) return;

    const newSlides: Slide[] = urls.map((url, idx) => ({
      id: `slide-${Date.now()}-${idx}`,
      url: convertDriveUrlToDirect(url),
      title: urls.length > 1 ? `${newTitle} (${idx + 1})` : newTitle,
      caption: newCaption || 'Unforgettable visionary moment.',
      category: newCategory
    }));

    const updated = [...slides, ...newSlides];
    setSlides(updated);
    localStorage.setItem('wealth_app_slideshow', JSON.stringify(updated));
    setCurrentIndex(updated.length - 1); // switch to the newly created slide
    
    // reset form
    setNewUrl('');
    setNewTitle('');
    setNewCaption('');
    setNewCategory('Serenity');
  };

  const handleDeleteSlide = (id: string, indexToDelete: number) => {
    const updated = slides.filter((s) => s.id !== id);
    setSlides(updated);
    localStorage.setItem('wealth_app_slideshow', JSON.stringify(updated));
    
    // adjust index
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <div className="border border-zinc-900 bg-zinc-950 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
      {/* Background ambient neon glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e1ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-[#ff0099] animate-pulse" />
          <Cat className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-white text-sm font-display tracking-tight">Our Little Family of Four</h3>
        </div>
        {!isRachel && (
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-mono px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Camera className="w-3 h-3 text-[#00e1ff]" />
            <span>{showEditor ? 'View vision' : 'Modify slides'}</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!showEditor ? (
          // BEAUTIFUL ACTIVE SLIDE PREVIEW
          <motion.div
            key="slideshow-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {slides.length === 0 ? (
              <div className="h-48 border border-dashed border-zinc-900 rounded-xl flex flex-col items-center justify-center text-center text-zinc-600 text-xs">
                <ImageIcon className="w-8 h-8 mb-2" />
                <span>No vision slides found. Add your first memory!</span>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden group aspect-[16/10] border border-zinc-900 bg-zinc-900">
                {/* Active image with zoom animation effect */}
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={currentSlide.id}
                    src={convertDriveUrlToDirect(currentSlide.url)}
                    alt={currentSlide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6 }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      // Stage 1 Fallback: If direct CDN link fails, try our local server-side proxy
                      if (!target.src.includes('/api/proxy-drive-file') && currentSlide.url.includes('google.com')) {
                        const dMatch = currentSlide.url.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{19,80})/);
                        const idMatch = currentSlide.url.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
                        const fileId = (dMatch && dMatch[1]) || (idMatch && idMatch[1]);
                        if (fileId) {
                          target.src = `/api/proxy-drive-file?id=${fileId}`;
                          return;
                        }
                      }
                      // Stage 2 Fallback: Elegant family placeholder photo (Tiggs orange feline companion)
                      target.src = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                </AnimatePresence>

                {/* Removed text & overlay per user request */}
              </div>
            )}

            {/* Micro Controls row */}
            {slides.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                {/* Play/Pause state */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#00e1ff]" /> : <Play className="w-3.5 h-3.5 text-[#adff00]" />}
                  <span>{isPlaying ? 'AUTOPLAY' : 'PAUSED'}</span>
                </button>

                {/* Slices index tracker dot row */}
                <div className="flex items-center gap-1.5">
                  {slides.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPlaying(false); // pause play when changing manually
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentIndex === idx ? 'w-4.5 bg-[#00e1ff]' : 'w-1.5 bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { handlePrev(); setIsPlaying(false); }}
                    className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { handleNext(); setIsPlaying(false); }}
                    className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          // VISUAL EDIT / ADD CONTAINER
          <motion.div
            key="slideshow-edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Array of active slides with remove option */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-300">Active Slides ({slides.length})</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Restore default companion photos? This will restore our Tiggs and cozy cabin photos.")) {
                    setSlides(DEFAULT_SLIDES);
                    localStorage.setItem('wealth_app_slideshow', JSON.stringify(DEFAULT_SLIDES));
                    setCurrentIndex(0);
                    setFolderSyncSuccess("Slides reset to default companion photos successfully.");
                    setFolderSyncError(null);
                  }
                }}
                className="text-[9px] text-red-400 hover:text-white border border-red-500/20 hover:bg-red-500/10 px-1.5 py-0.5 rounded font-mono transition-all cursor-pointer"
              >
                Reset to default photos
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-zinc-900 scrollbar-none pr-1">
              {slides.map((slide, idx) => (
                <div key={slide.id} className="flex items-center gap-3 py-2 text-xs">
                  <img
                    src={convertDriveUrlToDirect(slide.url)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-10 h-8 rounded object-cover shrink-0 border border-zinc-900"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('/api/proxy-drive-file') && slide.url.includes('google.com')) {
                        const dMatch = slide.url.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{19,80})/);
                        const idMatch = slide.url.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
                        const fileId = (dMatch && dMatch[1]) || (idMatch && idMatch[1]);
                        if (fileId) {
                          target.src = `/api/proxy-drive-file?id=${fileId}`;
                          return;
                        }
                      }
                      target.src = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-zinc-200 block truncate">{slide.title}</span>
                    <span className="text-[9px] text-zinc-500 font-mono block truncate">{slide.category} • {slide.url.slice(0, 30)}...</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSlide(slide.id, idx)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Remove Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Direct Google Drive Folder bulk importer */}
            <div className="border border-zinc-900 bg-zinc-950 p-3 rounded-xl space-y-2.5">
              <div className="flex items-center gap-1.5 label text-xs font-semibold text-[#00e1ff]">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Bulk Sync Google Drive Folder</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Insert a public Google Drive folder URL to quickly import all of its photos into the slideshow.
              </p>
              
              <form onSubmit={handleSyncFolder} className="flex gap-2">
                <input
                  type="text"
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="Paste Google Drive folder URL or ID..."
                  className="flex-1 text-xs py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-750 focus:outline-none focus:border-[#00e1ff]"
                />
                <button
                  type="submit"
                  disabled={isSyncingFolder || !driveFolderUrl}
                  className="px-3 bg-[#adff00] hover:bg-[#adff00]/80 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-semibold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95"
                >
                  {isSyncingFolder ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-black" />
                  )}
                  <span>Sync</span>
                </button>
              </form>

              {folderSyncError && (
                <div className="text-[10px] text-red-400 bg-red-400/5 border border-red-500/10 p-2 rounded-lg leading-snug">
                  ⚠️ {folderSyncError}
                </div>
              )}

              {folderSyncSuccess && (
                <div className="text-[10px] text-[#adff00] bg-[#adff00]/5 border border-[#adff00]/10 p-2 rounded-lg leading-snug">
                  ✨ {folderSyncSuccess}
                </div>
              )}
            </div>

            {/* Quick form additions */}
            <form onSubmit={handleAddSlide} className="space-y-3.5 border-t border-zinc-900 pt-3.5">
              <span className="block text-xs font-semibold text-zinc-300">Add Premium Memory Slide</span>
              
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Image URL or Drive Link</label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or any image link"
                    className="w-full text-xs py-1.5 px-2.5 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#00e1ff]"
                  />
                  <p className="text-[9px] text-[#00e1ff]/80 mt-1 font-mono leading-tight">
                    💡 <strong>Drive photos:</strong> Set share setting to <em>'Anyone with the link can view'</em> in Google Drive, then paste the link! We auto-embed it perfectly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Dream Retreat"
                      className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#00e1ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Theme Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 focus:outline-none focus:border-[#00e1ff]"
                    >
                      <option value="Serenity">Serenity</option>
                      <option value="Legacy">Legacy</option>
                      <option value="Strategic">Strategic</option>
                      <option value="Aspirator">Aspirator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Caption Details</label>
                  <textarea
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Describe this intimate visual aspiration..."
                    rows={2}
                    className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#00e1ff] resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 text-xs bg-[#00e1ff] hover:bg-[#00e1ff]/80 text-black font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-[#00e1ff]/5 hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Append Vision Slide</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
