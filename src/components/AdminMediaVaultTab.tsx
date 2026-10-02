import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, 
  Image as ImageIcon, 
  FileText, 
  UploadCloud, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  X, 
  Search, 
  Filter, 
  Layers, 
  Play, 
  Pause,
  Maximize2,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  ShieldCheck,
  Video,
  Award
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  MediaAsset, 
  storeSafeMediaAssetInCloud, 
  loadMediaAssetData, 
  deleteMediaAssetFromCloud,
  sanitizeForFirestore 
} from '../utils';

interface AdminMediaVaultTabProps {
  onSelectAsset?: (url: string, asset: MediaAsset) => void;
  selectionMode?: boolean;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Vault Assets' },
  { id: 'image', label: 'Photography & Renders' },
  { id: 'video', label: 'Walkthrough Videos' },
  { id: 'blueprint', label: 'Blueprints & CAD' },
  { id: 'client', label: 'Client Uploads' },
];

export default function AdminMediaVaultTab({ onSelectAsset, selectionMode }: AdminMediaVaultTabProps) {
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Featured Creations');
  const [uploadNotice, setUploadNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & Preview
  const [activeVideoModal, setActiveVideoModal] = useState<{ asset: MediaAsset; dataUrl: string } | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<MediaAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingMediaId, setLoadingMediaId] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbAssets: MediaAsset[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as MediaAsset));

        // Merge local cache
        const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
        const combined = [...fbAssets];
        local.forEach((la: any) => {
          if (!combined.some(c => c.id === la.id)) {
            combined.unshift(la);
          }
        });

        setMediaList(combined);
        setLoading(false);
      }, (err) => {
        console.warn("Media vault snapshot error, falling back to local:", err);
        const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
        setMediaList(local);
        setLoading(false);
      });
    } catch (err) {
      console.warn("Error setting up media listener:", err);
      const local = JSON.parse(localStorage.getItem('natal_local_media') || '[]');
      setMediaList(local);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Handle File Upload to Cloud Firestore Vault
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadNotice('');

    try {
      const savedAsset = await storeSafeMediaAssetInCloud({
        file,
        name: file.name,
        category: uploadCategory,
        uploadedBy: 'Atelier Administrator'
      });

      if (savedAsset) {
        setUploadNotice(`"${file.name}" safely encrypted & stored in Cloud Database!`);
        setTimeout(() => setUploadNotice(''), 4500);
      }
    } catch (err: any) {
      alert("Error uploading media file: " + (err?.message || String(err)));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Play Video Action (loads assembled chunks if video was chunked)
  const handlePlayVideo = async (asset: MediaAsset) => {
    setLoadingMediaId(asset.id);
    try {
      const dataUrl = await loadMediaAssetData(asset);
      setActiveVideoModal({ asset, dataUrl });
    } catch (err) {
      alert("Failed to load video stream.");
    } finally {
      setLoadingMediaId(null);
    }
  };

  // Copy Data URL / Link
  const handleCopyLink = async (asset: MediaAsset) => {
    try {
      setLoadingMediaId(asset.id);
      const dataUrl = await loadMediaAssetData(asset);
      await navigator.clipboard.writeText(dataUrl);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.warn("Copy error:", e);
    } finally {
      setLoadingMediaId(null);
    }
  };

  // Download Media Asset
  const handleDownload = async (asset: MediaAsset) => {
    try {
      setLoadingMediaId(asset.id);
      const dataUrl = await loadMediaAssetData(asset);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = asset.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to download asset.");
    } finally {
      setLoadingMediaId(null);
    }
  };

  // Delete Media Asset
  const handleDelete = async (assetId: string) => {
    if (!confirm("Are you sure you want to permanently delete this media asset from Google Cloud Firestore?")) {
      return;
    }

    try {
      await deleteMediaAssetFromCloud(assetId);
      setMediaList(prev => prev.filter(m => m.id !== assetId));
      setUploadNotice("Asset permanently removed from Cloud Database.");
      setTimeout(() => setUploadNotice(''), 3000);
    } catch (err: any) {
      alert("Failed to delete asset: " + err.message);
    }
  };

  // Set any media video as the Homepage Hero Background Video across all devices
  const handleSetAsHeroVideo = async (asset: MediaAsset) => {
    try {
      setLoadingMediaId(asset.id);
      const dataUrl = await loadMediaAssetData(asset);
      const heroRef = doc(db, 'site_content', 'hero');
      await setDoc(heroRef, sanitizeForFirestore({
        backgroundVideo: dataUrl,
        mediaType: 'video',
        backgroundImage: asset.thumbnail || undefined,
        updatedAt: serverTimestamp()
      }), { merge: true });
      setUploadNotice(`"${asset.name}" is now the active Homepage Hero Video across all laptops and real phones!`);
      setTimeout(() => setUploadNotice(''), 5000);
    } catch (err: any) {
      alert("Failed to set as Hero Video: " + err.message);
    } finally {
      setLoadingMediaId(null);
    }
  };

  // Set any media photo as the Official Website Logo across all devices
  const handleSetAsWebsiteLogo = async (asset: MediaAsset) => {
    try {
      setLoadingMediaId(asset.id);
      const dataUrl = await loadMediaAssetData(asset);
      const brandingRef = doc(db, 'site_content', 'branding');
      const updated = {
        logoUrl: dataUrl,
        logoType: 'both',
        updatedAt: serverTimestamp()
      };
      await setDoc(brandingRef, sanitizeForFirestore(updated), { merge: true });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('natal_content_changed', { detail: { sectionId: 'branding', content: updated } }));
      }
      setUploadNotice(`"${asset.name}" is now set as the official Website Logo across all devices!`);
      setTimeout(() => setUploadNotice(''), 5000);
    } catch (err: any) {
      alert("Failed to set as Website Logo: " + err.message);
    } finally {
      setLoadingMediaId(null);
    }
  };

  // Filter Assets
  const filteredAssets = mediaList.filter(asset => {
    // Category match
    if (activeCategory === 'image' && asset.type !== 'image') return false;
    if (activeCategory === 'video' && asset.type !== 'video') return false;
    if (activeCategory === 'blueprint' && asset.type !== 'blueprint') return false;
    if (activeCategory === 'client' && !asset.category?.toLowerCase().includes('client')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = asset.name?.toLowerCase().includes(q);
      const matchCat = asset.category?.toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-gold/30 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              Cloud Database Vault (Google Cloud Firestore)
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <h2 className="text-2xl font-heading text-white uppercase tracking-wider font-bold mt-1">
            Media & Asset Vault
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Safely stores high-resolution photos, walkthrough videos, floor plans & architectural CAD drawings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black-pure border border-gold/40 px-3.5 py-2 font-mono text-xs text-white flex items-center gap-2 shadow-inner">
            <FolderArchive size={15} className="text-gold" />
            <span>Total Stored Assets:</span>
            <span className="text-gold font-bold text-sm">{mediaList.length}</span>
          </div>
        </div>
      </div>

      {/* Upload Notice Banner */}
      {uploadNotice && (
        <div className="bg-emerald-950/70 border border-emerald-500/70 text-emerald-200 text-xs px-4 py-3 rounded-none flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="font-mono">{uploadNotice}</span>
          </div>
          <button onClick={() => setUploadNotice('')} className="text-emerald-400 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Dropzone Container */}
      <div className="bg-black-pure border border-gold/40 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative z-10">
          <div className="flex-1">
            <h3 className="text-sm font-mono text-gold uppercase tracking-wider font-bold flex items-center gap-2">
              <UploadCloud size={17} />
              Upload New Media to Cloud Storage
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Supports <span className="text-gold">Photos (JPEG, PNG, WebP)</span>, <span className="text-gold">Videos (MP4, WebM, MOV)</span>, and <span className="text-gold">Blueprints (PDF, CAD DWG, DXF)</span>.
            </p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Engineered with automatic canvas compression for photos and chunked subcollection storage for videos to safely respect Firestore size limits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Category:</span>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="bg-transparent text-xs text-gold font-mono focus:outline-none cursor-pointer"
              >
                <option value="Featured Creations" className="bg-black-rich text-white">Featured Creations</option>
                <option value="Project Walkthroughs" className="bg-black-rich text-white">Project Walkthroughs</option>
                <option value="Blueprints & CAD" className="bg-black-rich text-white">Blueprints & CAD</option>
                <option value="Ceiling & Woodwork" className="bg-black-rich text-white">Ceiling & Woodwork</option>
                <option value="Before & After" className="bg-black-rich text-white">Before & After</option>
                <option value="Atelier Photography" className="bg-black-rich text-white">Atelier Photography</option>
              </select>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.dwg,.dxf"
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isUploading}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-5 py-2.5 bg-gold hover:bg-gold-light text-black-pure font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black-pure border-t-transparent rounded-full animate-spin"></div>
                  <span>Encrypting & Storing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Select File to Store</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-black-pure/70 border border-white/10 p-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-gold text-black-pure shadow-sm font-bold'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault assets..."
            className="w-full bg-white/5 border border-white/15 focus:border-gold px-9 py-1.5 text-xs text-white placeholder:text-gray-500 font-mono focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Media Asset Grid */}
      {loading ? (
        <div className="p-16 text-center bg-black-pure/40 border border-gold/20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-mono text-gold animate-pulse">Connecting to Firestore Media Vault...</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center bg-black-pure/40 border border-gold/20">
          <FolderArchive size={40} className="text-gold/40 mx-auto mb-3" />
          <p className="text-gray-300 text-sm font-medium">No media assets match your filter.</p>
          <p className="text-xs text-gray-500 mt-1">Upload photos, videos, or blueprints above to store them permanently in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isVideo = asset.type === 'video';
            const isBlueprint = asset.type === 'blueprint';
            const isImage = asset.type === 'image';
            const isLoadingThis = loadingMediaId === asset.id;

            return (
              <div 
                key={asset.id} 
                className="group bg-black-pure border border-gold/30 hover:border-gold transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.25)]"
              >
                {/* Visual Thumbnail / Preview Area */}
                <div className="relative aspect-video bg-black-rich overflow-hidden border-b border-white/10 flex items-center justify-center">
                  {isImage && (asset.thumbnail || asset.url) ? (
                    <img 
                      src={asset.thumbnail || asset.url} 
                      alt={asset.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      {asset.thumbnail ? (
                        <img 
                          src={asset.thumbnail} 
                          alt={asset.name} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center">
                          <Film size={36} className="text-gold/40" />
                        </div>
                      )}
                      {/* Play Button Overlay */}
                      <button
                        type="button"
                        onClick={() => handlePlayVideo(asset)}
                        disabled={isLoadingThis}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-gold/90 hover:bg-gold text-black-pure flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.6)] hover:scale-110 transition-transform cursor-pointer z-10"
                        title="Watch Video"
                      >
                        {isLoadingThis ? (
                          <div className="w-5 h-5 border-2 border-black-pure border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Play size={20} className="fill-black-pure ml-0.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Blueprint or Document Preview */
                    <div className="w-full h-full bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] bg-black-rich flex flex-col items-center justify-center p-4 text-center">
                      <FileText size={32} className="text-gold mb-2" />
                      <span className="text-[10px] font-mono text-gold/80 uppercase tracking-widest">Architectural Plan / CAD</span>
                    </div>
                  )}

                  {/* Top Type Badge */}
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                    <span className="bg-black-pure/90 border border-gold/40 text-gold text-[9px] font-mono font-bold uppercase px-2 py-0.5 tracking-wider">
                      {isVideo ? 'Video' : isBlueprint ? 'Blueprint' : 'Photo'}
                    </span>
                    {asset.isChunked && (
                      <span className="bg-blue-950/80 border border-blue-400 text-blue-200 text-[8px] font-mono px-1.5 py-0.5 tracking-widest uppercase">
                        Chunked DB
                      </span>
                    )}
                  </div>

                  {/* Top Right Quick Actions */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    {isImage && (
                      <button
                        type="button"
                        onClick={() => setActivePhotoModal(asset)}
                        className="p-1.5 bg-black-pure/80 border border-gold/40 text-gold hover:bg-gold hover:text-black-pure transition-colors cursor-pointer"
                        title="View Fullscreen"
                      >
                        <Maximize2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-gold transition-colors" title={asset.name}>
                      {asset.name}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mt-1.5">
                      <span className="text-gold/80">{asset.category || 'Atelier Media'}</span>
                      <span>{asset.sizeFormatted || 'N/A'}</span>
                    </div>

                    <div className="text-[9px] font-mono text-gray-500 mt-1 truncate">
                      By: {asset.uploadedBy || 'Admin'}
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1.5">
                    {selectionMode && onSelectAsset ? (
                      <button
                        type="button"
                        onClick={() => onSelectAsset(asset.url || '', asset)}
                        className="w-full py-1.5 bg-gold hover:bg-gold-light text-black-pure font-bold font-mono text-[10px] uppercase tracking-wider transition-all"
                      >
                        Use This Asset
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          {isVideo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePlayVideo(asset)}
                                disabled={isLoadingThis}
                                className="px-2 py-1 bg-gold/15 hover:bg-gold/30 border border-gold/40 text-gold text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Play Video"
                              >
                                <Play size={11} className="fill-gold" />
                                <span>Play</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetAsHeroVideo(asset)}
                                disabled={isLoadingThis}
                                className="px-2 py-1 bg-gradient-to-r from-gold/20 via-gold/30 to-gold/40 hover:bg-gold hover:text-black-pure border border-gold/60 text-gold text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                title="Set this video as the Homepage Hero Background Video"
                              >
                                <Film size={11} />
                                <span>Set Hero</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActivePhotoModal(asset)}
                                className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                                title="Preview"
                              >
                                <Eye size={11} />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetAsWebsiteLogo(asset)}
                                disabled={isLoadingThis}
                                className="px-2 py-1 bg-gradient-to-r from-gold/20 via-gold/30 to-gold/40 hover:bg-gold hover:text-black-pure border border-gold/60 text-gold text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                title="Set this image as the Official Website Logo across all devices"
                              >
                                <Award size={11} />
                                <span>Set Logo</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyLink(asset)}
                            disabled={isLoadingThis}
                            className="p-1 text-gray-400 hover:text-gold transition-colors cursor-pointer"
                            title="Copy File Base64 / URL"
                          >
                            {copiedId === asset.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(asset)}
                            disabled={isLoadingThis}
                            className="p-1 text-gray-400 hover:text-gold transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={13} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(asset.id)}
                          className="p-1 text-red-400/80 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete from Firestore"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-black-rich border border-gold/50 shadow-[0_0_50px_rgba(212,175,55,0.4)] max-w-4xl w-full overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold/30 bg-black-pure">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-gold" />
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate max-w-md">
                  {activeVideoModal.asset.name}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(activeVideoModal.asset)}
                  className="text-gray-300 hover:text-gold text-xs font-mono flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10"
                >
                  <Download size={12} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVideoModal(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                src={activeVideoModal.dataUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="p-3 bg-black-pure border-t border-gold/20 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Category: {activeVideoModal.asset.category}</span>
              <span>Size: {activeVideoModal.asset.sizeFormatted}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Safely Stored in Google Cloud Firestore
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-black-rich border border-gold/50 shadow-[0_0_50px_rgba(212,175,55,0.4)] max-w-5xl w-full overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold/30 bg-black-pure">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate max-w-lg">
                {activePhotoModal.name}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(activePhotoModal)}
                  className="text-gray-300 hover:text-gold text-xs font-mono flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10"
                >
                  <Download size={12} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] bg-black flex items-center justify-center p-2 overflow-auto">
              <img
                src={activePhotoModal.url || activePhotoModal.thumbnail}
                alt={activePhotoModal.name}
                className="max-h-[70vh] w-auto object-contain mx-auto border border-white/10"
              />
            </div>

            <div className="p-3 bg-black-pure border-t border-gold/20 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Category: {activePhotoModal.category}</span>
              <span>Size: {activePhotoModal.sizeFormatted}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Safely Stored in Google Cloud Firestore
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
