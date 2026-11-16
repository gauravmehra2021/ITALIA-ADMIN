import { useState, useRef, type ChangeEvent } from 'react';
import { s3UploadApi } from '../services/platformApi';

interface S3UploaderProps {
  courseId: string;
  category: 'videos' | 'documents' | 'audios' | 'covers' | 'thumbnails';
  acceptedTypes?: string; // e.g. "video/mp4,video/webm" or ".pdf"
  maxSizeMb?: number;
  label?: string;
  currentUrl?: string | null;
  currentObjectKey?: string | null;
  onUploadSuccess: (res: { accessUrl: string; objectKey: string; fileName: string; fileSize: number }) => void;
  onRemove?: () => void;
}

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{label}</label>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
            border: isDragOver ? '2px dashed #0284c7' : '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '1.5rem',
            textAlign: 'center',
            background: isDragOver ? '#f0f9ff' : '#f8fafc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>
            {category === 'videos' ? '🎬' : category === 'documents' ? '📄' : category === 'audios' ? '🎧' : '🖼️'}
          </div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
            Drag and drop your {category.slice(0, -1)} file here, or <span style={{ color: '#0284c7', textDecoration: 'underline' }}>browse</span>
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
            Supported formats: {acceptedTypes || 'All approved media types'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Selected File Card (Pending Confirmation) */}
      {selectedFile && !uploading && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for S3
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleStartUpload}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              ☁️ Start S3 Upload
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Uploading Progress Bar */}
      {uploading && (
        <div
          style={{
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '14px 16px',
            background: '#f0f9ff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
              Uploading directly to AWS S3: {progress}%
            </span>
            <button
              type="button"
              onClick={handleCancelUpload}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel Upload
            </button>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#e0f2fe', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Uploaded File Preview & Replace Card */}
      {previewUrl && !selectedFile && (
        <div
          style={{
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 16px',
            background: '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '6px', fontSize: '0.72rem' }}>
                ✓ AWS S3 Stored
              </span>
              {currentObjectKey && (
                <div style={{ fontSize: '0.75rem', color: '#166534', fontFamily: 'monospace' }}>
                  Key: {currentObjectKey}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                🔄 Replace
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626' }}
              >
                🗑 Remove
              </button>
            </div>
          </div>

          {/* Media Player / Viewer Preview */}
          <div style={{ marginTop: '8px' }}>
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
                style={{ maxHeight: '140px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }}
              />
            ) : (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}
              >
                📄 Open & Preview Document
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
        <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
    </div>
  );
};
export default S3Uploader;
