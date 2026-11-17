import { useState, useRef, type ChangeEvent } from 'react';
import { s3UploadApi } from '../services/platformApi';

interface S3UploaderProps {
  courseId: string;
  category: 'videos' | 'documents' | 'audios' | 'covers' | 'thumbnails';
  acceptedTypes?: string;
  maxSizeMb?: number;
  label?: string;
  currentUrl?: string | null;
  currentObjectKey?: string | null;
  onUploadSuccess: (res: { accessUrl: string; objectKey: string; fileName: string; fileSize: number }) => void;
  onRemove?: () => void;
}

// Professional SVG Icons (No generic emojis)
const UploaderIcons = {
  CloudUpload: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 16 4-4 4 4" />
    </svg>
  ),
  Video: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  PDF: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Audio: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Image: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

export const S3Uploader: React.FC<S3UploaderProps> = ({
  courseId,
  category,
  acceptedTypes,
  maxSizeMb = category === 'videos' ? 500 : 50,
  label = 'Upload Asset to AWS S3',
  currentUrl,
  currentObjectKey,
  onUploadSuccess,
  onRemove,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    // Size validation
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed is ${maxSizeMb} MB.`);
      return;
    }

    setSelectedFile(file);

    // Create local preview if image or video
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccessMsg(null);

    try {
      // Step 1: Request S3 pre-signed upload URL from backend
      const presigned = await s3UploadApi.getPresignedUrl({
        courseId,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileSize: selectedFile.size,
        category,
      });

      // Step 2: Direct PUT upload to S3 using XMLHttpRequest for progress & cancelability
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during S3 upload. Check your connection.'));
        xhr.onabort = () => reject(new Error('Upload canceled by user.'));

        xhr.open('PUT', presigned.uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
        xhr.send(selectedFile);
      });

      // Step 3: Confirm with backend to verify object and persist metadata
      const confirmRes = await s3UploadApi.confirmUpload({
        courseId,
        fileName: selectedFile.name,
        originalFileName: selectedFile.name,
        objectKey: presigned.objectKey,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileSize: selectedFile.size,
        fileType: category === 'videos' ? 'video' : category === 'documents' ? 'pdf' : category === 'audios' ? 'audio' : 'image',
      });

      setSuccessMsg(`✓ Upload complete! Securely stored on AWS S3.`);
      setSelectedFile(null);
      setPreviewUrl(confirmRes.accessUrl);

      onUploadSuccess({
        accessUrl: confirmRes.accessUrl,
        objectKey: presigned.objectKey,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });
    } catch (err: any) {
      if (err.message !== 'Upload canceled by user.') {
        setError(err.message || 'AWS S3 upload failed.');
      }
    } finally {
      setUploading(false);
      xhrRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setProgress(0);
    setError('Upload was canceled.');
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccessMsg(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemove) onRemove();
  };

  const renderCategoryIcon = () => {
    if (category === 'videos') return <UploaderIcons.Video />;
    if (category === 'documents') return <UploaderIcons.PDF />;
    if (category === 'audios') return <UploaderIcons.Audio />;
    return <UploaderIcons.Image />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>{label}</label>
        <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600 }}>
          AWS S3 Direct • Max {maxSizeMb} MB
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      {!selectedFile && !previewUrl && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--line)',
            borderRadius: '12px',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            background: isDragOver ? 'rgba(30, 136, 229, 0.08)' : 'var(--card-bg)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UploaderIcons.CloudUpload />
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>
              Drag & drop your {category.slice(0, -1)} file here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
              Supported: {acceptedTypes || 'All approved media types'} • Uploaded directly to private S3 bucket
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Selected File Card (Pending Upload Confirmation) */}
      {selectedFile && !uploading && (
        <div
          style={{
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            background: 'var(--card-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {renderCategoryIcon()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for S3 upload
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleStartUpload}
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'var(--primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(30, 136, 229, 0.3)',
              }}
            >
              Upload to AWS S3
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 12px',
                fontSize: '0.84rem',
                fontWeight: 600,
                background: 'var(--sand)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Uploading Progress Bar */}
      {uploading && (
        <div
          style={{
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
            background: 'rgba(56, 189, 248, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--azure)' }}>
              Uploading directly to AWS S3: {progress}%
            </span>
            <button
              type="button"
              onClick={handleCancelUpload}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #1E88E5 0%, #38BDF8 100%)',
                transition: 'width 0.2s ease',
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>
      )}

      {/* Uploaded File Preview & Replace Card */}
      {previewUrl && !selectedFile && (
        <div
          style={{
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
            background: 'rgba(34, 197, 94, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <UploaderIcons.CheckCircle />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink)' }}>
                  Securely Stored on AWS S3
                </span>
              </div>
              {currentObjectKey && (
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                  Key: {currentObjectKey}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: 'var(--sand)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#DC2626',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Media Player / Viewer Preview */}
          <div style={{ marginTop: '10px' }}>
            {category === 'videos' ? (
              <video
                controls
                src={previewUrl}
                style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', background: '#000' }}
              />
            ) : category === 'covers' || category === 'thumbnails' ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxHeight: '150px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }}
              />
            ) : category === 'audios' ? (
              <audio controls src={previewUrl} style={{ width: '100%', marginTop: '6px' }} />
            ) : (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.86rem', color: '#1E88E5', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>📄</span>
                <span>Open & Verify Document</span>
              </a>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Messages */}
      {error && (
        <div style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
    </div>
  );
};

export default S3Uploader;
